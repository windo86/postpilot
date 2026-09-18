import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPostDetail } from "@/lib/db/posts";
import {
  cancelPost,
  getCalendarItems,
  publishNow,
  scheduleTargets,
  validateScheduledAt,
} from "@/lib/db/schedule";

async function ownedPost(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, postId: string) {
  const detail = await getPostDetail(supabase, postId, userId);
  return detail;
}

const scheduleSchema = z.object({
  /** ISO datetime lokal + offset (diproduksi dari input datetime-local + timezone). */
  scheduledAt: z.string().datetime({ offset: true }),
  timezone: z.string().min(1).max(100),
  platformIds: z.array(z.string().uuid()).optional(),
});

/** Jadwalkan post (validasi 1 jam–30 hari). */
export async function scheduleHandler(
  request: NextRequest,
  postId: string
): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await ownedPost(supabase, user.id, postId))) {
    return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });
  }

  const body = scheduleSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }
  const when = new Date(body.data.scheduledAt);
  const violation = validateScheduledAt(when);
  if (violation) {
    return NextResponse.json({ error: violation }, { status: 400 });
  }

  try {
    await scheduleTargets(supabase, {
      userId: user.id,
      postId,
      platformIds: body.data.platformIds,
      scheduledAt: when,
      timezone: body.data.timezone,
    });
    return NextResponse.json({ ok: true, scheduledAt: when.toISOString() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** Publish Now — antre segera tanpa aturan minimal. */
export async function publishHandler(postId: string): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await ownedPost(supabase, user.id, postId))) {
    return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });
  }
  try {
    await publishNow(supabase, user.id, postId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** Batalkan post yang belum diproses. */
export async function cancelHandler(postId: string): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await ownedPost(supabase, user.id, postId))) {
    return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });
  }
  await cancelPost(supabase, user.id, postId);
  return NextResponse.json({ ok: true });
}

export { getCalendarItems };
