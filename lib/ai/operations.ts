import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AIProvider } from "./provider";

/**
 * Siklus video async: catat operasi di media_assets (status processing),
 * worker polling hingga selesai lalu mengisi file + ready.
 * Pure — tanpa import `next/*`.
 */

export interface StartVideoInput {
  userId: string;
  keyId: string;
  provider: AIProvider;
  providerName: string;
  apiKey: string;
  prompt: string;
}

export async function startVideoGeneration(
  client: SupabaseClient,
  bucket: string,
  input: StartVideoInput
): Promise<{ assetId: string; operationId: string }> {
  const op = await input.provider.startVideo(input.apiKey, input.prompt);
  const path = `${input.userId}/${new Date().getUTCFullYear()}/${String(new Date().getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}-ai-video.mp4`;
  const { data, error } = await client
    .from("media_assets")
    .insert({
      user_id: input.userId,
      storage_bucket: bucket,
      storage_path: path,
      original_name: "ai-video.mp4",
      media_type: "video",
      mime_type: "video/mp4",
      source: "ai",
      status: "processing",
      metadata: {
        ai_provider: input.providerName,
        ai_key_id: input.keyId,
        ai_operation: op.operationId,
        ai_prompt: input.prompt.slice(0, 500),
      },
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`Gagal mencatat operasi video: ${error?.message ?? "unknown"}`);
  }
  return { assetId: (data as { id: string }).id, operationId: op.operationId };
}

export type VideoCheckOutcome =
  | { status: "processing" }
  | { status: "ready"; assetId: string }
  | { status: "failed"; error: string };

/** Worker pass: polling operasi video pending (limit per iterasi). */
export async function pollPendingVideoOperations(
  client: SupabaseClient,
  providers: AIProvider[],
  limit = 1
): Promise<number> {
  const { decrypt } = await import("@/lib/crypto");
  const { getAIKeyCiphertext } = await import("@/lib/db/ai-keys");
  const { data, error } = await client
    .from("media_assets")
    .select("id,user_id,metadata")
    .eq("media_type", "video")
    .eq("source", "ai")
    .eq("status", "processing")
    .not("metadata->>ai_operation", "is", null)
    .limit(limit * 3);
  if (error) {
    console.error(`[worker] scan AI video gagal: ${error.message}`);
    return 0;
  }
  let done = 0;
  for (const row of ((data ?? []) as {
    id: string; user_id: string; metadata: { ai_key_id?: string };
  }[])) {
    if (done >= limit) break;
    const keyId = row.metadata?.ai_key_id;
    if (!keyId) continue;
    try {
      const key = await getAIKeyCiphertext(client, row.user_id, keyId);
      if (!key) continue;
      const outcome = await checkVideoAsset(client, providers, row.id, decrypt(key.ciphertext));
      if (outcome.status === "ready") {
        done++;
        console.log(`[worker] AI video ${row.id} selesai`);
      }
    } catch (e) {
      console.error(`[worker] AI video ${row.id} gagal: ${(e as Error).message}`);
    }
  }
  return done;
}
export async function checkVideoAsset(
  client: SupabaseClient,
  providers: AIProvider[],
  assetId: string,
  apiKey: string
): Promise<VideoCheckOutcome> {
  const { data: row } = await client
    .from("media_assets")
    .select("id,storage_bucket,storage_path,status,metadata")
    .eq("id", assetId)
    .single();
  const asset = row as {
    storage_bucket: string; storage_path: string; status: string;
    metadata: { ai_provider?: string; ai_operation?: string } | null;
  } | null;
  if (!asset || asset.status !== "processing" || !asset.metadata?.ai_operation) {
    return { status: "processing" };
  }
  const provider = providers.find((p) => p.name === asset.metadata!.ai_provider);
  if (!provider) return { status: "failed", error: "Provider tidak dikenal" };

  try {
    const result = await provider.checkVideo(apiKey, asset.metadata.ai_operation!);
    if (!result.done) return { status: "processing" };
    const { error: upError } = await client.storage
      .from(asset.storage_bucket)
      .upload(asset.storage_path, result.bytes, { contentType: result.mimeType, upsert: true });
    if (upError) return { status: "failed", error: upError.message };
    await client
      .from("media_assets")
      .update({
        mime_type: result.mimeType,
        file_size: result.bytes.length,
        status: "ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", assetId);
    return { status: "ready", assetId };
  } catch (e) {
    const message = (e as Error).message;
    await client
      .from("media_assets")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", assetId);
    return { status: "failed", error: message };
  }
}
