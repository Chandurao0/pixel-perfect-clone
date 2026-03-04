import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IMAGE_MODELS = ["gemini-2.5-flash-image-preview", "gemini-2.0-flash-exp"];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const extractInlineImage = (parts: any[]) => {
  const imagePart = parts.find((part: any) => part?.inlineData?.data || part?.inline_data?.data);
  if (!imagePart) return null;
  return imagePart.inlineData || imagePart.inline_data || null;
};

const extractGatewayImageDataUri = (result: any) =>
  result?.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
  result?.choices?.[0]?.message?.content?.find?.((p: any) => p?.type === "image_url")?.image_url?.url ||
  "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("sessionId is required");

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: session } = await supabase
      .from("design_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (!session) throw new Error("Session not found");

    const analysis = session.analysis as Record<string, any>;
    if (!analysis) throw new Error("No analysis found — run analyze-product first");

    const productType = analysis.product_type || "artisan product";
    const primaryMaterial = analysis.primary_material || "natural material";
    const shapeDescription = analysis.shape_description || "balanced handcrafted form";
    const texture = analysis.texture || "subtle artisan texture";

    const variationSpecs = [
      {
        label: `${productType} with Geometric Patterns`,
        prompt: `Generate a photorealistic ${productType} made of ${primaryMaterial} with bold geometric patterns in blue and turquoise. ${shapeDescription}. ${texture}. Artisan handcrafted quality. White studio background.`,
        tags: ["Pattern", "Color"],
      },
      {
        label: `Modern ${productType} in Matte Black`,
        prompt: `Generate a photorealistic modern ${productType} with elongated form, matte black finish, and subtle gold accents. Material: ${primaryMaterial}. Minimalist aesthetic. White studio background.`,
        tags: ["Shape", "Finish"],
      },
      {
        label: `${productType} with Natural Motifs`,
        prompt: `Generate a photorealistic ${productType} with carved leaf and vine motifs, sage green glaze, and earth accents. Material: ${primaryMaterial}. ${shapeDescription}. White studio background.`,
        tags: ["Color", "Pattern"],
      },
      {
        label: `Warm Floral ${productType}`,
        prompt: `Generate a photorealistic ${productType} hand-painted with warm floral motifs in orange and cream, glossy glaze, and artisan texture. White studio background.`,
        tags: ["Shape", "Color"],
      },
    ];

    const variationResults = [];
    let allFailedWith429 = true;
    let allFailedWith402 = true;
    let allFailedWith404 = true;

    for (const spec of variationSpecs) {
      let imageUrl = "";

      // Primary path: personal Gemini key
      for (const model of IMAGE_MODELS) {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-goog-api-key": GEMINI_API_KEY,
                },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: spec.prompt }] }],
                  generationConfig: {
                    responseModalities: ["IMAGE", "TEXT"],
                  },
                }),
              },
            );

            if (!response.ok) {
              const errText = await response.text();
              console.error(`Gemini image error (${spec.label}, ${model})`, response.status, errText);

              if (response.status !== 429) allFailedWith429 = false;
              if (response.status !== 402) allFailedWith402 = false;
              if (response.status !== 404) allFailedWith404 = false;

              if (response.status === 404) break; // next model
              if (response.status === 429 && attempt < 3) {
                await sleep(2500 * attempt);
                continue;
              }
              break;
            }

            allFailedWith429 = false;
            allFailedWith402 = false;
            allFailedWith404 = false;

            const result = await response.json();
            const parts = result?.candidates?.[0]?.content?.parts ?? [];
            const inlineData = extractInlineImage(parts);

            if (!inlineData?.data) {
              console.log("No image in Gemini response for:", spec.label, "model:", model);
              break;
            }

            const mimeType = inlineData.mimeType || inlineData.mime_type || "image/png";
            const base64Data = inlineData.data as string;
            const ext = mimeType.includes("jpeg") ? "jpg" : "png";
            const fileName = `variations/${sessionId}/${crypto.randomUUID()}.${ext}`;

            const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
            const { error: uploadError } = await supabase.storage
              .from("product-images")
              .upload(fileName, binaryData, { contentType: mimeType });

            if (uploadError) {
              console.error("Upload error:", uploadError);
              break;
            }

            const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
            break;
          } catch (err) {
            console.error(`Variation attempt failed (${spec.label}, ${model}, attempt ${attempt}):`, err);
            if (attempt < 3) await sleep(1500 * attempt);
          }
        }

        if (imageUrl) break;
      }

      // Fallback path: Lovable AI gateway if personal key has no image models
      if (!imageUrl && allFailedWith404 && LOVABLE_API_KEY) {
        try {
          const fallbackResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image",
              modalities: ["image", "text"],
              messages: [{ role: "user", content: spec.prompt }],
            }),
          });

          if (fallbackResponse.ok) {
            const fallbackResult = await fallbackResponse.json();
            const dataUri = extractGatewayImageDataUri(fallbackResult);

            if (dataUri.startsWith("data:image/")) {
              const match = dataUri.match(/^data:(image\/\w+);base64,(.+)$/);
              if (match) {
                const mimeType = match[1];
                const base64Data = match[2];
                const ext = mimeType.includes("jpeg") ? "jpg" : "png";
                const fileName = `variations/${sessionId}/${crypto.randomUUID()}.${ext}`;
                const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

                const { error: uploadError } = await supabase.storage
                  .from("product-images")
                  .upload(fileName, binaryData, { contentType: mimeType });

                if (!uploadError) {
                  const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
                  imageUrl = urlData.publicUrl;
                  allFailedWith404 = false;
                }
              }
            }
          } else {
            const fallbackErr = await fallbackResponse.text();
            console.error("Fallback gateway error:", fallbackResponse.status, fallbackErr);
          }
        } catch (fallbackError) {
          console.error("Fallback gateway exception:", fallbackError);
        }
      }

      if (imageUrl) {
        variationResults.push({
          session_id: sessionId,
          image_url: imageUrl,
          label: spec.label,
          tags: spec.tags,
        });
      }

      await sleep(300);
    }

    if (variationResults.length > 0) {
      await supabase.from("design_variations").insert(variationResults);
    }

    if (variationResults.length === 0 && allFailedWith429) {
      const msg = "Gemini rate limit reached on your API key. Please retry in a minute.";
      await supabase.from("design_sessions").update({ status: "error", error_message: msg }).eq("id", sessionId);
      return new Response(JSON.stringify({ error: msg }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (variationResults.length === 0 && allFailedWith402) {
      const msg = "Gemini billing/quota issue on your API key.";
      await supabase.from("design_sessions").update({ status: "error", error_message: msg }).eq("id", sessionId);
      return new Response(JSON.stringify({ error: msg }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (variationResults.length === 0 && allFailedWith404) {
      const msg = `No image-capable models are enabled on your personal Gemini key (${IMAGE_MODELS.join(", ")}).`;
      await supabase.from("design_sessions").update({ status: "error", error_message: msg }).eq("id", sessionId);
      return new Response(JSON.stringify({ error: msg }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("design_sessions")
      .update({
        status: variationResults.length > 0 ? "complete" : "error",
        error_message:
          variationResults.length === 0
            ? "Could not generate any variations. Please try different images or retry."
            : null,
      })
      .eq("id", sessionId);

    return new Response(
      JSON.stringify({ success: true, variationCount: variationResults.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("generate-variations error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
