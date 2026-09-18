import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { exchangeTikTokCode } from "@/lib/platforms/tiktok/client";
import { tiktokConfigFromEnv } from "@/lib/platforms/tiktok/env";
import { isValidStateToken } from "@/lib/platforms/oauth-state";
import { upsertConnection } from "@/lib/db/connected-accounts";

const STATE_COOKIE = "pp_oauth_state_tt";

function fail(origin: string, slug: string) {
  const res = NextResponse.redirect(`${origin}/accounts?error=${slug}`);
  res.cookies.delete(STATE_COOKIE);
  return res;
}

/** Callback OAuth TikTok: verifikasi state → tukar code → simpan token terenkripsi. */
export async function GET(request: NextRequest) {
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
    return fail(origin, "denied");
  }

  try {
    const cfg = tiktokConfigFromEnv();
    const tokens = await exchangeTikTokCode(cfg, code);

    await upsertConnection(supabase, {
      userId: user.id,
      platform: "tiktok",
      platformAccountId: tokens.platformAccountId,
      accessTokenEncrypted: encrypt(tokens.accessToken),
      refreshTokenEncrypted: encrypt(tokens.refreshToken),
      tokenExpiresAt: tokens.expiresAt,
      scopes: tokens.scopes,
      // Username/display name diisi dari creator_info saat publish (T-10).
      metadata: { refresh_expires_at: tokens.refreshExpiresAt.toISOString() },
    });
  } catch {
    return fail(origin, "exchange");
  }

  const res = NextResponse.redirect(`${origin}/accounts?connected=tiktok`);
  res.cookies.delete(STATE_COOKIE);
  return res;
}
