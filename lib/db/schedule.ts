import type { SupabaseClient } from "@supabase/supabase-js";
import { recomputePostStatus } from "./posts";

/**
 * Penjadwalan: post_platforms ↔ schedule_queue (1:1).
 * Pure — tanpa import `next/*`. Worker (T-12) yang mengeksekusi queue.
 */

/** Minimal 1 jam dari sekarang, maksimal 30 hari. Publish Now jalur terpisah. */
export const MIN_AHEAD_MINUTES = 60;
export const MAX_AHEAD_DAYS = 30;

export function validateScheduledAt(when: Date, now: Date = new Date()): string | null {
  const diffMs = when.getTime() - now.getTime();
  if (Number.isNaN(when.getTime())) return "Waktu tidak valid.";
  if (diffMs < MIN_AHEAD_MINUTES * 60 * 1000) {
    return `Jadwal minimal ${MIN_AHEAD_MINUTES} menit dari sekarang. Pakai Publish Now untuk langsung.`;
  }
  if (diffMs > MAX_AHEAD_DAYS * 24 * 3600 * 1000) {
    return `Jadwal maksimal ${MAX_AHEAD_DAYS} hari ke depan.`;
  }
  return null;
}

export interface ScheduleInput {
  userId: string;
  postId: string;
  /** Target platform IDs (post_platforms.id) yang dijadwalkan. Kosong = semua draft. */
  platformIds?: string[];
  scheduledAt: Date;
  timezone: string;
}

async function assertOwnedTargets(
  client: SupabaseClient,
  userId: string,
  postId: string,
  platformIds?: string[]
): Promise<string[]> {
  let query = client
    .from("post_platforms")
    .select("id,status")
    .eq("post_id", postId);
  if (platformIds && platformIds.length > 0) query = query.in("id", platformIds);
  const { data, error } = await query;
  if (error) throw new Error(`Gagal memuat target: ${error.message}`);
  const rows = (data ?? []) as { id: string; status: string }[];
  // Ownership post dicek via parent di route (getPostDetail) — di sini pastikan ada.
  if (platformIds && platformIds.length > 0 && rows.length !== platformIds.length) {
    throw new Error("Sebagian target tidak ditemukan");
  }
  const schedulable = rows.filter((r) => ["draft", "queued", "failed", "cancelled"].includes(r.status));
  if (schedulable.length === 0) {
    throw new Error("Tidak ada target yang bisa dijadwalkan (sudah published/processing)");
  }
  return schedulable.map((r) => r.id);
}

/**
 * Jadwalkan target: set scheduled_at + status queued + upsert queue pending.
 * scheduledAt disimpan UTC; timezone user dicatat di platform_metadata.
 */
