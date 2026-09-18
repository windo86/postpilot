/**
 * Instagram API with Instagram Login (Business Login) — OAuth + token lifecycle.
 * Referensi: developers.facebook.com/docs/instagram-platform ( diverifikasi Sep 2026 ).
 * Pure — tidak ada import `next/*`. Config di-pass eksplisit (env dibaca di route).
 */

const AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";
const EXCHANGE_URL = "https://api.instagram.com/oauth/access_token";
const LONG_LIVED_URL = "https://graph.instagram.com/access_token";
const REFRESH_URL = "https://graph.instagram.com/refresh_access_token";
const PROFILE_URL = "https://graph.instagram.com/me";

export interface InstagramOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface InstagramTokenSet {
  accessToken: string;
  expiresAt: Date;
  platformAccountId: string;
  scopes: string[];
}

function requireConfig(cfg: InstagramOAuthConfig): void {
  if (!cfg.clientId || !cfg.clientSecret || !cfg.redirectUri) {
    throw new Error(
      "Instagram OAuth belum dikonfigurasi (INSTAGRAM_CLIENT_ID/SECRET/REDIRECT_URI)."
    );
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error_message?: string; error?: unknown };
    if (typeof body.error_message === "string") return body.error_message;
    return JSON.stringify(body).slice(0, 300);
  } catch {
    return `HTTP ${res.status}`;
  }
}

/** URL otorisasi Business Login for Instagram (response_type=code). */
export function buildInstagramAuthorizeUrl(
  cfg: InstagramOAuthConfig,
  state: string
): string {
  requireConfig(cfg);
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: cfg.scopes.join(","),
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Tukar authorization code → short-lived → long-lived (60 hari).
 * Response exchange berisi `user_id` (app-scoped) + permissions granted.
 */
export async function exchangeInstagramCode(
  cfg: InstagramOAuthConfig,
  code: string
): Promise<InstagramTokenSet> {
  requireConfig(cfg);

  const form = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    grant_type: "authorization_code",
    redirect_uri: cfg.redirectUri,
    code,
  });
  const shortRes = await fetch(EXCHANGE_URL, { method: "POST", body: form });
  if (!shortRes.ok) {
    throw new Error(`Instagram code exchange gagal: ${await readError(shortRes)}`);
  }
  const short = (await shortRes.json()) as {
    access_token: string;
    user_id: string | number;
    permissions?: string;
  };

  const longParams = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: cfg.clientSecret,
    access_token: short.access_token,
  });
  const longRes = await fetch(`${LONG_LIVED_URL}?${longParams.toString()}`);
  if (!longRes.ok) {
    throw new Error(`Instagram long-lived exchange gagal: ${await readError(longRes)}`);
  }
  const long = (await longRes.json()) as {
    access_token: string;
    expires_in: number;
  };

  return {
    accessToken: long.access_token,
    expiresAt: new Date(Date.now() + long.expires_in * 1000),
    platformAccountId: String(short.user_id),
    scopes: (short.permissions ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  };
}

/** Profil dasar (user_id + username) untuk label akun di UI. */
export async function fetchInstagramProfile(
  accessToken: string
): Promise<{ platformAccountId: string; username: string }> {
  const params = new URLSearchParams({
    fields: "user_id,username",
    access_token: accessToken,
  });
  const res = await fetch(`${PROFILE_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Instagram profile fetch gagal: ${await readError(res)}`);
  }
  const body = (await res.json()) as { user_id: string | number; username: string };
  return { platformAccountId: String(body.user_id), username: body.username };
}

/**
 * Refresh long-lived token (60 hari lagi). Dipanggil worker (T-11)
 * saat token mendekati expiry. Hanya valid bila token ≥24 jam & belum expired.
 */
export async function refreshInstagramToken(
  accessToken: string
): Promise<{ accessToken: string; expiresAt: Date }> {
  const params = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: accessToken,
  });
  const res = await fetch(`${REFRESH_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Instagram token refresh gagal: ${await readError(res)}`);
  }
  const body = (await res.json()) as { access_token: string; expires_in: number };
  return {
    accessToken: body.access_token,
    expiresAt: new Date(Date.now() + body.expires_in * 1000),
  };
}
