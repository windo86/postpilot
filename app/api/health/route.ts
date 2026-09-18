import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Health check Render + smoke test manual.
 * Cek: env wajib ada + Supabase terjangkau. Tanpa secret di response.
 */
export async function GET() {
  const missing = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "APP_ENCRYPTION_KEY",
  ].filter((k) => !process.env[k]);

  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, missingEnv: missing },
      { status: 500 }
    );
  }

  try {
    const service = createServiceClient();
    const { error } = await service
      .from("posts")
      .select("id", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, db: "reachable" });
  } catch (e) {
    return NextResponse.json(
      { ok: false, db: (e as Error).message },
      { status: 500 }
    );
  }
}
