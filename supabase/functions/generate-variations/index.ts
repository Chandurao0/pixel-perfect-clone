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

    const { data: session } = await supabase
      .from("design_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (!session) throw new Error("Session not found");

    const analysis = session.analysis as Record<string, any>;
    if (!analysis) throw new Error("No analysis found — run analyze-product first");

    const variationSpecs = [
      {
        label: `${analysis.product_type} with Geometric Patterns`,
        prompt: `Generate an image of a photorealistic ${analysis.product_type} made of ${analysis.primary_material}. Modified with bold geometric patterns in blue and turquoise colors. ${analysis.shape_description}. ${analysis.texture} texture with a glazed finish. Artisan handcrafted quality. Product photography on a clean white background. Ultra high resolution.`,
        tags: ["Pattern", "Color"],
      },
      {
        label: `Modern ${analysis.product_type} in Matte Black`,
        prompt: `Generate an image of a photorealistic ${analysis.product_type} with an elongated modern form. Matte black finish with gold leaf accents. Made of ${analysis.primary_material}. Minimalist and contemporary design. Artisan handcrafted quality. Product photography on a clean white background. Ultra high resolution.`,
        tags: ["Shape", "Finish"],
      },
      {
        label: `${analysis.product_type} with Natural Motifs`,
        prompt: `Generate an image of a photorealistic ${analysis.product_type} made of ${analysis.primary_material}. Decorated with carved leaf and vine motifs. Sage green glaze with earth tone accents. ${analysis.shape_description}. Artisan handcrafted quality. Product photography on a clean white background. Ultra high resolution.`,
        tags: ["Color", "Pattern"],
      },
      {
        label: `Warm Floral ${analysis.product_type}`,
        prompt: `Generate an image of a photorealistic ${analysis.product_type} made of ${analysis.primary_material}. Hand-painted with warm floral motifs in sunset orange and cream. Rounded bowl shape. Glossy glaze finish. Artisan handcrafted quality. Product photography on a clean white background. Ultra high resolution.`,
        tags: ["Shape", "Color"],
      },
    ];

    const variationResults = [];

    for (const spec of variationSpecs) {
      try {
        console.log("Generating variation:", spec.label);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: spec.prompt }],
                },
              ],
              generationConfig: {
                responseModalities: ["IMAGE", "TEXT"],
              },
            }),
          }
        );

        if (!response.ok) {
          if (response.status === 429) {
            console.error("Rate limited during image generation");
            await new Promise((r) => setTimeout(r, 5000));
            continue;
          }
          const errText = await response.text();
          console.error(`Gemini image error: ${response.status}`, errText);
          continue;
        }

        const result = await response.json();
        const parts = result.candidates?.[0]?.content?.parts;

        if (!parts) {
          console.log("No parts in response for:", spec.label);
          continue;
        }

        let imageUrl = "";

        for (const part of parts) {
          if (part.inlineData) {
            const { mimeType, data: base64Data } = part.inlineData;
            const ext = mimeType?.includes("jpeg") ? "jpg" : "png";
            const fileName = `variations/${sessionId}/${crypto.randomUUID()}.${ext}`;

            const binaryData = Uint8Array.from(atob(base64Data), (c) =>
              c.charCodeAt(0)
            );

            const { error: uploadError } = await supabase.storage
              .from("product-images")
              .upload(fileName, binaryData, { contentType: mimeType || "image/png" });

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from("product-images")
                .getPublicUrl(fileName);
              imageUrl = urlData.publicUrl;
              console.log("Uploaded variation image:", fileName);
            } else {
              console.error("Upload error:", uploadError);
            }
            break; // Use first image
          }
        }

        if (!imageUrl) {
          console.log("No image generated for:", spec.label);
          continue;
        }

        variationResults.push({
          session_id: sessionId,
          image_url: imageUrl,
          label: spec.label,
          tags: spec.tags,
        });
      } catch (err) {
        console.error(`Error generating variation ${spec.label}:`, err);
      }
    }

    if (variationResults.length > 0) {
      await supabase.from("design_variations").insert(variationResults);
    }

    await supabase
      .from("design_sessions")
      .update({
        status: variationResults.length > 0 ? "complete" : "error",
        error_message:
          variationResults.length === 0
            ? "Could not generate any variations. Please try again."
            : null,
      })
      .eq("id", sessionId);

    return new Response(
      JSON.stringify({
        success: true,
        variationCount: variationResults.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("generate-variations error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
