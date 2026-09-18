/**
 * Konfigurasi Media Library dari env (bukan hardcoded).
 * Pure — tanpa import `next/*`.
 */

export type MediaType = "image" | "video";

const DEFAULT_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const DEFAULT_VIDEO_MIMES = ["video/mp4", "video/quicktime", "video/webm"];

function parseList(raw: string | undefined, fallback: string[]): string[] {
  const list = (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.length > 0 ? list : fallback;
}

function parseBytes(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export interface MediaConfig {
  bucket: string;
  imageMimes: string[];
  videoMimes: string[];
  maxImageBytes: number;
  maxVideoBytes: number;
  /** File ≥ threshold memakai resumable/TUS, di bawahnya signed URL biasa. */
  tusThresholdBytes: number;
}

export function mediaConfigFromEnv(): MediaConfig {
  return {
    bucket: process.env.MEDIA_BUCKET || "media",
    imageMimes: parseList(process.env.MEDIA_IMAGE_MIMES, DEFAULT_IMAGE_MIMES),
    videoMimes: parseList(process.env.MEDIA_VIDEO_MIMES, DEFAULT_VIDEO_MIMES),
    maxImageBytes: parseBytes(process.env.MEDIA_MAX_IMAGE_BYTES, 8 * 1024 * 1024),
    maxVideoBytes: parseBytes(process.env.MEDIA_MAX_VIDEO_BYTES, 250 * 1024 * 1024),
    tusThresholdBytes: parseBytes(process.env.MEDIA_TUS_THRESHOLD_BYTES, 50 * 1024 * 1024),
  };
}

export function mediaTypeForMime(mime: string, cfg: MediaConfig): MediaType | null {
  const m = mime.toLowerCase();
  if (cfg.imageMimes.includes(m)) return "image";
  if (cfg.videoMimes.includes(m)) return "video";
  return null;
}

export interface FileValidation {
  ok: boolean;
  mediaType: MediaType | null;
  error?: string;
}

/** Validasi MIME + ukuran sebelum upload. Pesan actionable untuk UI. */
export function validateUploadFile(
  mime: string,
  sizeBytes: number,
  cfg: MediaConfig
): FileValidation {
  const mediaType = mediaTypeForMime(mime, cfg);
  if (!mediaType) {
    return {
      ok: false,
      mediaType: null,
      error: `Format ${mime || "tidak dikenal"} tidak didukung. Gambar: JPG/PNG/WebP/GIF. Video: MP4/MOV/WebM.`,
    };
  }
  const max = mediaType === "image" ? cfg.maxImageBytes : cfg.maxVideoBytes;
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, mediaType, error: "Ukuran file tidak valid." };
  }
  if (sizeBytes > max) {
    const maxMb = Math.round(max / 1024 / 1024);
    return {
      ok: false,
      mediaType,
      error: `File terlalu besar (${(sizeBytes / 1024 / 1024).toFixed(1)} MB). Maksimal ${maxMb} MB untuk ${mediaType === "image" ? "gambar" : "video"}.`,
    };
  }
  return { ok: true, mediaType };
}

/** Nama file aman untuk storage path (tanpa karakter spesial). */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[.-]+|[.-]+$/g, "")
      .slice(0, 100) || "file"
  );
}

export interface PathParts {
  userId: string;
  uuid: string;
  filename: string;
  now?: Date;
}

/**
 * Konvensi path: `{userId}/{yyyy}/{mm}/{uuid}-{safe}` (tanpa prefix bucket —
 * bucket di-pass terpisah ke Storage API). Unik per upload via uuid.
 */
export function buildStoragePath(parts: PathParts): string {
  const now = parts.now ?? new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${parts.userId}/${yyyy}/${mm}/${parts.uuid}-${sanitizeFilename(parts.filename)}`;
}

/** Ekstrak userId pemilik dari path (segmen pertama). */
export function ownerIdFromPath(path: string): string | null {
  const first = path.split("/")[0];
  return first ? first : null;
}
