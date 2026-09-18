import type { SupabaseClient } from "@supabase/supabase-js";
import { encrypt } from "@/lib/crypto";

/**
 * Repository `ai_api_keys` (BYOK). Raw key TIDAK PERNAH dibaca kembali —
 * list hanya kembalikan provider/label/last4. Pure tanpa `next/*`
 * (encrypt dari lib/crypto yang murni).
 */

export type AIProviderName = "openai" | "google";

export interface AIKeyMeta {
  id: string;
  provider: AIProviderName;
  label: string | null;
  key_last4: string | null;
  created_at: string;
}

const COLUMNS = "id,provider,label,key_last4,created_at";

export async function listAIKeys(
  client: SupabaseClient,
  userId: string
): Promise<AIKeyMeta[]> {
  const { data, error } = await client
    .from("ai_api_keys")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Gagal memuat AI keys: ${error.message}`);
  return (data ?? []) as AIKeyMeta[];
}

/** Simpan key terenkripsi. Raw key hanya ada di argumen ini — jangan log. */
export async function createAIKey(
  client: SupabaseClient,
  userId: string,
  input: { provider: AIProviderName; label?: string | null; rawKey: string }
): Promise<AIKeyMeta> {
  const trimmed = input.rawKey.trim();
  if (trimmed.length < 8) throw new Error("API key terlalu pendek.");
  const { data, error } = await client
    .from("ai_api_keys")
    .insert({
      user_id: userId,
      provider: input.provider,
      label: input.label?.trim() || null,
      key_ciphertext: encrypt(trimmed),
      key_last4: trimmed.slice(-4),
    })
    .select(COLUMNS)
    .single();
  if (error || !data) throw new Error(`Gagal menyimpan key: ${error?.message ?? "unknown"}`);
  return data as AIKeyMeta;
}

export async function deleteAIKey(
  client: SupabaseClient,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await client
    .from("ai_api_keys")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(`Gagal hapus key: ${error.message}`);
}

/** Ambil ciphertext untuk dekripsi server-side (tidak pernah ke browser). */
export async function getAIKeyCiphertext(
  client: SupabaseClient,
  userId: string,
  id: string
): Promise<{ provider: AIProviderName; ciphertext: string } | null> {
  const { data, error } = await client
    .from("ai_api_keys")
    .select("provider,key_ciphertext")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Gagal memuat key: ${error.message}`);
  }
  return {
    provider: (data as { provider: AIProviderName }).provider,
    ciphertext: (data as { key_ciphertext: string }).key_ciphertext,
  };
}
