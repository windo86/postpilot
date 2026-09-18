import { NextResponse, type NextRequest } from "next/server";
import { authenticateV1 } from "@/app/api/v1/auth";
import { getPostDetail } from "@/lib/db/posts";

/** Status post (automation). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateV1(_request);
  if ("response" in auth) return auth.response;
  const { service, userId } = auth.ctx;
  const { id } = await params;
  const detail = await getPostDetail(service, id, userId);
  if (!detail) return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });
  return NextResponse.json(detail);
}
