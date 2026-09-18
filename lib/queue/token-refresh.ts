import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt, encrypt } from "@/lib/crypto";
import { refreshInstagramToken } from "@/lib/platforms/instagram/client";
import { createNotification } from "@/lib/notifications";

/**
 * Refresh token platform yang mendekati expiry. Dipanggil worker tiap iterasi.
 * - Instagram: refresh bila <7 hari (Meta: token ≥24 jam & belum expired).
 * - TikTok: dilewati bila client creds belum dikonfigurasi (T-10).
 * Pure — tanpa import `next/*`.
 */

const IG_REFRESH_WITHIN_DAYS = 7;

export async function refreshDueTokens(client: SupabaseClient): Promise<{ refreshed: number; reauth: number }> {
  const cutoff = new Date(Date.now() + IG_REFRESH_WITHIN_DAYS * 86400000).toISOString();
  const { data, error } = await client
    .from("connected_accounts")
    .select("id,platform,access_token_encrypted,token_expires_at,status")
    .eq("status", "active")
    .lt("token_expires_at", cutoff)
    .limit(20);
  if (error) {
    console.error(`[worker] scan token gagal: ${error.message}`);
    return { refreshed: 0, reauth: 0 };
  }

  let refreshed = 0;
  let reauth = 0;
  for (const row of (data ?? []) as {
    id: string; platform: string; access_token_encrypted: string | null; token_expires_at: string | null;
  }[]) {
    if (row.platform !== "instagram" || !row.access_token_encrypted) continue;
    try {
      const token = decrypt(row.access_token_encrypted);
      const next = await refreshInstagramToken(token);
      await client
        .from("connected_accounts")
        .update({
          access_token_encrypted: encrypt(next.accessToken),
          token_expires_at: next.expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      refreshed++;
      console.log(`[worker] token IG ${row.id} di-refresh`);
    } catch (e) {
      const msg = (e as Error).message;
      // Token mati / scope hilang → minta reconnect, jangan retry buta.
      const { data: acc } = await client
        .from("connected_accounts")
        .select("user_id")
        .eq("id", row.id)
        .single();
      await client
        .from("connected_accounts")
        .update({ status: "reauth_required", updated_at: new Date().toISOString() })
        .eq("id", row.id);
      reauth++;
      if (acc) {
        await createNotification(client, {
          userId: (acc as { user_id: string }).user_id,
          title: "Akun Instagram perlu reconnect",
          message: `Token expired dan refresh gagal: ${msg.slice(0, 200)}`,
          type: "token_reauth_required",
        });
      }
    }
  }
  return { refreshed, reauth };
}
