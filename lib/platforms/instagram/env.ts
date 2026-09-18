import type { InstagramOAuthConfig } from "./client";

const DEFAULT_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
];

/**
 * Config dari env. Redirect URI default diturunkan dari NEXT_PUBLIC_APP_URL
 * (tidak ada hardcoded localhost). Pure — tanpa import `next/*`.
 */
export function instagramConfigFromEnv(): InstagramOAuthConfig {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return {
    clientId: process.env.INSTAGRAM_CLIENT_ID ?? "",
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET ?? "",
    redirectUri:
      process.env.INSTAGRAM_REDIRECT_URI ||
      `${appUrl}/api/accounts/instagram/callback`,
    scopes: (process.env.INSTAGRAM_SCOPES ?? DEFAULT_SCOPES.join(","))
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}
