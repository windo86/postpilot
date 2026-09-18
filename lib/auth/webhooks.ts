import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt, encrypt } from "@/lib/crypto";

/**
 * Incoming webhook: endpoint token (hash-only) + signing secret (encrypted).
 * Signature: `x-webhook-signature: sha256=<hmac-hex(raw body)>`.
 * Pure tanpa `next/*` (repo + HMAC murni).
 */

const TOKEN_PREFIX = "pp_wh_";

export function generateEndpointToken(): { token: string; hash: string } {
  const token = TOKEN_PREFIX + randomBytes(24).toString("base64url");
  const hash = createHash("sha256").update(token, "utf8").digest("hex");
  return { token, hash };
}

export function generateSigningSecret(): { secret: string; ciphertext: string } {
  const secret = randomBytes(32).toString("hex");
  return { secret, ciphertext: encrypt(secret) };
}

/** Verifikasi HMAC-SHA256 raw body (timing-safe). */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader) return false;
  const m = signatureHeader.match(/^sha256=([0-9a-fA-F]+)$/);
  if (!m) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(m[1], "hex");
  } catch {
    return false;
  }
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/** HMAC untuk test/contoh client. */
export function signWebhookPayload(rawBody: string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

export interface WebhookMeta {
  id: string;
  name: string;
  event_type: string;
  active: boolean;
  last_received_at: string | null;
  created_at: string;
}

const COLUMNS = "id,name,event_type,active,last_received_at,created_at";

export async function listWebhooks(client: SupabaseClient, userId: string): Promise<WebhookMeta[]> {
  const { data, error } = await client
    .from("webhooks")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Gagal memuat webhooks: ${error.message}`);
  return (data ?? []) as WebhookMeta[];
}

export async function createWebhook(
  client: SupabaseClient,
  userId: string,
  input: { name: string; eventType?: string }
): Promise<{ meta: WebhookMeta; endpointToken: string; signingSecret: string }> {
  const { token, hash } = generateEndpointToken();
  const { secret, ciphertext } = generateSigningSecret();
  const { data, error } = await client
    .from("webhooks")
    .insert({
      user_id: userId,
      name: input.name,
      event_type: input.eventType ?? "post",
      endpoint_token_hash: hash,
      signing_secret_ciphertext: ciphertext,
      active: true,
    })
    .select(COLUMNS)
    .single();
  if (error || !data) throw new Error(`Gagal buat webhook: ${error?.message ?? "unknown"}`);
  return { meta: data as WebhookMeta, endpointToken: token, signingSecret: secret };
}

export async function deleteWebhook(client: SupabaseClient, userId: string, id: string): Promise<void> {
  const { error } = await client.from("webhooks").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(`Gagal hapus webhook: ${error.message}`);
}

export async function setWebhookActive(
  client: SupabaseClient,
  userId: string,
  id: string,
  active: boolean
): Promise<void> {
  const { error } = await client
    .from("webhooks")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(`Gagal update webhook: ${error.message}`);
}

export interface WebhookRecord extends WebhookMeta {
  user_id: string;
  endpoint_token_hash: string;
  signing_secret_ciphertext: string;
}

/** Lookup endpoint by token (service-side). */
export async function findWebhookByToken(
  client: SupabaseClient,
  token: string
): Promise<WebhookRecord | null> {
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  const hash = createHash("sha256").update(token, "utf8").digest("hex");
  const { data, error } = await client
    .from("webhooks")
    .select(`${COLUMNS},user_id,endpoint_token_hash,signing_secret_ciphertext`)
    .eq("endpoint_token_hash", hash)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Webhook lookup gagal: ${error.message}`);
  }
  return data as WebhookRecord;
}

export function decryptSigningSecret(ciphertext: string): string {
  return decrypt(ciphertext);
}

export async function touchWebhookReceived(client: SupabaseClient, id: string): Promise<void> {
  await client
    .from("webhooks")
    .update({ last_received_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
}
