import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Repository posts + post_platforms + post_media.
 * Satu parent `posts`, N target `post_platforms` (lifecycle independen),
 * M media via `post_media`. Pure — tanpa import `next/*`.
 */

export type PostStatus =
  | "draft" | "scheduled" | "processing" | "published"
  | "partial_failed" | "failed" | "cancelled";
export type PlatformStatus =
  | "draft" | "queued" | "processing" | "published" | "failed" | "cancelled";

export interface PostTarget {
  connectedAccountId: string;
  platform: "instagram" | "tiktok";
  caption?: string | null;
  hashtags?: string[];
  commercialDisclosure?: boolean;
  privacyLevel?: string | null;
}

export interface CreatePostInput {
  userId: string;
  title?: string | null;
  targets: PostTarget[];
  mediaIds: string[];
}

function slugError(prefix: string, message: string): Error {
  return new Error(`${prefix}: ${message}`);
}

async function assertOwnedMedia(
  client: SupabaseClient,
  userId: string,
  mediaIds: string[]
): Promise<void> {
  const { data, error } = await client
    .from("media_assets")
    .select("id")
    .eq("user_id", userId)
    .in("id", mediaIds);
  if (error) throw slugError("Media", error.message);
  if ((data ?? []).length !== mediaIds.length) {
    throw slugError("Media", "sebagian media tidak ditemukan / bukan milikmu");
  }
}

async function assertOwnedAccounts(
  client: SupabaseClient,
  userId: string,
  accountIds: string[]
): Promise<Map<string, string>> {
  const { data, error } = await client
    .from("connected_accounts")
    .select("id,platform,status")
    .eq("user_id", userId)
    .in("id", accountIds);
  if (error) throw slugError("Akun", error.message);
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if ((row as { status: string }).status !== "active") {
      throw slugError("Akun", "salah satu akun tidak aktif — reconnect dulu");
    }
    map.set(
      (row as { id: string }).id,
      (row as { platform: string }).platform
    );
  }
  if (map.size !== accountIds.length) {
    throw slugError("Akun", "salah satu akun tidak ditemukan / bukan milikmu");
  }
  return map;
}

export async function createPost(
  client: SupabaseClient,
  input: CreatePostInput
): Promise<{ postId: string; platformIds: string[] }> {
  if (input.targets.length === 0) throw slugError("Post", "pilih minimal 1 target platform");
  if (input.mediaIds.length === 0) throw slugError("Post", "pilih minimal 1 media");

  const accountIds = [...new Set(input.targets.map((t) => t.connectedAccountId))];
  const [platformByAccount] = await Promise.all([
    assertOwnedAccounts(client, input.userId, accountIds),
    assertOwnedMedia(client, input.userId, input.mediaIds),
  ]);

  const { data: post, error: postError } = await client
    .from("posts")
    .insert({ user_id: input.userId, title: input.title ?? null, status: "draft" })
    .select("id")
    .single();
  if (postError || !post) {
    throw slugError("Post", postError?.message ?? "gagal membuat post");
  }

  const platformIds: string[] = [];
  for (const t of input.targets) {
    const expectedPlatform = platformByAccount.get(t.connectedAccountId);
    if (expectedPlatform !== t.platform) {
      throw slugError("Post", "platform target tidak cocok dengan akun");
    }
    const { data: pp, error: ppError } = await client
      .from("post_platforms")
      .insert({
        post_id: post.id,
        connected_account_id: t.connectedAccountId,
        platform: t.platform,
        caption: t.caption ?? null,
        hashtags: t.hashtags ?? [],
        status: "draft",
        commercial_disclosure: t.commercialDisclosure ?? false,
        privacy_level: t.privacyLevel ?? null,
        idempotency_key: randomUUID(),
      })
      .select("id")
      .single();
    if (ppError || !pp) {
      throw slugError("Post", ppError?.message ?? "gagal membuat target");
    }
    platformIds.push(pp.id as string);
  }

  const { error: mediaError } = await client.from("post_media").insert(
    input.mediaIds.map((mediaId, i) => ({
      post_id: post.id,
      media_asset_id: mediaId,
      position: i,
    }))
  );
  if (mediaError) throw slugError("Post", mediaError.message);

  return { postId: post.id as string, platformIds };
}

