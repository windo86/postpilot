import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — BYPASS RLS.
 * Modul murni (tanpa `server-only`) agar bisa dipakai worker Node biasa.
 * Untuk kode Next.js, import dari `./service` (dijaga `server-only`).
 * JANGAN import dari Client Components atau kirim key ini ke browser.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
