/**
 * Instagram publishing: container → status → publish (+ quota & error classification).
 * Referensi: Instagram API with Instagram Login (graph.instagram.com).
 * Pure — tanpa import `next/*`. Dipanggil worker (T-12), bukan route web.
 * `fetchImpl` dapat di-inject untuk test.
 */

export type FetchImpl = typeof fetch;

export interface InstagramPublishMedia {
  /** URL publik yang bisa di-fetch Meta (mis. signed URL Storage). */
  url: string;
  mediaType: "image" | "video";
}

export interface InstagramPublishInput {
  accessToken: string;
  igUserId: string;
  media: InstagramPublishMedia[];
  caption: string | null;
  hashtags: string[];
  /** Untuk carousel video: cover image URL. */
  coverUrl?: string;
}

export type ContainerStatus = "IN_PROGRESS" | "FINISHED" | "ERROR" | "EXPIRED";

export interface QuotaInfo {
  quotaTotal: number | null;
  quotaUsed: number | null;
}

export class InstagramApiError extends Error {
  readonly httpStatus: number;
  readonly kind: "transient" | "permanent" | "unknown";

  constructor(message: string, httpStatus: number, kind: "transient" | "permanent" | "unknown") {
    super(message);
    this.name = "InstagramApiError";
    this.httpStatus = httpStatus;
    this.kind = kind;
  }
}

/**
 * Klasifikasi error untuk retry (dipakai worker T-12):
 * 429/5xx/timeout → transient; 400/401/403 + OAuthException → permanent.
 */
export function classifyInstagramError(httpStatus: number, code?: number): "transient" | "permanent" | "unknown" {
  if (httpStatus === 429 || (httpStatus >= 500 && httpStatus <= 599)) return "transient";
  if (httpStatus === 400 || httpStatus === 401 || httpStatus === 403) return "permanent";
  if (code === 190) return "permanent"; // invalid OAuth token
  return "unknown";
}

/** Gabung caption + hashtags untuk IG (caption max sudah divalidasi). */
export function buildInstagramCaption(caption: string | null, hashtags: string[]): string {
  const tags = hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
  if (caption && tags) return `${caption}\n${tags}`;
  return caption || tags || "";
}

/** Hapus field sensitif sebelum response disimpan ke publish_attempts. */
export function sanitizeInstagramResponse(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeInstagramResponse);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/token|secret|session|cookie/i.test(k)) {
        out[k] = "***";
      } else {
        out[k] = sanitizeInstagramResponse(v);
      }
    }
    return out;
  }
  return value;
}

function graphHost(): string {
  return (process.env.INSTAGRAM_GRAPH_HOST || "https://graph.instagram.com").replace(/\/$/, "");
}

async function parseOrThrow(res: Response, context: string): Promise<Record<string, unknown>> {
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    // non-JSON (mis. timeout HTML) — klasifikasikan dari status saja.
  }
  if (!res.ok) {
    const err = body.error as { message?: string; code?: number } | undefined;
    const message = err?.message ?? `HTTP ${res.status}`;
    throw new InstagramApiError(
      `Instagram ${context} gagal: ${String(message).slice(0, 300)}`,
      res.status,
      classifyInstagramError(res.status, err?.code)
    );
  }
  return body;
}

/** Buat container untuk 1 media. Video butuh `media_type=REELS`. */
export async function createMediaContainer(
  input: Omit<InstagramPublishInput, "media" | "caption" | "hashtags"> & {
    media: InstagramPublishMedia;
    captionText: string;
    isCarouselItem?: boolean;
  },
  fetchImpl: FetchImpl = fetch
): Promise<string> {
  const params = new URLSearchParams({
    access_token: input.accessToken,
    caption: input.captionText,
  });
  if (input.isCarouselItem) {
    params.set("is_carousel_item", "true");
  }
  if (input.media.mediaType === "video") {
    params.set("media_type", "REELS");
    params.set("video_url", input.media.url);
    if (input.coverUrl) params.set("cover_url", input.coverUrl);
  } else {
    params.set("image_url", input.media.url);
  }

  const res = await fetchImpl(`${graphHost()}/${input.igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const body = await parseOrThrow(res, "create container");
  const id = body.id;
  if (typeof id !== "string" || !id) {
    throw new InstagramApiError("Instagram create container: id hilang di response", res.status, "unknown");
  }
  return id;
}

/** Buat carousel container dari item container IDs. */
export async function createCarouselContainer(
  accessToken: string,
  igUserId: string,
  childrenIds: string[],
  captionText: string,
  fetchImpl: FetchImpl = fetch
): Promise<string> {
  const params = new URLSearchParams({
    access_token: accessToken,
    media_type: "CAROUSEL",
    children: childrenIds.join(","),
    caption: captionText,
  });
  const res = await fetchImpl(`${graphHost()}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const body = await parseOrThrow(res, "create carousel");
  const id = body.id;
  if (typeof id !== "string" || !id) {
    throw new InstagramApiError("Instagram create carousel: id hilang di response", res.status, "unknown");
  }
  return id;
}

/** Status container: polling hingga FINISHED sebelum publish. */
export async function getContainerStatus(
  accessToken: string,
  containerId: string,
  fetchImpl: FetchImpl = fetch
): Promise<ContainerStatus> {
  const params = new URLSearchParams({
    fields: "status_code",
    access_token: accessToken,
  });
  const res = await fetchImpl(`${graphHost()}/${containerId}?${params.toString()}`);
  const body = await parseOrThrow(res, "cek status container");
  const status = body.status_code;
  if (status !== "IN_PROGRESS" && status !== "FINISHED" && status !== "ERROR" && status !== "EXPIRED") {
    throw new InstagramApiError(
      `Instagram status container tak dikenal: ${String(status)}`,
      res.status,
      "unknown"
    );
  }
  return status;
}

/** Publish container yang sudah FINISHED → platform media ID. */
export async function publishContainer(
  accessToken: string,
  igUserId: string,
  containerId: string,
  fetchImpl: FetchImpl = fetch
): Promise<string> {
  const params = new URLSearchParams({
    access_token: accessToken,
    creation_id: containerId,
  });
  const res = await fetchImpl(`${graphHost()}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const body = await parseOrThrow(res, "publish");
  const id = body.id;
  if (typeof id !== "string" || !id) {
    throw new InstagramApiError("Instagram publish: id hilang di response", res.status, "unknown");
  }
  return id;
}

/** Kuota publishing (dipakai worker sebelum publish). */
export async function getPublishingLimit(
  accessToken: string,
  igUserId: string,
  fetchImpl: FetchImpl = fetch
): Promise<QuotaInfo> {
  const params = new URLSearchParams({
    fields: "quota_usage,rate_limit_settings",
    access_token: accessToken,
  });
  const res = await fetchImpl(
    `${graphHost()}/${igUserId}/content_publishing_limit?${params.toString()}`
  );
  const body = await parseOrThrow(res, "cek kuota");
  const data = (Array.isArray(body.data) ? body.data[0] : undefined) as
    | { quota_usage?: number; rate_limit_settings?: { quota_total?: number } }
    | undefined;
  return {
    quotaTotal: data?.rate_limit_settings?.quota_total ?? null,
    quotaUsed: data?.quota_usage ?? null,
  };
}
