import { NextResponse, type NextRequest } from "next/server";

/**
 * File verifikasi kepemilikan URL TikTok (URL prefix mode).
 * Diunduh dari dashboard TikTok dan di-host apa adanya.
 */
const FILES: Record<string, string> = {
  "tiktokkxHeaY121HS9aXruJX0XOmYjxOlas6vj.txt":
    "tiktok-developers-site-verification=kxHeaY121HS9aXruJX0XOmYjxOlas6vj",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const content = FILES[filename];
  if (!content) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
