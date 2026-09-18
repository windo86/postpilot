import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCalendarItems } from "@/lib/db/schedule";

/** Feed kalender: ?from=ISO&to=ISO (default bulan berjalan ±). */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const now = new Date();
  const from = params.get("from") ? new Date(params.get("from")!) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = params.get("to")
    ? new Date(params.get("to")!)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Rentang tanggal tidak valid" }, { status: 400 });
  }
  const items = await getCalendarItems(supabase, user.id, from, to);
  return NextResponse.json({ data: items });
}
