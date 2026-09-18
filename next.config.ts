import type { NextConfig } from "next";

// Izinkan dev server diakses lewat tunnel (ngrok/dsb) agar _next/* assets,
// RSC payload, dan navigasi client-side tidak diblokir origin check.
// Host diambil dari NEXT_PUBLIC_APP_URL supaya ikut berubah saat URL tunnel ganti.
const appHostname = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_APP_URL;
    return url ? [new URL(url).hostname] : [];
  } catch {
    return [];
  }
})();

const nextConfig: NextConfig = {
  allowedDevOrigins: appHostname,
  async headers() {
    // Header keamanan dasar. CSP penuh ditunda (risiko blokir inline
    // script Next) — dievaluasi saat production readiness (T-21).
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
    ];
    return [{ source: "/:path*", headers: security }];
  },
};

export default nextConfig;
