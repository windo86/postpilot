import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { listPlatformsWithMetrics } from "@/lib/db/post-metrics";
import { refreshPlatformMetrics } from "@/lib/analytics/refresh";

/** Ringkasan analytics: latest snapshot per published target. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const platform = new URL(request.url).searchParams.get("platform");
  if (platform && platform !== "instagram" && platform !== "tiktok") {
    return NextResponse.json({ error: "Platform tidak valid" }, { status: 400 });
  }
  const service = createServiceClient();
  const data = await listPlatformsWithMetrics(
    service,
    user.id,
    (platform as "instagram" | "tiktok" | undefined) ?? undefined
  );
  return NextResponse.json({ data });
}

const refreshSchema = z.object({
  platformId: z.string().uuid(),
  force: z.boolean().default(false),
});

/** Refresh manual satu target (ownership dicek dulu). */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = refreshSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }

  const service = createServiceClient();
  // Ownership: platform harus milik post milik user.
  const { data: plat } = await service
    .from("post_platforms")
    .select("post_id,posts!inner(user_id)")
    .eq("id", body.data.platformId)
    .single();
  const owner = (plat as unknown as { posts: { user_id: string } } | null)?.posts?.user_id;
  if (owner !== user.id) {
    return NextResponse.json({ error: "Target tidak ditemukan" }, { status: 404 });
  }

  try {
    const outcome = await refreshPlatformMetrics(service, body.data.platformId, {
      force: body.data.force,
    });
    return NextResponse.json(outcome);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
