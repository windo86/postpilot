import { NextResponse, type NextRequest } from "next/server";
import { TIKTOK_VERIFICATION_FILES } from "@/lib/legal/verification";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const content = TIKTOK_VERIFICATION_FILES[filename];
  if (!content) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
