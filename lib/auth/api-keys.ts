import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * API keys untuk automation eksternal (n8n/dsb). Raw key hanya ada saat
 * creation — disimpan sebagai SHA-256 hash. Pure tanpa `next/*`
 * (rate limiter in-memory per instance; cukup untuk 1 web instance MVP).
 */

const KEY_PREFIX = "pp_live_";
const KEY_BYTES = 32;

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

/** Format: pp_live_<base64url 43 char>. Prefix disimpan untuk identifikasi. */
export function generateRawKey(): { rawKey: string; prefix: string; hash: string } {
  const rawKey = KEY_PREFIX + randomBytes(KEY_BYTES).toString("base64url");
  return { rawKey, prefix: rawKey.slice(0, 12), hash: hashApiKey(rawKey) };
}

export interface ApiKeyMeta {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

const COLUMNS = "id,name,key_prefix,last_used_at,expires_at,revoked_at,created_at";

export async function createApiKey(
  client: SupabaseClient,
  userId: string,
  name: string
): Promise<{ meta: ApiKeyMeta; rawKey: string }> {
  const { rawKey, prefix, hash } = generateRawKey();
  const { data, error } = await client
    .from("api_keys")
    .insert({ user_id: userId, name, key_prefix: prefix, key_hash: hash })
    .select(COLUMNS)
    .single();
  if (error || !data) throw new Error(`Gagal buat API key: ${error?.message ?? "unknown"}`);
  return { meta: data as ApiKeyMeta, rawKey };
}

export async function listApiKeys(client: SupabaseClient, userId: string): Promise<ApiKeyMeta[]> {
  const { data, error } = await client
    .from("api_keys")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Gagal memuat API keys: ${error.message}`);
  return (data ?? []) as ApiKeyMeta[];
}

export async function revokeApiKey(
  client: SupabaseClient,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await client
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(`Gagal revoke: ${error.message}`);
}

export interface VerifiedKey {
  keyId: string;
  userId: string;
}

/** Verifikasi raw key → user. Return null bila tak dikenal/revoked/expired. */
export async function verifyApiKey(
  client: SupabaseClient,
  rawKey: string
): Promise<VerifiedKey | null> {
  if (!rawKey.startsWith(KEY_PREFIX)) return null;
  const { data, error } = await client
    .from("api_keys")
    .select("id,user_id,revoked_at,expires_at")
    .eq("key_hash", hashApiKey(rawKey))
    .single();
  if (error || !data) return null;
  const row = data as { id: string; user_id: string; revoked_at: string | null; expires_at: string | null };
  if (row.revoked_at) return null;
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return null;
  await client.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", row.id);
  return { keyId: row.id, userId: row.user_id };
}

/** Ambil Bearer / x-api-key dari request. */
export function extractApiKey(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim() || null;
  const header = request.headers.get("x-api-key");
  return header?.trim() || null;
}

// ---- Rate limit per key (sliding window in-memory) ----

const WINDOW_MS = 60_000;
const DEFAULT_MAX = 60;
const hits = new Map<string, number[]>();

export function apiKeyRateLimitMax(): number {
  const n = Number(process.env.API_KEY_RATE_LIMIT_PER_MINUTE);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_MAX;
}

export function checkApiKeyRateLimit(keyHash: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const arr = (hits.get(keyHash) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= apiKeyRateLimitMax()) {
    const retryAfterSec = Math.ceil((arr[0] + WINDOW_MS - now) / 1000);
    hits.set(keyHash, arr);
    return { allowed: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }
  arr.push(now);
  hits.set(keyHash, arr);
  return { allowed: true, retryAfterSec: 0 };
}

/** Reset state limiter (test). */
export function resetApiKeyRateLimit(): void {
  hits.clear();
}
