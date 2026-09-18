import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createPost, listPosts } from "@/lib/db/posts";
import { validateInstagramPost } from "@/lib/validators/instagram";
import { validateTikTokPost } from "@/lib/validators/tiktok";
import type { MediaInfo } from "@/lib/validators/common";

const targetSchema = z.object({
  connectedAccountId: z.string().uuid(),
  platform: z.enum(["instagram", "tiktok"]),
  caption: z.string().max(2200).nullish(),
  hashtags: z.array(z.string().min(1).max(100)).max(30).default([]),
  commercialDisclosure: z.boolean().default(false),
  privacyLevel: z.string().max(50).nullish(),
});

const createPostSchema = z.object({
  title: z.string().max(200).nullish(),
  targets: z.array(targetSchema).min(1).max(10),
  mediaIds: z.array(z.string().uuid()).min(1).max(10),
});

/** Buat draft post (parent + target per platform + media). */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = createPostSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    // Validasi platform-aware per target (creator_info TikTok menyusul di worker).
    const { data: mediaRows, error: mediaError } = await supabase
      .from("media_assets")
      .select("id,mime_type,file_size,width,height,duration_seconds")
      .eq("user_id", user.id)
      .in("id", body.data.mediaIds);
    if (mediaError || (mediaRows ?? []).length !== body.data.mediaIds.length) {
      return NextResponse.json(
        { error: "Sebagian media tidak ditemukan" },
        { status: 400 }
      );
    }
    const infos: MediaInfo[] = (mediaRows ?? []).map((m) => ({
      mimeType: (m as { mime_type: string }).mime_type,
      sizeBytes: Number((m as { file_size: number }).file_size),
      width: (m as { width: number | null }).width,
      height: (m as { height: number | null }).height,
      durationSeconds: (m as { duration_seconds: number | null }).duration_seconds,
    }));
    for (const t of body.data.targets) {
      const result =
        t.platform === "instagram"
          ? validateInstagramPost({ media: infos, caption: t.caption, hashtags: t.hashtags })
          : validateTikTokPost({
              media: infos,
              caption: t.caption,
              hashtags: t.hashtags,
              privacyLevel: t.privacyLevel,
              creatorInfo: null, // diambil worker dari creator_info terbaru (T-10)
            });
      if (!result.ok) {
        const first = result.issues[0];
        return NextResponse.json(
          { error: `[${t.platform}] ${first.message}`, issues: result.issues },
          { status: 400 }
        );
      }
    }

    const result = await createPost(supabase, {
      userId: user.id,
      title: body.data.title,
      targets: body.data.targets,
      mediaIds: body.data.mediaIds,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message.replace(/^(Post|Media|Akun): /, "") },
      { status: 400 }
    );
  }
}

/** List post milik user. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const result = await listPosts(
    supabase,
    user.id,
    Number(params.get("page") ?? 1),
    Number(params.get("perPage") ?? 20)
  );
  return NextResponse.json(result);
}
