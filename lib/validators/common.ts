/**
 * Tipe & util bersama validator platform.
 * Pure — tanpa import `next/*`. Dipakai saat submit (web) dan ulang di worker.
 */

export interface MediaInfo {
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

export function fail(field: string, message: string): ValidationIssue {
  return { field, message };
}

export function combine(results: ValidationResult[]): ValidationResult {
  const issues = results.flatMap((r) => r.issues);
  return { ok: issues.length === 0, issues };
}

export function validateCaption(
  caption: string | null | undefined,
  maxLength: number
): ValidationResult {
  if (!caption) return { ok: true, issues: [] };
  if (caption.length > maxLength) {
    return {
      ok: false,
      issues: [
        fail(
          "caption",
          `Caption ${caption.length} karakter melebihi batas ${maxLength}. Persingkat dulu.`
        ),
      ],
    };
  }
  return { ok: true, issues: [] };
}

export function validateHashtags(hashtags: string[] | undefined, max: number): ValidationResult {
  const tags = hashtags ?? [];
  if (tags.length > max) {
    return {
      ok: false,
      issues: [fail("hashtags", `Maksimal ${max} hashtag, saat ini ${tags.length}.`)],
    };
  }
  return { ok: true, issues: [] };
}

export function validateMediaCount(
  count: number,
  min: number,
  max: number,
  label: string
): ValidationResult {
  if (count < min || count > max) {
    return {
      ok: false,
      issues: [
        fail(
          "media",
          `${label}: butuh ${min}–${max} media, saat ini ${count}.`
        ),
      ],
    };
  }
  return { ok: true, issues: [] };
}

/** Aspect ratio w/h, null bila dimensi tidak diketahui. */
export function aspectRatio(m: MediaInfo): number | null {
  if (!m.width || !m.height || m.width <= 0 || m.height <= 0) return null;
  return m.width / m.height;
}

export function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
