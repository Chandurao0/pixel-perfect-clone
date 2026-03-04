import { supabase } from "@/integrations/supabase/client";

const angleLabels = ["Front", "Side", "Back", "Detail"];

export async function createDesignSession(): Promise<string> {
  const { data, error } = await supabase
    .from("design_sessions")
    .insert({ status: "pending" })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function uploadSessionImages(
  sessionId: string,
  files: File[]
): Promise<void> {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split(".").pop() || "jpg";
    const path = `uploads/${sessionId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, { contentType: file.type });

    if (uploadError) throw new Error(uploadError.message);

    const { error: dbError } = await supabase.from("session_images").insert({
      session_id: sessionId,
      storage_path: path,
      angle_label: angleLabels[i] || `Image ${i + 1}`,
    });

    if (dbError) throw new Error(dbError.message);
  }
}

export async function analyzeProduct(sessionId: string) {
  const { data, error } = await supabase.functions.invoke("analyze-product", {
    body: { sessionId },
  });

  if (error) {
    const status = (error as any)?.context?.status;
    const backendMessage = (data as any)?.error;
    if (backendMessage) throw new Error(backendMessage);
    if (status === 429) throw new Error("Rate limit exceeded. Please retry in a minute.");
    if (status === 402) throw new Error("Billing or quota issue on the connected Gemini key.");
    throw new Error(error.message);
  }

  return data;
}

export async function generateVariations(sessionId: string) {
  const { data, error } = await supabase.functions.invoke("generate-variations", {
    body: { sessionId },
  });

  if (error) {
    const status = (error as any)?.context?.status;
    const backendMessage = (data as any)?.error;
    if (backendMessage) throw new Error(backendMessage);
    if (status === 429) throw new Error("Rate limit exceeded. Please retry in a minute.");
    if (status === 402) throw new Error("Billing or quota issue on the connected Gemini key.");
    if (status === 404) throw new Error("Configured Gemini image model was not found for your API key.");
    throw new Error(error.message);
  }

  return data;
}

export async function getSessionWithVariations(sessionId: string) {
  const { data: session } = await supabase
    .from("design_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  const { data: variations } = await supabase
    .from("design_variations")
    .select("*")
    .eq("session_id", sessionId);

  return { session, variations: variations || [] };
}

export async function getDesignHistory() {
  const { data: sessions } = await supabase
    .from("design_sessions")
    .select("*")
    .eq("status", "complete")
    .order("created_at", { ascending: false });

  if (!sessions) return [];

  const results = [];
  for (const session of sessions) {
    const { data: variations } = await supabase
      .from("design_variations")
      .select("*")
      .eq("session_id", session.id)
      .limit(3);

    const { data: originals } = await supabase
      .from("session_images")
      .select("storage_path")
      .eq("session_id", session.id)
      .limit(1);

    let originalUrl = "";
    if (originals && originals.length > 0) {
      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(originals[0].storage_path);
      originalUrl = urlData.publicUrl;
    }

    results.push({
      ...session,
      variations: variations || [],
      originalUrl,
    });
  }

  return results;
}

export async function toggleSaveVariation(
  variationId: string,
  saved: boolean
) {
  await supabase
    .from("design_variations")
    .update({ saved })
    .eq("id", variationId);
}
