import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listConnectionsByUser } from "@/lib/db/connected-accounts";

/** Daftar koneksi milik user untuk pemilih akun (composer, scheduler). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const connections = await listConnectionsByUser(supabase, user.id);
  return NextResponse.json({ data: connections });
}
