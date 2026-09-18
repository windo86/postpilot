/**
 * TikTok Content Posting API — Direct Post video (FILE_UPLOAD).
 * Referensi: developers.tiktok.com (diverifikasi Sep 2026).
 * PULL_FROM_URL tidak dipakai: butuh verifikasi kepemilikan domain per URL.
 * Photo post menyusul (belum ada kebutuhan demo).
 * Pure — tanpa import `next/*`. Dipanggil worker, bukan route web.
 */

export type FetchImpl = typeof fetch;

const API = "https://open.tiktokapis.com";

export class TikTokApiError extends Error {
  readonly httpStatus: number;
  readonly code: string | null;
  readonly kind: "transient" | "permanent" | "unknown";

  constructor(message: string, httpStatus: number, code: string | null, kind: "transient" | "permanent" | "unknown") {
    super(message);
    this.name = "TikTokApiError";
    this.httpStatus = httpStatus;
    this.code = code;
    this.kind = kind;
  }
}

export function classifyTikTokError(httpStatus: number, code: string | null): "transient" | "permanent" | "unknown" {
  if (httpStatus === 429 || (httpStatus >= 500 && httpStatus <= 599)) return "transient";
  if (code === "spam_risk_too_many_posts") return "transient";
  if (httpStatus === 401 || httpStatus === 403) return "permanent";
  if (
    code === "access_token_invalid" ||
    code === "scope_not_authorized" ||
    code === "url_ownership_unverified"
  ) {
    return "permanent";
  }
  return "unknown";
}

interface ApiEnvelope<T> {
  data?: T;
  error?: { code?: string; message?: string };
}

async function postJson<T>(
  path: string,
  accessToken: string,
  body: unknown,
  context: string,
  fetchImpl: FetchImpl
): Promise<T> {
  const res = await fetchImpl(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(body),
  });
  let envelope: ApiEnvelope<T> = {};
  try {
    envelope = (await res.json()) as ApiEnvelope<T>;
  } catch {
    // non-JSON — klasifikasikan dari status.
  }
  const code = envelope.error?.code ?? null;
  if (!res.ok || (code && code !== "ok")) {
    const message = envelope.error?.message ?? `HTTP ${res.status}`;
    throw new TikTokApiError(
      `TikTok ${context} gagal: ${String(message).slice(0, 300)}`,
      res.status,
      code,
      classifyTikTokError(res.status, code)
    );
  }
  if (!envelope.data) {
    throw new TikTokApiError(`TikTok ${context}: data hilang`, res.status, code, "unknown");
  }
  return envelope.data;
}

export interface TikTokCreatorInfo {
  nickname: string | null;
  avatarUrl: string | null;
  privacyOptions: string[];
  maxVideoDurationSeconds: number;
}

/** Creator info terbaru — WAJIB sebelum tiap direct post (rate 20/menit). */
export async function fetchCreatorInfo(
  accessToken: string,
  fetchImpl: FetchImpl = fetch
): Promise<TikTokCreatorInfo> {
  const data = await postJson<{
    creator_nickname?: string;
    creator_avatar_url?: string;
    privacy_level_options?: string[];
    max_video_post_duration_sec?: number;
  }>("/v2/post/publish/creator_info/query/", accessToken, {}, "creator_info", fetchImpl);
  return {
    nickname: data.creator_nickname ?? null,
    avatarUrl: data.creator_avatar_url ?? null,
    privacyOptions: data.privacy_level_options ?? [],
    maxVideoDurationSeconds: data.max_video_post_duration_sec ?? 600,
  };
}

/** Gabung caption + hashtags untuk title TikTok. */
export function buildTikTokTitle(caption: string | null, hashtags: string[]): string {
  const tags = hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
  if (caption && tags) return `${caption} ${tags}`;
  return caption || tags || "";
}

export interface VideoInitInput {
  title: string;
  privacyLevel: string;
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
  coverTimestampMs?: number;
  videoSize: number;
  chunkSize: number;
  totalChunks: number;
}

