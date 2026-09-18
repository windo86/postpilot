import { randomBytes } from "node:crypto";

/**
 * OAuth `state` anti-CSRF untuk connect/callback Instagram & TikTok.
 * Token acak disimpan di cookie httpOnly (10 menit), dibandingkan saat callback.
 * Pure — tidak ada import `next/*`.
 */

const STATE_BYTES = 32;

export function createStateToken(): string {
  return randomBytes(STATE_BYTES).toString("hex");
}

export function isValidStateToken(value: string | null | undefined): value is string {
  return (
    typeof value === "string" &&
    value.length === STATE_BYTES * 2 &&
    /^[0-9a-f]+$/.test(value)
  );
}
