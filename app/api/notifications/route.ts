import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const listSchema = z.object({
  unread: z.enum(["0", "1"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

/** List notifikasi + jumlah belum dibaca. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = listSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  let query = supabase
    .from("notifications")
    .select("id,title,message,type,channel,read_at,created_at", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(parsed.data.limit);
  if (parsed.data.unread === "1") query = query.is("read_at", null);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { count: unread } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return NextResponse.json({ data: data ?? [], total: count ?? 0, unread: unread ?? 0 });
}
