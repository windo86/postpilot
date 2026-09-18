import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/", "/login", "/register", "/reset-password", "/update-password", "/terms", "/privacy", "/api/health"];
const PUBLIC_PREFIXES = ["/terms/", "/privacy/"]; // file verifikasi platform

/**
 * Auth guard: semua route butuh sesi, kecuali halaman auth publik
 * dan callback OAuth. User login yang buka /login|/register → ke "/".
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabaseResponse, user } = await updateSession(request);

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) ||
    (/^\/tiktok[^/]*\.txt$/.test(pathname)) || // file verifikasi root (TikTok)
    pathname.startsWith("/auth/");

  // Automation API bawa auth sendiri (API key) — lewatkan tanpa sesi.
  const isKeyAuthenticated =
    pathname.startsWith("/api/v1/") || pathname.startsWith("/api/webhooks/");

  if (!user) {
    // API: kembalikan 401 JSON (jangan redirect — client API butuh status mesin).
    // v1 memakai API key sendiri; /api/* lain dicek sesi di route masing-masing.
    // Kecuali path API yang memang publik (mis. /api/health).
    if (pathname.startsWith("/api/") && !isKeyAuthenticated && !isPublic) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isPublic && !isKeyAuthenticated) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
