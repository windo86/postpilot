import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Agregasi dashboard per user aktif. Semua query difilter user_id —
 * tidak ada data antar-user yang bocor. Pure — tanpa import `next/*`.
 */

export interface DashboardSummary {
  counts: { draft: number; scheduled: number; published: number; failed: number };
  recentPosts: { id: string; title: string | null; status: string; created_at: string }[];
  upcoming: {
    queueId: string;
    postId: string;
    postTitle: string | null;
    platform: string;
    scheduledAt: string;
  }[];
  connections: { platform: string; username: string | null; status: string }[];
  failures: { id: string; title: string; message: string; created_at: string }[];
  totals: { likes: number; views: number; postsWithMetrics: number };
}

export async function getDashboardSummary(
  client: SupabaseClient,
  userId: string
): Promise<DashboardSummary> {
  const [{ data: posts }, { data: conns }, { data: notifs }] = await Promise.all([
    client.from("posts").select("id,title,status,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    client.from("connected_accounts").select("platform,username,status").eq("user_id", userId),
    client.from("notifications").select("id,title,message,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
  ]);

  const postRows = ((posts ?? []) as { id: string; title: string | null; status: string; created_at: string }[]);
  const counts = { draft: 0, scheduled: 0, published: 0, failed: 0 };
  for (const p of postRows) {
    if (p.status === "draft" || p.status === "cancelled") counts.draft++;
    else if (p.status === "scheduled" || p.status === "processing") counts.scheduled++;
    else if (p.status === "published") counts.published++;
    else counts.failed++; // failed + partial_failed
  }

  const postIds = postRows.map((p) => p.id);
  const titleByPost = new Map(postRows.map((p) => [p.id, p.title]));

  let upcoming: DashboardSummary["upcoming"] = [];
  if (postIds.length > 0) {
    const { data: plats } = await client
      .from("post_platforms")
      .select("id,post_id,platform")
      .in("post_id", postIds)
      .eq("status", "queued");
    const platRows = ((plats ?? []) as { id: string; post_id: string; platform: string }[]);
    if (platRows.length > 0) {
      const infoByPlat = new Map(platRows.map((r) => [r.id, r]));
      const { data: queue } = await client
        .from("schedule_queue")
        .select("id,post_platform_id,scheduled_at")
        .in("post_platform_id", [...infoByPlat.keys()])
        .eq("status", "pending")
        .order("scheduled_at")
        .limit(5);
      upcoming = (((queue ?? []) as { id: string; post_platform_id: string; scheduled_at: string }[]))
        .filter((q) => infoByPlat.has(q.post_platform_id))
        .map((q) => {
          const info = infoByPlat.get(q.post_platform_id)!;
          return {
            queueId: q.id,
            postId: info.post_id,
            postTitle: titleByPost.get(info.post_id) ?? null,
            platform: info.platform,
            scheduledAt: q.scheduled_at,
          };
        });
    }
  }

  // Total performa dari snapshot terbaru tiap target published milik user.
  const totals = { likes: 0, views: 0, postsWithMetrics: 0 };
  if (postIds.length > 0) {
    const { data: targets } = await client
      .from("post_platforms")
      .select("id")
      .in("post_id", postIds)
      .eq("status", "published");
    const ids = ((targets ?? []) as { id: string }[]).map((t) => t.id);
    if (ids.length > 0) {
      const { data: snaps } = await client
        .from("post_metrics")
        .select("post_platform_id,likes,views,fetched_at")
        .in("post_platform_id", ids)
        .order("fetched_at", { ascending: false });
      const seen = new Set<string>();
      for (const s of ((snaps ?? []) as { post_platform_id: string; likes: number | null; views: number | null }[])) {
        if (seen.has(s.post_platform_id)) continue;
        seen.add(s.post_platform_id);
        totals.postsWithMetrics++;
        totals.likes += s.likes ?? 0;
        totals.views += s.views ?? 0;
      }
    }
  }

  return {
    counts,
    recentPosts: postRows.slice(0, 5),
    upcoming,
    connections: ((conns ?? []) as { platform: string; username: string | null; status: string }[]),
    failures: ((notifs ?? []) as { id: string; title: string; message: string; created_at: string }[]),
    totals,
  };
}
