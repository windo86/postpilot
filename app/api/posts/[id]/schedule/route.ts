import type { NextRequest } from "next/server";
import { scheduleHandler } from "@/app/api/posts/[id]/handlers";

/** Jadwalkan / reschedule post. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return scheduleHandler(request, id);
}
