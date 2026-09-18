import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/crypto";
import { recomputePostStatus } from "@/lib/db/posts";
import { validateInstagramPost } from "@/lib/validators/instagram";
import { validateTikTokPost } from "@/lib/validators/tiktok";
import type { MediaInfo } from "@/lib/validators/common";
import {
  buildInstagramCaption,
  createCarouselContainer,
  createMediaContainer,
  getContainerStatus,
  getPublishingLimit,
  publishContainer,
  sanitizeInstagramResponse,
  InstagramApiError,
} from "@/lib/platforms/instagram/publish";
import {
  buildTikTokTitle,
  fetchCreatorInfo,
  fetchPublishStatus,
  initVideoDirectPost,
  splitChunks,
  uploadVideoChunk,
  TikTokApiError,
} from "@/lib/platforms/tiktok/publish";
import { claimDueJobs, recoverStaleJobs, type ClaimedJob } from "./claim";
import {
  MAX_ATTEMPTS,
  classifyFailure,
  nextAttemptAt,
  shouldRetry,
  type FailureKind,
} from "./retry";
import { createNotification, getNotifyPrefs } from "@/lib/notifications";
import { sendFailureEmail } from "@/lib/notifications/email";

/**
 * Queue processor — dijalankan worker, BUKAN route web.
 * Pure — tanpa import `next/*` (hanya Supabase service client).
 */

const SIGNED_URL_SECONDS = 7200;
const STATUS_POLL_MS = 5000;
const STATUS_POLL_ROUNDS = 24; // ±2 menit (Instagram)
const TIKTOK_POLL_MS = 10000;
const TIKTOK_POLL_ROUNDS = 30; // ±5 menit
const TIKTOK_CHUNK_BYTES = 10 * 1024 * 1024;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface PlatformRow {
  id: string;
  post_id: string;
  platform: "instagram" | "tiktok";
  caption: string | null;
  hashtags: string[] | null;
  status: string;
  commercial_disclosure: boolean;
  privacy_level: string | null;
  platform_metadata: Record<string, unknown> | null;
  connected_account_id: string;
}

interface AccountRow {
  id: string;
  user_id: string;
  platform_account_id: string;
  username: string | null;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  status: string;
}

interface MediaRow {
  id: string;
  storage_bucket: string;
  storage_path: string;
  media_type: "image" | "video";
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
}

async function logAttempt(
  client: SupabaseClient,
  input: {
    queueId: string;
    attemptNumber: number;
    operation: string;
    result: string;
    httpStatus?: number | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    responseJson?: unknown;
    durationMs?: number | null;
  }
): Promise<void> {
  const { error } = await client.from("publish_attempts").insert({
    schedule_queue_id: input.queueId,
    attempt_number: input.attemptNumber,
    operation: input.operation,
    attempted_at: new Date().toISOString(),
    result: input.result,
    http_status: input.httpStatus ?? null,
    error_code: input.errorCode ?? null,
    error_message: input.errorMessage ? input.errorMessage.slice(0, 1000) : null,
    response_json: input.responseJson ?? null,
    duration_ms: input.durationMs ?? null,
  });
  if (error) console.error(`[worker] log attempt gagal: ${error.message}`);
}

async function notifyFailure(
  client: SupabaseClient,
  userId: string,
  title: string,
  message: string
): Promise<void> {
  const prefs = await getNotifyPrefs(client, userId);
  if (prefs.inApp) {
    await createNotification(client, { userId, title, message, type: "publish_failed" });
  }
  if (!prefs.email) return;
  try {
    const { data } = await client.auth.admin.getUserById(userId);
    const email = data.user?.email;
    if (email) {
      await sendFailureEmail({ to: email, subject: `PostPilot: ${title}`, text: message });
    }
  } catch (e) {
    console.error(`[worker] notifikasi email gagal: ${(e as Error).message}`);
  }
}

