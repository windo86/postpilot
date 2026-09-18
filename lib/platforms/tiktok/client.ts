/**
 * TikTok Login Kit v2 — OAuth + token lifecycle.
 * Referensi: developers.tiktok.com (Login Kit web, diverifikasi Sep 2026).
 * Pure — tidak ada import `next/*`. Config di-pass eksplisit (env dibaca di route).
 *
 * Catatan: refresh_token berumur 365 hari dan bisa ter-rotasi —
 * selalu simpan token baru bila response berbeda (ditangani di sini via return).
 */

const AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const REVOKE_URL = "https://open.tiktokapis.com/v2/oauth/revoke/";

export interface TikTokOAuthConfig {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface TikTokTokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
  platformAccountId: string; // open_id
  scopes: string[];
}

function requireConfig(cfg: TikTokOAuthConfig): void {
  if (!cfg.clientKey || !cfg.clientSecret || !cfg.redirectUri) {
    throw new Error(
      "TikTok OAuth belum dikonfigurasi (TIKTOK_CLIENT_KEY/SECRET/REDIRECT_URI)."
    );
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as {
      error?: string;
      error_description?: string;
    };
    const msg = body.error_description ?? body.error ?? JSON.stringify(body);
    return String(msg).slice(0, 300);
  } catch {
    return `HTTP ${res.status}`;
  }
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  open_id: string;
  scope: string;
  expires_in: number;
  refresh_expires_in: number;
}

function toTokenSet(body: TokenResponse): TikTokTokenSet {
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: new Date(Date.now() + body.expires_in * 1000),
    refreshExpiresAt: new Date(Date.now() + body.refresh_expires_in * 1000),
    platformAccountId: body.open_id,
    scopes: body.scope.split(",").map((s) => s.trim()).filter(Boolean),
  };
}

/** URL otorisasi Login Kit v2. */
export function buildTikTokAuthorizeUrl(
  cfg: TikTokOAuthConfig,
  state: string
): string {
  requireConfig(cfg);
  const params = new URLSearchParams({
    client_key: cfg.clientKey,
    scope: cfg.scopes.join(","),
    response_type: "code",
    redirect_uri: cfg.redirectUri,
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

/** Tukar authorization code → access + refresh token + open_id. */
export async function exchangeTikTokCode(
  cfg: TikTokOAuthConfig,
  code: string
): Promise<TikTokTokenSet> {
  requireConfig(cfg);

  const form = new URLSearchParams({
    client_key: cfg.clientKey,
    client_secret: cfg.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: cfg.redirectUri,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!res.ok) {
    throw new Error(`TikTok code exchange gagal: ${await readError(res)}`);
  }
  return toTokenSet((await res.json()) as TokenResponse);
}

/**
 * Refresh access token (24 jam). TikTok bisa me-rotasi refresh_token —
 * panggil fungsi ini lalu SIMPAN SELURUH hasilnya (T-11).
 * `invalid_grant` = refresh token mati → user harus connect ulang.
 */
export async function refreshTikTokToken(
  cfg: TikTokOAuthConfig,
  refreshToken: string
): Promise<TikTokTokenSet> {
  requireConfig(cfg);

  const form = new URLSearchParams({
    client_key: cfg.clientKey,
    client_secret: cfg.clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!res.ok) {
    throw new Error(`TikTok token refresh gagal: ${await readError(res)}`);
  }
  return toTokenSet((await res.json()) as TokenResponse);
}

/** Cabut token saat disconnect (best-effort — gagal tidak menggagalkan disconnect). */
export async function revokeTikTokToken(
  cfg: TikTokOAuthConfig,
  accessToken: string
): Promise<void> {
  const form = new URLSearchParams({
    client_key: cfg.clientKey,
    client_secret: cfg.clientSecret,
    token: accessToken,
  });
  await fetch(REVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
}
