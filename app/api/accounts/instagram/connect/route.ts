import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildInstagramAuthorizeUrl } from "@/lib/platforms/instagram/client";
import { instagramConfigFromEnv } from "@/lib/platforms/instagram/env";
import { createStateToken } from "@/lib/platforms/oauth-state";

const STATE_COOKIE = "pp_oauth_state_ig";

/** Mulai OAuth Instagram: set state cookie anti-CSRF lalu redirect ke Meta. */
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
    authorizeUrl = buildInstagramAuthorizeUrl(instagramConfigFromEnv(), state);
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