/** Bagi bytes jadi chunk valid TikTok (5–64MB, terakhir ≤128MB, maks 1000). */
export function splitChunks(totalBytes: number, chunkSize: number): { first: number; last: number }[] {
  if (totalBytes <= 0) throw new TikTokApiError("Ukuran video invalid", 0, null, "permanent");
  const MIN = 5 * 1024 * 1024;
  const MAX = 64 * 1024 * 1024;
  const MAX_LAST = 128 * 1024 * 1024;
  let size = Math.min(Math.max(chunkSize, totalBytes <= MIN ? totalBytes : MIN), MAX);
  if (totalBytes <= MIN) size = totalBytes;
  const chunks: { first: number; last: number }[] = [];
  let first = 0;
  while (first < totalBytes) {
    let last = Math.min(first + size - 1, totalBytes - 1);
    const remaining = totalBytes - 1 - last;
    // Hindari sisa ekor <5MB yang invalid: gabung ke chunk terakhir (≤128MB).
    if (remaining > 0 && remaining < MIN && last + 1 + remaining <= MAX_LAST) {
      last = totalBytes - 1;
    }
    chunks.push({ first, last });
    first = last + 1;
    if (chunks.length > 1000) {
      throw new TikTokApiError("Video terlalu besar (chunk >1000)", 0, null, "permanent");
    }
  }
  return chunks;
}

export interface VideoInitResult {
  publishId: string;
  uploadUrl: string;
}

export async function initVideoDirectPost(
  accessToken: string,
  input: VideoInitInput,
  fetchImpl: FetchImpl = fetch
): Promise<VideoInitResult> {
  const data = await postJson<{ publish_id?: string; upload_url?: string }>(
    "/v2/post/publish/video/init/",
    accessToken,
    {
      post_info: {
        title: input.title,
        privacy_level: input.privacyLevel,
        disable_duet: input.disableDuet ?? false,
        disable_comment: input.disableComment ?? false,
        disable_stitch: input.disableStitch ?? false,
        video_cover_timestamp_ms: input.coverTimestampMs ?? 1000,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: input.videoSize,
        chunk_size: input.chunkSize,
        total_chunk_count: input.totalChunks,
      },
    },
    "video init",
    fetchImpl
  );
  if (!data.publish_id || !data.upload_url) {
    throw new TikTokApiError("TikTok init: publish_id/upload_url hilang", 200, null, "unknown");
  }
  return { publishId: data.publish_id, uploadUrl: data.upload_url };
}

/** Upload satu chunk. Return "done" (201) atau "partial" (206). */
export async function uploadVideoChunk(
  uploadUrl: string,
  mime: string,
  chunk: Uint8Array,
  first: number,
  last: number,
  total: number,
  fetchImpl: FetchImpl = fetch
): Promise<"done" | "partial"> {
  const res = await fetchImpl(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mime,
      "Content-Length": String(chunk.length),
      "Content-Range": `bytes ${first}-${last}/${total}`,
    },
    body: chunk as unknown as BodyInit,
  });
  if (res.status === 201) return "done";
  if (res.status === 206) return "partial";
  let detail = `HTTP ${res.status}`;
  try {
    detail = (await res.text()).slice(0, 200);
  } catch {
    // abaikan
  }
  const kind = res.status >= 500 || res.status === 429 ? "transient" : "permanent";
  throw new TikTokApiError(`TikTok chunk upload gagal: ${detail}`, res.status, null, kind);
}

export type PublishStatus =
  | "PROCESSING_UPLOAD"
  | "PROCESSING_DOWNLOAD"
  | "SEND_TO_USER_INBOX"
  | "PUBLISH_COMPLETE"
  | "FAILED";

export interface PublishStatusResult {
  status: PublishStatus;
  failReason: string | null;
  publicPostIds: string[];
  shareUrl: string | null;
}

export async function fetchPublishStatus(
  accessToken: string,
  publishId: string,
  fetchImpl: FetchImpl = fetch
): Promise<PublishStatusResult> {
  const data = await postJson<{
    status?: string;
    fail_reason?: string;
    publicly_available_post_id?: string[];
    share_url?: string;
  }>("/v2/post/publish/status/fetch/", accessToken, { publish_id: publishId }, "status", fetchImpl);
  const valid = ["PROCESSING_UPLOAD", "PROCESSING_DOWNLOAD", "SEND_TO_USER_INBOX", "PUBLISH_COMPLETE", "FAILED"];
  if (!data.status || !valid.includes(data.status)) {
    throw new TikTokApiError(`TikTok status tak dikenal: ${String(data.status)}`, 200, null, "unknown");
  }
  return {
    status: data.status as PublishStatus,
    failReason: data.fail_reason ?? null,
    publicPostIds: data.publicly_available_post_id ?? [],
    shareUrl: data.share_url ?? null,
  };
}