export interface PostDetail {
  id: string;
  title: string | null;
  status: PostStatus;
  created_at: string;
  targets: {
    id: string;
    platform: string;
    status: PlatformStatus;
    caption: string | null;
    username: string | null;
    scheduled_at: string | null;
    published_at: string | null;
    failure_message: string | null;
  }[];
  media: { id: string; storage_path: string; media_type: string; original_name: string | null }[];
}

export async function getPostDetail(
  client: SupabaseClient,
  postId: string,
  userId: string
): Promise<PostDetail | null> {
  const { data: post, error } = await client
    .from("posts")
    .select("id,title,status,created_at")
    .eq("id", postId)
    .eq("user_id", userId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Gagal memuat post: ${error.message}`);
  }

  const [{ data: targets }, { data: media }] = await Promise.all([
    client
      .from("post_platforms")
      .select("id,platform,status,caption,scheduled_at,published_at,failure_message,connected_accounts(username)")
      .eq("post_id", postId),
    client
      .from("post_media")
      .select("position,media_assets(id,storage_path,media_type,original_name)")
      .eq("post_id", postId)
      .order("position"),
  ]);

  return {
    ...(post as unknown as PostDetail),
    targets: ((targets ?? []) as unknown as {
      id: string; platform: string; status: PlatformStatus; caption: string | null;
      scheduled_at: string | null; published_at: string | null; failure_message: string | null;
      connected_accounts: { username: string | null } | null;
    }[]).map((t) => ({
      id: t.id,
      platform: t.platform,
      status: t.status,
      caption: t.caption,
      username: t.connected_accounts?.username ?? null,
      scheduled_at: t.scheduled_at,
      published_at: t.published_at,
      failure_message: t.failure_message,
    })),
    media: ((media ?? []) as unknown as {
      media_assets: { id: string; storage_path: string; media_type: string; original_name: string | null };
    }[]).map((m) => m.media_assets),
  };
}

export async function listPosts(
  client: SupabaseClient,
  userId: string,
  page = 1,
  perPage = 20
): Promise<{ data: { id: string; title: string | null; status: PostStatus; created_at: string }[]; total: number }> {
  const p = Math.max(1, page);
  const pp = Math.min(100, Math.max(1, perPage));
  const { data, error, count } = await client
    .from("posts")
    .select("id,title,status,created_at", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range((p - 1) * pp, p * pp - 1);
  if (error) throw new Error(`Gagal memuat posts: ${error.message}`);
  return { data: (data ?? []) as PostDetail[] as unknown as { id: string; title: string | null; status: PostStatus; created_at: string }[], total: count ?? 0 };
}

/**
 * Hitung ulang status parent dari semua target platform:
 * published ← semua published; partial_failed ← campuran sukses+gagal;
 * failed ← semua gagal; processing ← ada yang jalan; scheduled ← ada
 * yang queued; cancelled ← semua cancelled; selain itu draft.
 */
export async function recomputePostStatus(
  client: SupabaseClient,
  postId: string,
  userId: string
): Promise<PostStatus> {
  const { data, error } = await client
    .from("post_platforms")
    .select("status")
    .eq("post_id", postId);
  if (error) throw new Error(`Gagal hitung status: ${error.message}`);
  const statuses = ((data ?? []) as { status: string }[]).map((r) => r.status);

  let next: PostStatus = "draft";
  if (statuses.length === 0) {
    next = "draft";
  } else if (statuses.every((s) => s === "published")) {
    next = "published";
  } else if (statuses.every((s) => s === "failed")) {
    next = "failed";
  } else if (statuses.every((s) => s === "cancelled")) {
    next = "cancelled";
  } else if (statuses.some((s) => s === "processing")) {
    next = "processing";
  } else if (statuses.some((s) => s === "published" || s === "failed")) {
    next = "partial_failed";
  } else if (statuses.some((s) => s === "queued")) {
    next = "scheduled";
  }

  const { error: upError } = await client
    .from("posts")
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("user_id", userId);
  if (upError) throw new Error(`Gagal update status post: ${upError.message}`);
  return next;
}
