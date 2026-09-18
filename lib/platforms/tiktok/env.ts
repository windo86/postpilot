import type { TikTokOAuthConfig } from "./client";

const DEFAULT_SCOPES = ["user.info.basic", "video.upload", "video.publish"];

/**
 * Config dari env. Redirect URI default diturunkan dari NEXT_PUBLIC_APP_URL
 * (tidak ada hardcoded localhost). Pure — tanpa import `next/*`.
 */
export function tiktokConfigFromEnv(): TikTokOAuthConfig {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return {
    clientKey: process.env.TIKTOK_CLIENT_KEY ?? "",
    clientSecret: process.env.TIKTOK_CLIENT_SECRET ?? "",
    redirectUri:
      process.env.TIKTOK_REDIRECT_URI ||
      `${appUrl}/api/accounts/tiktok/callback`,
    scopes: (process.env.TIKTOK_SCOPES ?? DEFAULT_SCOPES.join(","))
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}
