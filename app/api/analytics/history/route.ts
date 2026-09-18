import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { listHistory } from "@/lib/db/post-metrics";

/** Riwayat snapshot satu target (milik sendiri) untuk grafik tren. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const platformId = new URL(request.url).searchParams.get("platformId");
  if (!platformId) return NextResponse.json({ error: "platformId wajib" }, { status: 400 });

  const service = createServiceClient();
  const { data: plat } = await service
    .from("post_platforms")
    .select("post_id,posts!inner(user_id)")
    .eq("id", platformId)
    .single();
  const owner = (plat as unknown as { posts: { user_id: string } } | null)?.posts?.user_id;
  if (owner !== user.id) {
    return NextResponse.json({ error: "Target tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: await listHistory(service, platformId) });
}
