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
};

export default nextConfig;
