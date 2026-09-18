import type { NextRequest } from "next/server";
import { publishHandler } from "@/app/api/posts/[id]/handlers";

/** Publish Now — masuk queue segera. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return publishHandler(id);
}
