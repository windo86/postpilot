import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import {
  exchangeInstagramCode,
  fetchInstagramProfile,
} from "@/lib/platforms/instagram/client";
import { instagramConfigFromEnv } from "@/lib/platforms/instagram/env";
import { isValidStateToken } from "@/lib/platforms/oauth-state";
import { upsertConnection } from "@/lib/db/connected-accounts";

const STATE_COOKIE = "pp_oauth_state_ig";

function fail(origin: string, slug: string) {
  const res = NextResponse.redirect(`${origin}/accounts?error=${slug}`);
  res.cookies.delete(STATE_COOKIE);
  return res;
}

/**
 * Handler callback OAuth Instagram — dipakai dua route:
 * - `/api/accounts/instagram/callback` (kanonis, Tech Spec §13)
 * - `/api/instagram/oauth` (kompatibilitas URI yang terdaftar di Meta)
 * Keduanya membaca redirect_uri yang SAMA dari env agar cocok dengan
 * authorize request + code exchange (Meta mencocokkan string persis).
 */
export async function handleInstagramCallback(request: NextRequest) {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const params = new URL(request.url).searchParams;
  const state = params.get("state");
  const expected = request.cookies.get(STATE_COOKIE)?.value;
  if (
    !isValidStateToken(state) ||
    !isValidStateToken(expected) ||
    state !== expected
  ) {
    return fail(origin, "state");
  }

  const code = params.get("code");
  if (!code) {
    return fail(origin, params.get("error") ? "denied" : "code");
  }

  try {
    const cfg = instagramConfigFromEnv();
    let tokens;
    try {
      tokens = await exchangeInstagramCode(cfg, code);
    } catch (e) {
      console.error("[ig-oauth] code exchange gagal:", (e as Error).message);
      return fail(origin, "exchange");
    }
    let profile;
    try {
      profile = await fetchInstagramProfile(tokens.accessToken);
    } catch (e) {
      console.error("[ig-oauth] profile fetch gagal:", (e as Error).message);
      return fail(origin, "exchange");
    }

    await upsertConnection(supabase, {
      userId: user.id,
      platform: "instagram",
      platformAccountId: profile.platformAccountId,
      username: profile.username,
      accessTokenEncrypted: encrypt(tokens.accessToken),
      tokenExpiresAt: tokens.expiresAt,
      scopes: tokens.scopes,
      metadata: { grant: "business_login" },
    });
  } catch {
    return fail(origin, "exchange");
  }

  const res = NextResponse.redirect(`${origin}/accounts?connected=instagram`);
  res.cookies.delete(STATE_COOKIE);
  return res;
}
