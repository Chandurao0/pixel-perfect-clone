import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("sessionId is required");

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase
      .from("design_sessions")
      .update({ status: "analyzing" })
      .eq("id", sessionId);

    const { data: sessionImages } = await supabase
      .from("session_images")
      .select("storage_path, angle_label")
      .eq("session_id", sessionId);

    if (!sessionImages || sessionImages.length === 0) {
      throw new Error("No images found for this session");
    }

    // Download images and convert to base64 for Gemini
    const imageParts = [];
    for (const img of sessionImages) {
      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(img.storage_path);
      
      const imgResponse = await fetch(data.publicUrl);
      const imgBuffer = await imgResponse.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
      const mimeType = img.storage_path.endsWith(".png") ? "image/png" : "image/jpeg";
      
      imageParts.push({
        inline_data: { mime_type: mimeType, data: base64 },
      });
    }

    const analysisPrompt = `You are a product design analyst for artisan crafts. Analyse these artisan product images and return ONLY a valid JSON object (no markdown, no code fences) with these fields:
- product_type (string)
- primary_material (string)
- dominant_colors (array of strings)
- surface_patterns (array of strings)
- shape_description (string)
- texture (string)
- finish (string)
- suggested_category (one of: Pottery, Jewelry, Weaving, Woodwork, Other)`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: analysisPrompt },
                ...imageParts,
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      if (response.status === 429) {
        await supabase
          .from("design_sessions")
          .update({ status: "error", error_message: "Rate limit exceeded. Please try again later." })
          .eq("id", sessionId);
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;
    let analysis = {};

    if (textContent) {
      try {
        analysis = JSON.parse(textContent);
      } catch {
        console.error("Failed to parse analysis JSON:", textContent);
        throw new Error("Failed to parse AI analysis response");
      }
    }

    await supabase
      .from("design_sessions")
      .update({
        analysis,
        category: (analysis as any).suggested_category || "Other",
        status: "generating",
      })
      .eq("id", sessionId);

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("analyze-product error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
