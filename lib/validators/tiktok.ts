import {
  combine,
  fail,
  formatMb,
  validateCaption,
  validateHashtags,
  type MediaInfo,
  type ValidationResult,
} from "./common";

/**
 * Validasi TikTok (video direct post / photo post).
 * Aturan dinamis (max durasi, privacy options) WAJIB dari creator_info
 * terbaru — tidak boleh hardcode sebagai satu-satunya kebenaran.
 * Pure — dipakai submit (web) dan ulang di worker sebelum publish.
 */

export interface TikTokLimits {
  videoMimes: string[];
  imageMimes: string[];
  maxVideoBytes: number;
  maxImageBytes: number;
  minVideoSeconds: number;
  /** Fallback bila creator_info belum tersedia (submit). Worker memakai nilai dinamis. */
  fallbackMaxVideoSeconds: number;
  maxCaption: number;
  maxHashtags: number;
  maxPhotos: number;
}

function num(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function tiktokLimitsFromEnv(): TikTokLimits {
  const list = (raw: string | undefined, fb: string[]) =>
    (raw ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean).length > 0
      ? (raw as string).split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : fb;
  return {
    videoMimes: list(process.env.TIKTOK_VIDEO_MIMES, ["video/mp4", "video/quicktime", "video/webm"]),
    imageMimes: list(process.env.TIKTOK_IMAGE_MIMES, ["image/jpeg", "image/png", "image/webp"]),
    maxVideoBytes: num(process.env.TIKTOK_MAX_VIDEO_BYTES, 250 * 1024 * 1024),
    maxImageBytes: num(process.env.TIKTOK_MAX_IMAGE_BYTES, 8 * 1024 * 1024),
    minVideoSeconds: num(process.env.TIKTOK_MIN_VIDEO_SECONDS, 3),
    fallbackMaxVideoSeconds: num(process.env.TIKTOK_MAX_VIDEO_SECONDS, 600),
    maxCaption: num(process.env.TIKTOK_MAX_CAPTION, 2200),
    maxHashtags: num(process.env.TIKTOK_MAX_HASHTAGS, 30),
    maxPhotos: num(process.env.TIKTOK_MAX_PHOTOS, 35),
  };
}

/** Info dinamis dari `creator_info` — wajib di worker, opsional saat submit. */
export interface TikTokCreatorInfo {
  privacyOptions: string[];
  maxVideoDurationSeconds: number;
}

export interface TikTokPostInput {
  media: MediaInfo[];
  caption?: string | null;
  hashtags?: string[];
  privacyLevel?: string | null;
  creatorInfo?: TikTokCreatorInfo | null;
}

export function validateTikTokPost(
  input: TikTokPostInput,
  lim: TikTokLimits = tiktokLimitsFromEnv()
): ValidationResult {
  const parts: ValidationResult[] = [
    validateCaption(input.caption, lim.maxCaption),
    validateHashtags(input.hashtags, lim.maxHashtags),
  ];

  if (input.media.length === 0) {
    parts.push({ ok: false, issues: [fail("media", "TikTok: pilih minimal 1 media.")] });
    return combine(parts);
  }

  const mimes = input.media.map((m) => m.mimeType.toLowerCase());
  const allVideo = mimes.every((m) => lim.videoMimes.includes(m));
  const allImage = mimes.every((m) => lim.imageMimes.includes(m));

  if (input.media.length === 1 && allVideo) {
    parts.push(validateTikTokVideo(input.media[0], input, lim));
  } else if (allImage) {
    if (input.media.length > lim.maxPhotos) {
      parts.push({
        ok: false,
        issues: [fail("media", `Photo post maksimal ${lim.maxPhotos} foto, saat ini ${input.media.length}.`)],
      });
    }
    input.media.forEach((m, i) => {
      if (m.sizeBytes > lim.maxImageBytes) {
        parts.push({
          ok: false,
          issues: [fail(`media[${i}]`, `Foto ${formatMb(m.sizeBytes)} melebihi ${formatMb(lim.maxImageBytes)}.`)],
        });
      }
    });
  } else if (allVideo) {
    parts.push({
      ok: false,
      issues: [fail("media", "TikTok video post hanya 1 video. Untuk banyak file pakai photo post.")],
    });
  } else {
    parts.push({
      ok: false,
      issues: [fail("media", "Jangan campur foto dan video dalam satu post TikTok.")],
    });
  }

  // Privacy: hanya dicek bila creator_info tersedia (selalu ada di worker).
  if (input.privacyLevel && input.creatorInfo) {
    if (!input.creatorInfo.privacyOptions.includes(input.privacyLevel)) {
      parts.push({
        ok: false,
        issues: [
          fail(
            "privacyLevel",
            `Privacy "${input.privacyLevel}" tidak tersedia untuk akun ini. Pilihan: ${input.creatorInfo.privacyOptions.join(", ")}.`
          ),
        ],
      });
    }
  }

  return combine(parts);
}

function validateTikTokVideo(
  m: MediaInfo,
  input: TikTokPostInput,
  lim: TikTokLimits
): ValidationResult {
  const tag = "media[0]";
  const issues = [];
  if (m.sizeBytes > lim.maxVideoBytes) {
    issues.push(
      fail(tag, `Video ${formatMb(m.sizeBytes)} melebihi ${formatMb(lim.maxVideoBytes)}. Kompres dulu.`)
    );
  }
  const maxDuration =
    input.creatorInfo?.maxVideoDurationSeconds ?? lim.fallbackMaxVideoSeconds;
  if (m.durationSeconds === null || m.durationSeconds === undefined) {
    issues.push(fail(tag, "Durasi video tidak diketahui. Upload ulang via Media Library."));
  } else if (m.durationSeconds < lim.minVideoSeconds || m.durationSeconds > maxDuration) {
    issues.push(
      fail(
        tag,
        `Durasi ${m.durationSeconds.toFixed(0)} dtk di luar ${lim.minVideoSeconds}–${maxDuration} dtk untuk akun ini.`
      )
    );
  }
  return { ok: issues.length === 0, issues };
}
