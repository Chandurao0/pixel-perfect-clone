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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update session status
    await supabase
      .from("design_sessions")
      .update({ status: "analyzing" })
      .eq("id", sessionId);

    // Get uploaded images for this session
    const { data: sessionImages } = await supabase
      .from("session_images")
      .select("storage_path, angle_label")
      .eq("session_id", sessionId);

    if (!sessionImages || sessionImages.length === 0) {
      throw new Error("No images found for this session");
    }

    // Get public URLs for the images
    const imageUrls = sessionImages.map((img) => {
      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(img.storage_path);
      return data.publicUrl;
    });

    // Build multimodal content for vision analysis
    const imageContent = imageUrls.map((url) => ({
      type: "image_url" as const,
      image_url: { url },
    }));

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a product design analyst for artisan crafts. Analyse the uploaded product images and return a structured JSON analysis. Be specific about the craft details.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyse these artisan product images. Return a JSON object with: product_type (string), primary_material (string), dominant_colors (array of strings), surface_patterns (array of strings), shape_description (string), texture (string), finish (string), suggested_category (one of: Pottery, Jewelry, Weaving, Woodwork, Other).",
                },
                ...imageContent,
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "analyze_product",
                description:
                  "Return structured analysis of the artisan product",
                parameters: {
                  type: "object",
                  properties: {
                    product_type: { type: "string" },
                    primary_material: { type: "string" },
                    dominant_colors: {
                      type: "array",
                      items: { type: "string" },
                    },
                    surface_patterns: {
                      type: "array",
                      items: { type: "string" },
                    },
                    shape_description: { type: "string" },
                    texture: { type: "string" },
                    finish: { type: "string" },
                    suggested_category: {
                      type: "string",
                      enum: [
                        "Pottery",
                        "Jewelry",
                        "Weaving",
                        "Woodwork",
                        "Other",
                      ],
                    },
                  },
                  required: [
                    "product_type",
                    "primary_material",
                    "dominant_colors",
                    "surface_patterns",
                    "shape_description",
                    "texture",
                    "finish",
                    "suggested_category",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "analyze_product" },
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
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
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    let analysis = {};

    if (toolCall?.function?.arguments) {
      analysis = JSON.parse(toolCall.function.arguments);
    }

    // Save analysis to session
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
