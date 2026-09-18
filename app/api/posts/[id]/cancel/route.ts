import type { NextRequest } from "next/server";
import { cancelHandler } from "@/app/api/posts/[id]/handlers";

/** Batalkan post yang belum diproses. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return cancelHandler(id);
}
