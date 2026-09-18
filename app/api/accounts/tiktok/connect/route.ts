import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildTikTokAuthorizeUrl } from "@/lib/platforms/tiktok/client";
import { tiktokConfigFromEnv } from "@/lib/platforms/tiktok/env";
import { createStateToken } from "@/lib/platforms/oauth-state";

const STATE_COOKIE = "pp_oauth_state_tt";

/** Mulai OAuth TikTok: set state cookie anti-CSRF lalu redirect ke TikTok. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
  }

  const state = createStateToken();
  let authorizeUrl: string;
  try {
    authorizeUrl = buildTikTokAuthorizeUrl(tiktokConfigFromEnv(), state);
  } catch {
    return NextResponse.redirect(
      new URL("/accounts?error=config", process.env.NEXT_PUBLIC_APP_URL)
    );
  }

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
