import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/crypto";
import { fetchInstagramInsights } from "@/lib/platforms/instagram/insights";
import {
  getLatestSnapshot,
  insertSnapshot,
  type MetricSnapshot,
} from "@/lib/db/post-metrics";

/**
 * Refresh metrik satu target published. Throttle default 1 jam
 * kecuali force (tombol manual / worker pass).
 * - TikTok: endpoint analytics menyusul T-10 → skip tanpa snapshot palsu.
 * Pure — tanpa import `next/*`. Dipakai route API & worker.
 */

export const METRICS_TTL_MS = 3600 * 1000;

export type RefreshOutcome =
  | { status: "refreshed"; snapshot: MetricSnapshot }
  | { status: "skipped"; reason: string };

export async function refreshPlatformMetrics(
  client: SupabaseClient,
  platformId: string,
  opts: { force?: boolean } = {}
): Promise<RefreshOutcome> {
  if (!opts.force) {
    const latest = await getLatestSnapshot(client, platformId);
    if (latest && Date.now() - new Date(latest.fetched_at).getTime() < METRICS_TTL_MS) {
      return { status: "skipped", reason: "masih segar (<1 jam)" };
    }
  }

  const { data: plat } = await client
    .from("post_platforms")
    .select("id,platform,status,platform_post_id,connected_account_id")
    .eq("id", platformId)
    .single();
  const row = plat as {
    platform: string; status: string; platform_post_id: string | null; connected_account_id: string;
  } | null;
  if (!row || row.status !== "published" || !row.platform_post_id) {
    return { status: "skipped", reason: "bukan target published" };
  }
  if (row.platform === "tiktok") {
    return { status: "skipped", reason: "analytics TikTok menyusul (T-10)" };
  }

  const { data: acc } = await client
    .from("connected_accounts")
    .select("access_token_encrypted")
    .eq("id", row.connected_account_id)
    .single();
  const enc = (acc as { access_token_encrypted: string | null } | null)?.access_token_encrypted;
  if (!enc) return { status: "skipped", reason: "token tidak tersedia" };

  const metrics = await fetchInstagramInsights(decrypt(enc), row.platform_post_id);
  const snapshot = await insertSnapshot(client, platformId, metrics);
  return { status: "refreshed", snapshot };
}

/**
 * Worker pass: refresh snapshot basi (atau belum ada) untuk target IG
 * published, maksimal `limit` per iterasi. TikTok dilewati (T-10).
 */
export async function refreshStaleAnalytics(
  client: SupabaseClient,
  limit = 5
): Promise<number> {
  const { data, error } = await client
    .from("post_platforms")
    .select("id")
    .eq("platform", "instagram")
    .eq("status", "published")
    .not("platform_post_id", "is", null)
    .limit(20);
  if (error) {
    console.error(`[worker] scan analytics gagal: ${error.message}`);
    return 0;
  }
  let done = 0;
  for (const row of ((data ?? []) as { id: string }[])) {
    if (done >= limit) break;
    try {
      const outcome = await refreshPlatformMetrics(client, row.id);
      if (outcome.status === "refreshed") done++;
    } catch (e) {
      console.error(`[worker] analytics ${row.id} gagal: ${(e as Error).message}`);
    }
  }
  return done;
}
