/**
 * Retry policy: max 3 attempt total, hanya error transient,
 * exponential backoff + jitter. Pure — tanpa import `next/*`.
 */

/** Maksimal total attempt per operasi publish (termasuk yang pertama). */
export const MAX_ATTEMPTS = 3;

/** Backoff dasar (detik) setelah attempt ke-N gagal transient: 1→60s, 2→300s. */
const BACKOFF_SECONDS = [60, 300];

/** Jitter acak 0–30 detik agar worker tidak retry berbarengan. */
export function jitterMs(maxSeconds = 30): number {
  return Math.floor(Math.random() * (maxSeconds * 1000 + 1));
}

/** Kapan attempt berikutnya boleh jalan setelah attemptCount (1-based) gagal. */
export function nextAttemptAt(attemptCount: number, now: Date = new Date()): Date {
  const base = BACKOFF_SECONDS[Math.min(attemptCount - 1, BACKOFF_SECONDS.length - 1)];
  return new Date(now.getTime() + base * 1000 + jitterMs());
}

/** Masih boleh retry? attemptCount sudah termasuk attempt yang baru gagal. */
export function shouldRetry(isTransient: boolean, attemptCount: number): boolean {
  return isTransient && attemptCount < MAX_ATTEMPTS;
}

export type FailureKind = "transient" | "permanent" | "unknown";

/**
 * Klasifikasikan error tak dikenal ke FailureKind:
 * - InstagramApiError membawa kind sendiri.
 * - TypeError/timeout jaringan → transient.
 * - Selain itu → unknown (TIDAK boleh blind retry).
 */
export function classifyFailure(error: unknown): FailureKind {
  if (
    error &&
    typeof error === "object" &&
    "kind" in error &&
    ((error as { kind: string }).kind === "transient" ||
      (error as { kind: string }).kind === "permanent")
  ) {
    return (error as { kind: FailureKind }).kind;
  }
  if (error instanceof TypeError) return "transient";
  const msg = error instanceof Error ? error.message : String(error);
  if (/timeout|timed out|ECONNRESET|ENOTFOUND|EAI_AGAIN|fetch failed|network/i.test(msg)) {
    return "transient";
  }
  return "unknown";
}