export async function scheduleTargets(
  client: SupabaseClient,
  input: ScheduleInput
): Promise<void> {
  const ids = await assertOwnedTargets(client, input.userId, input.postId, input.platformIds);
  const at = input.scheduledAt.toISOString();

  // Simpan timezone ke platform_metadata (merge, jangan timpa metadata lain).
  const { data: metas } = await client
    .from("post_platforms")
    .select("id,platform_metadata")
    .in("id", ids);
  for (const row of ((metas ?? []) as { id: string; platform_metadata: Record<string, unknown> | null }[])) {
    await client
      .from("post_platforms")
      .update({
        scheduled_at: at,
        status: "queued",
        failure_code: null,
        failure_message: null,
        platform_metadata: { ...(row.platform_metadata ?? {}), timezone: input.timezone },
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
  }

  const { error: qError } = await client.from("schedule_queue").upsert(
    ids.map((id) => ({
      post_platform_id: id,
      scheduled_at: at,
      next_attempt_at: at,
      status: "pending",
      locked_at: null,
      locked_by: null,
      last_error: null,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "post_platform_id" }
  );
  if (qError) throw new Error(`Gagal enqueue: ${qError.message}`);

  await recomputePostStatus(client, input.postId, input.userId);
}

/** Publish Now: antre sekarang (tanpa aturan minimal 1 jam). */
export async function publishNow(
  client: SupabaseClient,
  userId: string,
  postId: string,
  platformIds?: string[]
): Promise<void> {
  const ids = await assertOwnedTargets(client, userId, postId, platformIds);
  const now = new Date();
  await scheduleTargets(client, {
    userId,
    postId,
    platformIds: ids,
    scheduledAt: now,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
  });
  // Tandai queue siap diproses segera.
  await client
    .from("schedule_queue")
    .update({ next_attempt_at: now.toISOString(), updated_at: now.toISOString() })
    .in("post_platform_id", ids);
}

/** Batalkan post: queue pending → cancelled + target → cancelled. */
export async function cancelPost(
  client: SupabaseClient,
  userId: string,
  postId: string
): Promise<void> {
  const { data: targets, error } = await client
    .from("post_platforms")
    .select("id")
    .eq("post_id", postId);
  if (error) throw new Error(`Gagal memuat target: ${error.message}`);
  const ids = ((targets ?? []) as { id: string }[]).map((t) => t.id);
  if (ids.length === 0) return;

  await client
    .from("schedule_queue")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .in("post_platform_id", ids)
    .eq("status", "pending");

  await client
    .from("post_platforms")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .in("id", ids)
    .in("status", ["draft", "queued", "failed"]);

  await recomputePostStatus(client, postId, userId);
}

export interface CalendarItem {
  queueId: string;
  platformId: string;
  postId: string;
  postTitle: string | null;
  platform: string;
  username: string | null;
  status: string;
  scheduledAt: string;
}

/** Feed kalender: queue + post + akun dalam rentang waktu. */
export async function getCalendarItems(
  client: SupabaseClient,
  userId: string,
  from: Date,
  to: Date
): Promise<CalendarItem[]> {
  const { data: posts, error: pErr } = await client
    .from("posts")
    .select("id,title")
    .eq("user_id", userId);
  if (pErr) throw new Error(`Gagal memuat kalender: ${pErr.message}`);
  const postIds = (posts ?? []).map((p) => p.id as string);
  if (postIds.length === 0) return [];
  const titleByPost = new Map((posts ?? []).map((p) => [p.id as string, (p.title ?? null) as string | null]));

  const { data: platforms, error: ppErr } = await client
    .from("post_platforms")
    .select("id,post_id,platform,connected_accounts(username)")
    .in("post_id", postIds);
  if (ppErr) throw new Error(`Gagal memuat kalender: ${ppErr.message}`);
  const platRows = ((platforms ?? []) as unknown as {
    id: string; post_id: string; platform: string;
    connected_accounts: { username: string | null } | { username: string | null }[] | null;
  }[]).map((r) => ({
    ...r,
    connected_accounts: Array.isArray(r.connected_accounts)
      ? (r.connected_accounts[0] ?? null)
      : r.connected_accounts,
  }));
  if (platRows.length === 0) return [];
  const infoByPlat = new Map(platRows.map((r) => [r.id, r]));

  const { data: queue, error: qErr } = await client
    .from("schedule_queue")
    .select("id,post_platform_id,status,scheduled_at")
    .in("post_platform_id", [...infoByPlat.keys()])
    .gte("scheduled_at", from.toISOString())
    .lte("scheduled_at", to.toISOString())
    .order("scheduled_at");
  if (qErr) throw new Error(`Gagal memuat kalender: ${qErr.message}`);

  return ((queue ?? []) as {
    id: string; post_platform_id: string; status: string; scheduled_at: string;
  }[]).map((q) => {
    const info = infoByPlat.get(q.post_platform_id)!;
    return {
      queueId: q.id,
      platformId: q.post_platform_id,
      postId: info.post_id,
      postTitle: titleByPost.get(info.post_id) ?? null,
      platform: info.platform,
      username: info.connected_accounts?.username ?? null,
      status: q.status,
      scheduledAt: q.scheduled_at,
    };
  });
}
