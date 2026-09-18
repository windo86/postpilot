import {
  aspectRatio,
  combine,
  fail,
  formatMb,
  validateCaption,
  validateHashtags,
  validateMediaCount,
  type MediaInfo,
  type ValidationResult,
} from "./common";

/**
 * Validasi Instagram (feed image / carousel / reels).
 * Angka dari env (override) atau default — TIDAK tersebar di file lain.
 * Pure — dipakai submit (web) dan ulang di worker sebelum publish.
 */

export interface InstagramLimits {
  imageMimes: string[];
  videoMimes: string[];
  maxImageBytes: number;
  maxVideoBytes: number;
  /** Rasio w/h: 4:5 (0.8) s/d 1.91:1. */
  minAspect: number;
  maxAspect: number;
  minWidth: number;
  maxCaption: number;
  maxHashtags: number;
  carouselMin: number;
  carouselMax: number;
  minVideoSeconds: number;
  maxVideoSeconds: number;
}

function num(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function instagramLimitsFromEnv(): InstagramLimits {
  const list = (raw: string | undefined, fb: string[]) =>
    (raw ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean).length > 0
      ? (raw as string).split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : fb;
  return {
    imageMimes: list(process.env.INSTAGRAM_IMAGE_MIMES, ["image/jpeg", "image/png"]),
    videoMimes: list(process.env.INSTAGRAM_VIDEO_MIMES, ["video/mp4", "video/quicktime"]),
    maxImageBytes: num(process.env.INSTAGRAM_MAX_IMAGE_BYTES, 8 * 1024 * 1024),
    maxVideoBytes: num(process.env.INSTAGRAM_MAX_VIDEO_BYTES, 250 * 1024 * 1024),
    minAspect: num(process.env.INSTAGRAM_MIN_ASPECT, 0.8),
    maxAspect: num(process.env.INSTAGRAM_MAX_ASPECT, 1.91),
    minWidth: num(process.env.INSTAGRAM_MIN_WIDTH, 320),
    maxCaption: num(process.env.INSTAGRAM_MAX_CAPTION, 2200),
    maxHashtags: num(process.env.INSTAGRAM_MAX_HASHTAGS, 30),
    carouselMin: num(process.env.INSTAGRAM_CAROUSEL_MIN, 2),
    carouselMax: num(process.env.INSTAGRAM_CAROUSEL_MAX, 10),
    minVideoSeconds: num(process.env.INSTAGRAM_MIN_VIDEO_SECONDS, 3),
    maxVideoSeconds: num(process.env.INSTAGRAM_MAX_VIDEO_SECONDS, 900),
  };
}

function validateImage(
  m: MediaInfo,
  index: number,
  lim: InstagramLimits
): ValidationResult {
  const tag = `media[${index}]`;
  const issues = [];
  if (!lim.imageMimes.includes(m.mimeType.toLowerCase())) {
    return {
      ok: false,
      issues: [
        fail(tag, `Instagram tidak menerima ${m.mimeType}. Convert ke JPG/PNG dulu.`),
      ],
    };
  }
  if (m.sizeBytes > lim.maxImageBytes) {
    issues.push(
      fail(tag, `Gambar ${formatMb(m.sizeBytes)} melebihi ${formatMb(lim.maxImageBytes)}. Kompres dulu.`)
    );
  }
  if (!m.width || !m.height) {
    issues.push(fail(tag, "Dimensi gambar tidak diketahui. Upload ulang via Media Library."));
  } else {
    if (m.width < lim.minWidth) {
      issues.push(fail(tag, `Lebar ${m.width}px di bawah minimum ${lim.minWidth}px.`));
    }
    const ar = aspectRatio(m);
    if (ar !== null && (ar < lim.minAspect || ar > lim.maxAspect)) {
      issues.push(
        fail(tag, `Rasio ${ar.toFixed(2)} di luar 4:5–1.91:1. Crop ke 1:1 atau 4:5.`)
      );
    }
  }
  return { ok: issues.length === 0, issues };
}

function validateVideo(
  m: MediaInfo,
  index: number,
  lim: InstagramLimits
): ValidationResult {
  const tag = `media[${index}]`;
  if (!lim.videoMimes.includes(m.mimeType.toLowerCase())) {
    return {
      ok: false,
      issues: [fail(tag, `Instagram tidak menerima ${m.mimeType}. Convert ke MP4 dulu.`)],
    };
  }
  const issues = [];
  if (m.sizeBytes > lim.maxVideoBytes) {
    issues.push(
      fail(tag, `Video ${formatMb(m.sizeBytes)} melebihi ${formatMb(lim.maxVideoBytes)}. Kompres dulu.`)
    );
  }
  if (m.durationSeconds === null || m.durationSeconds === undefined) {
    issues.push(fail(tag, "Durasi video tidak diketahui. Upload ulang via Media Library."));
  } else if (m.durationSeconds < lim.minVideoSeconds || m.durationSeconds > lim.maxVideoSeconds) {
    issues.push(
      fail(tag, `Durasi ${m.durationSeconds.toFixed(0)} dtk di luar ${lim.minVideoSeconds}–${lim.maxVideoSeconds} dtk.`)
    );
  }
  return { ok: issues.length === 0, issues };
}

function kindOf(m: MediaInfo, lim: InstagramLimits): "image" | "video" | "unknown" {
  const mime = m.mimeType.toLowerCase();
  if (lim.imageMimes.includes(mime)) return "image";
  if (lim.videoMimes.includes(mime)) return "video";
  return "unknown";
}

export interface InstagramPostInput {
  media: MediaInfo[];
  caption?: string | null;
  hashtags?: string[];
}

/** Single image, carousel (2–10), atau reels (1 video). */
export function validateInstagramPost(
  input: InstagramPostInput,
  lim: InstagramLimits = instagramLimitsFromEnv()
): ValidationResult {
  const parts: ValidationResult[] = [
    validateCaption(input.caption, lim.maxCaption),
    validateHashtags(input.hashtags, lim.maxHashtags),
  ];

  const kinds = input.media.map((m) => kindOf(m, lim));
  if (kinds.includes("unknown")) {
    const i = kinds.indexOf("unknown");
    parts.push({
      ok: false,
      issues: [
        fail(`media[${i}]`, `Format ${input.media[i].mimeType} tidak didukung Instagram. Pakai JPG/PNG/MP4.`),
      ],
    });
    return combine(parts);
  }

  const videos = kinds.filter((k) => k === "video").length;
  if (input.media.length === 1 && videos === 0) {
    parts.push(validateImage(input.media[0], 0, lim));
  } else if (input.media.length === 1 && videos === 1) {
    parts.push(validateVideo(input.media[0], 0, lim)); // reels
  } else {
    parts.push(
      validateMediaCount(input.media.length, lim.carouselMin, lim.carouselMax, "Carousel Instagram")
    );
    input.media.forEach((m, i) => {
      parts.push(
        kinds[i] === "video" ? validateVideo(m, i, lim) : validateImage(m, i, lim)
      );
    });
  }
  return combine(parts);
}
