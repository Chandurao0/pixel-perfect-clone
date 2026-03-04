import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANALYSIS_MODEL = "gemini-2.5-flash";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const inferMimeType = (path: string) => {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let sessionId = "";

  try {
    const body = await req.json();
    sessionId = body?.sessionId;
    if (!sessionId) throw new Error("sessionId is required");

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase
      .from("design_sessions")
      .update({ status: "analyzing", error_message: null })
      .eq("id", sessionId);

    const { data: sessionImages, error: imageQueryError } = await supabase
      .from("session_images")
      .select("storage_path")
      .eq("session_id", sessionId);

    if (imageQueryError) throw new Error(imageQueryError.message);
    if (!sessionImages || sessionImages.length === 0) {
      throw new Error("No images found for this session");
    }

    const imageParts: Array<{ inline_data: { mime_type: string; data: string } }> = [];

    for (const img of sessionImages) {
      const { data: publicData } = supabase.storage
        .from("product-images")
        .getPublicUrl(img.storage_path);

      const imgResponse = await fetch(publicData.publicUrl);
      if (!imgResponse.ok) {
        throw new Error(`Failed to read uploaded image: ${img.storage_path}`);
      }

      const bytes = new Uint8Array(await imgResponse.arrayBuffer());
      imageParts.push({
        inline_data: {
          mime_type: inferMimeType(img.storage_path),
          data: toBase64(bytes),
        },
      });

      await sleep(80);
    }

    const analysisPrompt =
      "Analyze these artisan product images and return ONLY valid JSON with fields: product_type (string), primary_material (string), dominant_colors (string[]), surface_patterns (string[]), shape_description (string), texture (string), finish (string), suggested_category (Pottery|Jewelry|Weaving|Woodwork|Other).";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${ANALYSIS_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: analysisPrompt }, ...imageParts],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini analyze error:", response.status, errText);

      const mappedMessage =
        response.status === 429
          ? "Rate limit exceeded on your Gemini key. Please retry in a minute."
          : response.status === 402
            ? "Gemini billing/quota issue on your API key."
            : response.status === 404
              ? `Configured Gemini analysis model not found (${ANALYSIS_MODEL}).`
              : `Gemini API error: ${response.status}`;

      await supabase
        .from("design_sessions")
        .update({ status: "error", error_message: mappedMessage })
        .eq("id", sessionId);

      return new Response(JSON.stringify({ error: mappedMessage }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const textContent = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      throw new Error("Gemini returned empty analysis response");
    }

    let analysisParsed: unknown;
    try {
      analysisParsed = JSON.parse(textContent);
    } catch (parseError) {
      console.error("Failed to parse analysis JSON:", textContent, parseError);
      throw new Error("Failed to parse AI analysis response");
    }

    const normalized = Array.isArray(analysisParsed)
      ? (analysisParsed.find((item) => item && typeof item === "object") as Record<string, unknown> | undefined)
      : (analysisParsed as Record<string, unknown>);

    if (!normalized || typeof normalized !== "object") {
      throw new Error("AI analysis did not return a valid object");
    }

    await supabase
      .from("design_sessions")
      .update({
        analysis: normalized,
        category: (normalized.suggested_category as string) || "Other",
        status: "generating",
        error_message: null,
      })
      .eq("id", sessionId);

    return new Response(JSON.stringify({ success: true, analysis: normalized }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-product error:", error);

    if (sessionId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase
          .from("design_sessions")
          .update({
            status: "error",
            error_message: error instanceof Error ? error.message : "Unknown error",
          })
          .eq("id", sessionId);
      }
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