async function finalizeSuccess(
  client: SupabaseClient,
  job: ClaimedJob,
  platform: PlatformRow,
  userId: string,
  platformPostId: string
): Promise<void> {
  await client
    .from("schedule_queue")
    .update({ status: "succeeded", locked_at: null, locked_by: null, updated_at: new Date().toISOString() })
    .eq("id", job.id);
  await client
    .from("post_platforms")
    .update({
      status: "published",
      platform_post_id: platformPostId,
      published_at: new Date().toISOString(),
      failure_code: null,
      failure_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", platform.id);
  await recomputePostStatus(client, platform.post_id, userId);
  if ((await getNotifyPrefs(client, userId)).inApp) {
    await createNotification(client, {
      userId,
      title: "Publish berhasil",
      message: `Post ke ${platform.platform} terkirim.`,
      type: "publish_succeeded",
    });
  }
}

async function finalizeFailure(
  client: SupabaseClient,
  job: ClaimedJob,
  platform: PlatformRow | null,
  userId: string | null,
  kind: FailureKind,
  operation: string,
  error: unknown,
  durationMs: number
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const code =
    error instanceof InstagramApiError
      ? `ig_${error.httpStatus}`
      : kind === "unknown"
        ? "unknown_publish_state"
        : "publish_failed";

  await logAttempt(client, {
    queueId: job.id,
    attemptNumber: job.attempt_count,
    operation,
    result: "failed",
    httpStatus: error instanceof InstagramApiError ? error.httpStatus : null,
    errorCode: code,
    errorMessage: message,
    durationMs,
  });

  if (shouldRetry(kind === "transient", job.attempt_count)) {
    const next = nextAttemptAt(job.attempt_count);
    await client
      .from("schedule_queue")
      .update({
        status: "pending",
        next_attempt_at: next.toISOString(),
        locked_at: null,
        locked_by: null,
        last_error: message.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    if (platform) {
      await client
        .from("post_platforms")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", platform.id);
    }
    console.log(`[worker] job ${job.id} transient → retry ${next.toISOString()}`);
    return;
  }

  // Permanent / unknown / attempt habis.
  await client
    .from("schedule_queue")
    .update({
      status: "failed",
      locked_at: null,
      locked_by: null,
      last_error: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);
  if (platform && userId) {
    await client
      .from("post_platforms")
      .update({
        status: "failed",
        failure_code: code,
        failure_message: message.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", platform.id);
    await recomputePostStatus(client, platform.post_id, userId);
    await notifyFailure(
      client,
      userId,
      "Publish gagal",
      `Post ke ${platform.platform} gagal setelah ${job.attempt_count} percobaan: ${message.slice(0, 300)}`
    );
  }
}

async function signedMediaUrls(
  client: SupabaseClient,
  media: MediaRow[]
): Promise<{ url: string; mediaType: "image" | "video" }[]> {
  return Promise.all(
    media.map(async (m) => {
      const { data, error } = await client.storage
        .from(m.storage_bucket)
        .createSignedUrl(m.storage_path, SIGNED_URL_SECONDS);
      if (error || !data) {
        throw new Error(`Signed URL gagal untuk ${m.storage_path}: ${error?.message ?? "unknown"}`);
      }
      return { url: data.signedUrl, mediaType: m.media_type };
    })
  );
}

async function runInstagramPublish(
  client: SupabaseClient,
  job: ClaimedJob,
  platform: PlatformRow,
  account: AccountRow,
  media: MediaRow[],
  token: string
): Promise<string> {
  const started = Date.now();
  const captionText = buildInstagramCaption(platform.caption, platform.hashtags ?? []);

  // Kuota dulu — habis = transient (coba lagi nanti).
  const quota = await logTimed(client, job, "instagram_quota", () =>
    getPublishingLimit(token, account.platform_account_id)
  );
  if (quota.quotaTotal !== null && quota.quotaUsed !== null && quota.quotaUsed >= quota.quotaTotal) {
    throw new InstagramApiError("Kuota publish Instagram habis, coba lagi nanti", 429, "transient");
  }

  const urls = await signedMediaUrls(client, media);

  // Resume container bila attempt sebelumnya sudah membuatnya (anti-duplikat).
  const meta = platform.platform_metadata ?? {};
  let containerId = meta.instagram_container_id as string | undefined;
  if (!containerId) {
    if (urls.length === 1) {
      containerId = await logTimed(client, job, "instagram_container", () =>
        createMediaContainer({
          accessToken: token,
          igUserId: account.platform_account_id,
          media: urls[0],
          captionText,
        })
      );
    } else {
      const itemIds: string[] = [];
      for (let i = 0; i < urls.length; i++) {
        const id = await logTimed(client, job, "instagram_container_item", () =>
          createMediaContainer({
            accessToken: token,
            igUserId: account.platform_account_id,
            media: urls[i],
            captionText: "",
            isCarouselItem: true,
          })
        );
        itemIds.push(id);
      }
      containerId = await logTimed(client, job, "instagram_container_carousel", () =>
        createCarouselContainer(token, account.platform_account_id, itemIds, captionText)
      );
    }
    await client
      .from("post_platforms")
      .update({
        platform_metadata: { ...meta, instagram_container_id: containerId },
        updated_at: new Date().toISOString(),
      })
      .eq("id", platform.id);
  }

  let status = await getContainerStatus(token, containerId);
  for (let i = 0; i < STATUS_POLL_ROUNDS && status === "IN_PROGRESS"; i++) {
    await sleep(STATUS_POLL_MS);
    status = await getContainerStatus(token, containerId);
  }
  if (status === "IN_PROGRESS") {
    throw new InstagramApiError("Instagram container timeout (masih processing)", 504, "transient");
  }
  if (status !== "FINISHED") {
    throw new InstagramApiError(`Instagram menolak media (status ${status})`, 400, "permanent");
  }

  const t0 = Date.now();
  const mediaId = await publishContainer(token, account.platform_account_id, containerId);
  await logAttempt(client, {
    queueId: job.id,
    attemptNumber: job.attempt_count,
    operation: "instagram_publish",
    result: "succeeded",
    responseJson: sanitizeInstagramResponse({ id: mediaId }),
    durationMs: Date.now() - t0,
  });
  console.log(`[worker] job ${job.id} publish ok (${Date.now() - started}ms)`);
  return mediaId;
}

async function logTimed<T>(
  client: SupabaseClient,
  job: ClaimedJob,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const t0 = Date.now();
  try {
    const result = await fn();
    await logAttempt(client, {
      queueId: job.id,
      attemptNumber: job.attempt_count,
      operation,
      result: "succeeded",
      durationMs: Date.now() - t0,
    });
    return result;
  } catch (e) {
    await logAttempt(client, {
      queueId: job.id,
      attemptNumber: job.attempt_count,
      operation,
      result: "failed",
      httpStatus: e instanceof InstagramApiError ? e.httpStatus : null,
      errorCode: e instanceof InstagramApiError ? `ig_${e.httpStatus}` : null,
      errorMessage: e instanceof Error ? e.message : String(e),
      durationMs: Date.now() - t0,
    });
    throw e;
  }
}

function toMediaInfos(media: MediaRow[]): MediaInfo[] {
  return media.map((m) => ({
    mimeType: m.mime_type ?? "",
    sizeBytes: m.file_size ?? 0,
    width: m.width,
    height: m.height,
    durationSeconds: m.duration_seconds,
  }));
}

/** Proses satu job ter-claim. Tidak pernah throw (semua difinalisasi). */
export async function processJob(client: SupabaseClient, job: ClaimedJob): Promise<void> {
  const started = Date.now();
  const op = "process";

  const { data: platformRows } = await client
    .from("post_platforms")
    .select("id,post_id,platform,caption,hashtags,status,commercial_disclosure,privacy_level,platform_metadata,connected_account_id")
    .eq("id", job.post_platform_id)
    .limit(1);
  const platform = (platformRows?.[0] ?? null) as PlatformRow | null;
  if (!platform) {
    await finalizeFailure(client, job, null, null, "permanent", op, new Error("Target platform tidak ditemukan"), Date.now() - started);
    return;
  }

  const { data: postRows } = await client
    .from("posts")
    .select("id,user_id")
    .eq("id", platform.post_id)
    .limit(1);
  const post = (postRows?.[0] ?? null) as { id: string; user_id: string } | null;
  if (!post) {
    await finalizeFailure(client, job, platform, null, "permanent", op, new Error("Post induk tidak ditemukan"), Date.now() - started);
    return;
  }

  const { data: accountRows } = await client
    .from("connected_accounts")
    .select("id,user_id,platform_account_id,username,access_token_encrypted,refresh_token_encrypted,token_expires_at,status")
    .eq("id", platform.connected_account_id)
    .limit(1);
  const account = (accountRows?.[0] ?? null) as AccountRow | null;
  if (!account || account.user_id !== post.user_id) {
    await finalizeFailure(client, job, platform, post.user_id, "permanent", op, new Error("Akun platform tidak valid"), Date.now() - started);
    return;
  }
  if (account.status !== "active" || !account.access_token_encrypted) {
    await finalizeFailure(client, job, platform, post.user_id, "permanent", op, new Error("Akun membutuhkan reconnect"), Date.now() - started);
    return;
  }

  const { data: mediaLinks } = await client
    .from("post_media")
    .select("media_asset_id,media_assets(id,storage_bucket,storage_path,media_type,mime_type,file_size,width,height,duration_seconds)")
    .eq("post_id", platform.post_id)
    .order("position");
  const media = ((mediaLinks ?? []) as unknown as {
    media_assets: MediaRow | MediaRow[] | null;
  }[]).flatMap((r) =>
    Array.isArray(r.media_assets) ? r.media_assets : r.media_assets ? [r.media_assets] : []
  );
  if (media.length === 0) {
    await finalizeFailure(client, job, platform, post.user_id, "permanent", op, new Error("Post tidak punya media"), Date.now() - started);
    return;
  }

  // Validasi ulang tepat sebelum publish.
  const infos = toMediaInfos(media);
  const validation =
    platform.platform === "instagram"
      ? validateInstagramPost({ media: infos, caption: platform.caption, hashtags: platform.hashtags ?? [] })
      : validateTikTokPost({
          media: infos,
          caption: platform.caption,
          hashtags: platform.hashtags ?? [],
          privacyLevel: platform.privacy_level,
          creatorInfo: null,
        });
  if (!validation.ok) {
    await finalizeFailure(client, job, platform, post.user_id, "permanent", "validate", new Error(validation.issues[0].message), Date.now() - started);
    return;
  }

  let token: string;
  try {
    token = decrypt(account.access_token_encrypted);
  } catch {
    await finalizeFailure(client, job, platform, post.user_id, "permanent", op, new Error("Token korup — reconnect akun"), Date.now() - started);
    return;
  }

  try {
    const platformPostId =
      platform.platform === "tiktok"
        ? await runTikTokPublish(client, job, platform, account, media, token)
        : await runInstagramPublish(client, job, platform, account, media, token);
    await finalizeSuccess(client, job, platform, post.user_id, platformPostId);
  } catch (e) {
    const kind = classifyFailure(e);
    await finalizeFailure(client, job, platform, post.user_id, kind, op, e, Date.now() - started);
  }
}

/**
 * TikTok direct post video (FILE_UPLOAD). Idempotent resume via
 * `platform_metadata.tiktok_publish_id`: init+upload sekali, polling
 * status dilanjutkan attempt berikutnya bila masih processing.
 */
async function runTikTokPublish(
  client: SupabaseClient,
  job: ClaimedJob,
  platform: PlatformRow,
  account: AccountRow,
  media: MediaRow[],
  token: string
): Promise<string> {
  if (media.length !== 1 || media[0].media_type !== "video") {
    throw new TikTokApiError("TikTok photo post menyusul — saat ini video saja", 400, null, "permanent");
  }
  const video = media[0];
  const meta = platform.platform_metadata ?? {};

  const creator = await logTimed(client, job, "tiktok_creator_info", () =>
    fetchCreatorInfo(token)
  );
  const privacy = platform.privacy_level ?? creator.privacyOptions[0] ?? "SELF_ONLY";
  if (!creator.privacyOptions.includes(privacy)) {
    throw new TikTokApiError(
      `Privacy "${privacy}" tidak tersedia untuk akun ini (${creator.privacyOptions.join(", ")})`,
      400, null, "permanent"
    );
  }

  let publishId = meta.tiktok_publish_id as string | undefined;
  if (!publishId) {
    const { data: blob, error: dlError } = await client.storage
      .from(video.storage_bucket)
      .download(video.storage_path);
    if (dlError || !blob) {
      throw new Error(`Unduh video gagal: ${dlError?.message ?? "unknown"}`);
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const chunks = splitChunks(bytes.length, TIKTOK_CHUNK_BYTES);
    const title = buildTikTokTitle(platform.caption, platform.hashtags ?? []);
    const init = await logTimed(client, job, "tiktok_init", () =>
      initVideoDirectPost(token, {
        title,
        privacyLevel: privacy,
        videoSize: bytes.length,
        chunkSize: bytes.length <= 5 * 1024 * 1024 ? bytes.length : TIKTOK_CHUNK_BYTES,
        totalChunks: chunks.length,
      })
    );
    for (const c of chunks) {
      const part = bytes.subarray(c.first, c.last + 1);
      await logTimed(client, job, "tiktok_chunk", () =>
        uploadVideoChunk(init.uploadUrl, video.mime_type ?? "video/mp4", part, c.first, c.last, bytes.length)
      );
    }
    publishId = init.publishId;
    await client
      .from("post_platforms")
      .update({
        platform_metadata: { ...meta, tiktok_publish_id: publishId },
        updated_at: new Date().toISOString(),
      })
      .eq("id", platform.id);
  }

  let result = await fetchPublishStatus(token, publishId);
  for (let i = 0; i < TIKTOK_POLL_ROUNDS && result.status !== "PUBLISH_COMPLETE" && result.status !== "FAILED"; i++) {
    await sleep(TIKTOK_POLL_MS);
    result = await fetchPublishStatus(token, publishId);
  }
  await logAttempt(client, {
    queueId: job.id,
    attemptNumber: job.attempt_count,
    operation: "tiktok_status",
    result: result.status === "PUBLISH_COMPLETE" ? "succeeded" : "failed",
    errorCode: result.failReason,
    responseJson: { status: result.status, share_url: result.shareUrl },
  });

  if (result.status === "PUBLISH_COMPLETE") {
    return result.publicPostIds[0] ?? publishId;
  }
  if (result.status === "FAILED") {
    const transient = result.failReason === "internal";
    throw new TikTokApiError(
      `TikTok publish gagal: ${result.failReason ?? "unknown"}`,
      transient ? 500 : 400,
      result.failReason,
      transient ? "transient" : "permanent"
    );
  }
  throw new TikTokApiError("TikTok masih processing — lanjutkan polling", 504, null, "transient");
}

/** Satu iterasi worker: recovery → claim → proses berurutan. */
export async function runWorkerIteration(
  client: SupabaseClient,
  workerId: string,
  limit = 5
): Promise<{ recovered: number; claimed: number }> {
  const recovered = await recoverStaleJobs(client).catch((e) => {
    console.error(`[worker] recovery gagal: ${(e as Error).message}`);
    return 0;
  });
  if (recovered > 0) console.log(`[worker] recovered ${recovered} stale job(s)`);

  const jobs = await claimDueJobs(client, workerId, limit).catch((e) => {
    console.error(`[worker] claim gagal: ${(e as Error).message}`);
    return [] as ClaimedJob[];
  });
  for (const job of jobs) {
    await processJob(client, job);
  }
  return { recovered, claimed: jobs.length };
}

export { MAX_ATTEMPTS };
