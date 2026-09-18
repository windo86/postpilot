import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Repository `connected_accounts`. Menerima client yang sudah dibuat
 * (RLS untuk route web, service-role untuk worker) — tidak membuat singleton.
 * Pure — tidak ada import `next/*`.
 */

export type Platform = "instagram" | "tiktok";
export type ConnectionStatus =
  | "active"
  | "expired"
  | "reauth_required"
  | "disconnected";

export interface ConnectedAccount {
  id: string;
  user_id: string;
  platform: Platform;
  platform_account_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  token_expires_at: string | null;
  status: ConnectionStatus;
  scopes: string[] | null;
  connected_at: string;
  updated_at: string;
}

export interface ConnectionUpsert {
  userId: string;
  platform: Platform;
  platformAccountId: string;
  username?: string | null;
  displayName?: string | null;
  accessTokenEncrypted: string;
  refreshTokenEncrypted?: string | null;
  tokenExpiresAt?: Date | null;
  scopes?: string[];
  metadata?: Record<string, unknown>;
}

export async function listConnectionsByUser(
  client: SupabaseClient,
  userId: string
): Promise<ConnectedAccount[]> {
  const { data, error } = await client
    .from("connected_accounts")
    .select(
      "id,user_id,platform,platform_account_id,username,display_name,avatar_url,token_expires_at,status,scopes,connected_at,updated_at"
    )
    .eq("user_id", userId)
    .order("connected_at", { ascending: false });
  if (error) throw new Error(`Gagal memuat koneksi: ${error.message}`);
  return (data ?? []) as ConnectedAccount[];
}

export async function getConnectionById(
  client: SupabaseClient,
  id: string,
  userId: string
): Promise<ConnectedAccount | null> {
  const { data, error } = await client
    .from("connected_accounts")
    .select(
      "id,user_id,platform,platform_account_id,username,display_name,avatar_url,token_expires_at,status,scopes,connected_at,updated_at"
    )
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Gagal memuat koneksi: ${error.message}`);
  }
  return data as ConnectedAccount;
}

/** Token terdekripsi untuk operasi server (refresh/publish). Jangan ke browser. */
export async function getConnectionSecrets(
  client: SupabaseClient,
  id: string,
  userId: string
): Promise<{ accessTokenEncrypted: string | null; refreshTokenEncrypted: string | null } | null> {
  const { data, error } = await client
    .from("connected_accounts")
    .select("access_token_encrypted,refresh_token_encrypted")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Gagal memuat secret koneksi: ${error.message}`);
  }
  return {
    accessTokenEncrypted: data.access_token_encrypted as string | null,
    refreshTokenEncrypted: data.refresh_token_encrypted as string | null,
  };
}

/**
 * Connect / reconnect: unique (user_id, platform, platform_account_id)
 * mencegah duplikat; reconnect menimpa token + mengaktifkan kembali.
 */
export async function upsertConnection(
  client: SupabaseClient,
  input: ConnectionUpsert
): Promise<void> {
  const { error } = await client.from("connected_accounts").upsert(
    {
      user_id: input.userId,
      platform: input.platform,
      platform_account_id: input.platformAccountId,
      username: input.username ?? null,
      display_name: input.displayName ?? null,
      access_token_encrypted: input.accessTokenEncrypted,
      refresh_token_encrypted: input.refreshTokenEncrypted ?? null,
      token_expires_at: input.tokenExpiresAt
        ? input.tokenExpiresAt.toISOString()
        : null,
      status: "active",
      scopes: input.scopes ?? [],
      metadata: input.metadata ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform,platform_account_id" }
  );
  if (error) throw new Error(`Gagal menyimpan koneksi: ${error.message}`);
}

/**
 * Disconnect aman: token di-NULL-kan + status 'disconnected'.
 * Row dipertahankan karena post_platforms me-reference-nya (RESTRICT).
 */
export async function disconnectConnection(
  client: SupabaseClient,
  id: string,
  userId: string
): Promise<void> {
  const { error } = await client
    .from("connected_accounts")
    .update({
      access_token_encrypted: null,
      refresh_token_encrypted: null,
      token_expires_at: null,
      status: "disconnected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(`Gagal disconnect: ${error.message}`);
}
