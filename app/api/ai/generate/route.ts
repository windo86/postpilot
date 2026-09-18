import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decrypt } from "@/lib/crypto";
import { getAIKeyCiphertext } from "@/lib/db/ai-keys";
import { getProvider, validatePrompt } from "@/lib/ai/provider";
import { createOpenAIProvider } from "@/lib/ai/openai";
import { createGoogleProvider } from "@/lib/ai/google";
import { startVideoGeneration } from "@/lib/ai/operations";
import { mediaConfigFromEnv } from "@/lib/media/config";

const generateSchema = z.object({
  keyId: z.string().uuid(),
  kind: z.enum(["caption", "image", "video"]),
  prompt: z.string().min(1).max(2000),
  size: z.enum(["square", "portrait", "landscape"]).default("square"),
});

const CAPTION_SYSTEM =
  "Buatkan 3 opsi caption media sosial singkat (maks 220 karakter tiap opsi), Bahasa Indonesia, tiap opsi diawali nomor. Tanpa penjelasan tambahan.";

/**
 * Generate konten AI dengan key milik user (BYOK).
 * - caption → { options: string[] }
 * - image → generate + simpan ke Media Library (source=ai) → { asset }
 * - video → operasi async (status processing) → { assetId, operationId }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = generateSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }
  const promptError = validatePrompt(body.data.prompt);
  if (promptError) return NextResponse.json({ error: promptError }, { status: 400 });

  const service = createServiceClient();
  const key = await getAIKeyCiphertext(service, user.id, body.data.keyId);
  if (!key) return NextResponse.json({ error: "API key tidak ditemukan" }, { status: 404 });

  const providers = [createOpenAIProvider(), createGoogleProvider()];
  let provider;
  try {
    provider = getProvider(key.provider, providers);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  let apiKey: string;
  try {
    apiKey = decrypt(key.ciphertext);
  } catch {
    return NextResponse.json({ error: "API key korup — simpan ulang di Settings" }, { status: 400 });
  }

  try {
    if (body.data.kind === "caption") {
      const text = await provider.generateText(apiKey, `${CAPTION_SYSTEM}\n\nTopik: ${body.data.prompt}`, {
        maxTokens: 400,
      });
      const options = text
        .split(/\n+/)
        .map((l) => l.replace(/^\d+[.)]\s*/, "").trim())
        .filter((l) => l.length > 0)
        .slice(0, 5);
      return NextResponse.json({ options: options.length > 0 ? options : [text] });
    }

    if (body.data.kind === "image") {
      const img = await provider.generateImage(apiKey, body.data.prompt, { size: body.data.size });
      const cfg = mediaConfigFromEnv();
      const path = `${user.id}/${new Date().getUTCFullYear()}/${String(new Date().getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}-ai.png`;
      const { error: upError } = await service.storage
        .from(cfg.bucket)
        .upload(path, img.bytes, { contentType: img.mimeType });
      if (upError) throw new Error(`Upload hasil AI gagal: ${upError.message}`);
      const { data: asset, error: dbError } = await service
        .from("media_assets")
        .insert({
          user_id: user.id,
          storage_bucket: cfg.bucket,
          storage_path: path,
          original_name: "ai-image.png",
          media_type: "image",
          mime_type: img.mimeType,
          file_size: img.bytes.length,
          source: "ai",
          status: "ready",
          metadata: { ai_provider: provider.name, ai_prompt: body.data.prompt.slice(0, 500) },
        })
        .select("id,original_name,media_type")
        .single();
      if (dbError || !asset) throw new Error("Gagal simpan hasil AI ke library");
      return NextResponse.json({ asset });
    }

    const started = await startVideoGeneration(service, mediaConfigFromEnv().bucket, {
      userId: user.id,
      keyId: body.data.keyId,
      provider,
      providerName: provider.name,
      apiKey,
      prompt: body.data.prompt,
    });
    return NextResponse.json({ ...started, status: "processing" }, { status: 202 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
