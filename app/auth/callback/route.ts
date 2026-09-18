import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * OAuth callback Supabase Auth (mis. Google bila diaktifkan).
 * Tukar `code` → sesi, lalu redirect ke `next` (default "/").
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Response default: sukses. Diganti ke /login bila exchange gagal.
  let response = NextResponse.redirect(`${origin}${next}`);

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=callback_gagal`);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    response = NextResponse.redirect(`${origin}/login?error=callback_gagal`);
  }

  return response;
}
