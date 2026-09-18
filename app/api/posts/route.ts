import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createPostWithValidation, listPosts } from "@/lib/db/posts";

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
    const result = await createPostWithValidation(supabase, user.id, {
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
