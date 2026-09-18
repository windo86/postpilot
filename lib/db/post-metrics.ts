import type { SupabaseClient } from "@supabase/supabase-js";
import type { InstagramMetrics } from "@/lib/platforms/instagram/insights";

/**
 * Repository `post_metrics` (snapshot + `fetched_at`).
 * Pure — tanpa import `next/*`.
 */

export interface MetricSnapshot {
  id: string;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  views: number | null;
  reach: number | null;
  impressions: number | null;
  fetched_at: string;
}

export async function getLatestSnapshot(
  client: SupabaseClient,
  platformId: string
): Promise<MetricSnapshot | null> {
  const { data, error } = await client
    .from("post_metrics")
    .select("id,likes,comments,shares,saves,views,reach,impressions,fetched_at")
    .eq("post_platform_id", platformId)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Gagal memuat metrik: ${error.message}`);
  }
  return data as MetricSnapshot;
}

export async function insertSnapshot(
  client: SupabaseClient,
  platformId: string,
  metrics: InstagramMetrics
): Promise<MetricSnapshot> {
  const { data, error } = await client
    .from("post_metrics")
    .insert({
      post_platform_id: platformId,
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
      saves: metrics.saves,
      views: metrics.views,
      reach: metrics.reach,
      impressions: metrics.impressions,
      fetched_at: new Date().toISOString(),
    })
    .select("id,likes,comments,shares,saves,views,reach,impressions,fetched_at")
    .single();
  if (error || !data) throw new Error(`Gagal simpan metrik: ${error?.message ?? "unknown"}`);
  return data as MetricSnapshot;
}

export interface PlatformWithMetrics {
  platformId: string;
  postId: string;
  postTitle: string | null;
  platform: string;
  username: string | null;
  publishedAt: string | null;
  metrics: MetricSnapshot | null;
}

/** Latest snapshot per published target milik user (filter platform opsional). */
export async function listPlatformsWithMetrics(
  client: SupabaseClient,
  userId: string,
  platform?: "instagram" | "tiktok"
): Promise<PlatformWithMetrics[]> {
  const { data: posts, error: pErr } = await client
    .from("posts")
    .select("id,title")
    .eq("user_id", userId);
  if (pErr) throw new Error(`Gagal memuat analytics: ${pErr.message}`);
  const postIds = ((posts ?? []) as { id: string }[]).map((p) => p.id);
  if (postIds.length === 0) return [];
  const titleByPost = new Map(
    ((posts ?? []) as { id: string; title: string | null }[]).map((p) => [p.id, p.title])
  );

  let query = client
    .from("post_platforms")
    .select("id,post_id,platform,published_at,connected_accounts(username)")
    .in("post_id", postIds)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (platform) query = query.eq("platform", platform);
  const { data: platforms, error: ppErr } = await query;
  if (ppErr) throw new Error(`Gagal memuat analytics: ${ppErr.message}`);

  const rows = ((platforms ?? []) as unknown as {
    id: string; post_id: string; platform: string; published_at: string | null;
    connected_accounts: { username: string | null } | { username: string | null }[] | null;
  }[]);
  const out: PlatformWithMetrics[] = [];
  for (const r of rows) {
    const acc = Array.isArray(r.connected_accounts) ? r.connected_accounts[0] : r.connected_accounts;
    out.push({
      platformId: r.id,
      postId: r.post_id,
      postTitle: titleByPost.get(r.post_id) ?? null,
      platform: r.platform,
      username: acc?.username ?? null,
      publishedAt: r.published_at,
      metrics: await getLatestSnapshot(client, r.id),
    });
  }
  return out;
}
