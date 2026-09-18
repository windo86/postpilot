import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authenticateV1 } from "@/app/api/v1/auth";
import { getPostDetail } from "@/lib/db/posts";
import { scheduleTargets, validateScheduledAt } from "@/lib/db/schedule";

const scheduleSchema = z.object({
  scheduledAt: z.string().datetime({ offset: true }),
  timezone: z.string().min(1).max(100).default("UTC"),
  platformIds: z.array(z.string().uuid()).optional(),
});

/** Jadwalkan post via automation. Async → 202 Accepted. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateV1(request);
  if ("response" in auth) return auth.response;
  const { service, userId } = auth.ctx;
  const { id } = await params;
  if (!(await getPostDetail(service, id, userId))) {
    return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });
  }
  const body = scheduleSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }
  const when = new Date(body.data.scheduledAt);
  const violation = validateScheduledAt(when);
  if (violation) return NextResponse.json({ error: violation }, { status: 400 });
  try {
    await scheduleTargets(service, {
      userId,
      postId: id,
      platformIds: body.data.platformIds,
      scheduledAt: when,
      timezone: body.data.timezone,
    });
    return NextResponse.json({ accepted: true, postId: id, scheduledAt: when.toISOString() }, { status: 202 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
