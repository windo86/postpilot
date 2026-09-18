import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPostDetail } from "@/lib/db/posts";

/** Detail post + target per platform + media. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const detail = await getPostDetail(supabase, id, user.id);
  if (!detail) {
    return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json(detail);
}
