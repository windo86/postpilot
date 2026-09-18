import { NextResponse, type NextRequest } from "next/server";
import { authenticateV1 } from "@/app/api/v1/auth";
import { getPostDetail } from "@/lib/db/posts";
import { publishNow } from "@/lib/db/schedule";

/** Masukkan post ke queue sekarang. Async → 202 Accepted. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateV1(_request);
  if ("response" in auth) return auth.response;
  const { service, userId } = auth.ctx;
  const { id } = await params;
  if (!(await getPostDetail(service, id, userId))) {
    return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });
  }
  try {
    await publishNow(service, userId, id);
    return NextResponse.json({ accepted: true, postId: id }, { status: 202 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
