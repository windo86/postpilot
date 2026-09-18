import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import { authenticateV1 } from "@/app/api/v1/auth";
import { createPostWithValidation, getPostDetail } from "@/lib/db/posts";

const targetSchema = z.object({
  connectedAccountId: z.string().uuid(),
  platform: z.enum(["instagram", "tiktok"]),
  caption: z.string().max(2200).nullish(),
  hashtags: z.array(z.string().min(1).max(100)).max(30).default([]),
  commercialDisclosure: z.boolean().default(false),
  privacyLevel: z.string().max(50).nullish(),
});

const createSchema = z.object({
  title: z.string().max(200).nullish(),
  targets: z.array(targetSchema).min(1).max(10),
  mediaIds: z.array(z.string().uuid()).min(1).max(10),
});

/**
 * Buat post draft via automation. Idempotency-Key: request ulang dengan
 * key sama → kembalikan post yang sudah ada (tanpa duplikat).
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateV1(request);
  if ("response" in auth) return auth.response;
  const { service, userId } = auth.ctx;

  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }

  const idemKey = request.headers.get("Idempotency-Key")?.trim();
  if (idemKey) {
    const keyHash = createHash("sha256").update(`${userId}:${idemKey}`, "utf8").digest("hex");
    const { data: existing } = await service
      .from("api_idempotency_keys")
      .select("post_id")
      .eq("key_hash", keyHash)
      .single();
    if (existing) {
      const detail = await getPostDetail(service, (existing as { post_id: string }).post_id, userId);
      return NextResponse.json({ postId: (existing as { post_id: string }).post_id, ...(detail ?? {}), deduped: true });
    }
  }

  try {
    const result = await createPostWithValidation(service, userId, {
      title: body.data.title,
      targets: body.data.targets,
      mediaIds: body.data.mediaIds,
    });
    if (idemKey) {
      const keyHash = createHash("sha256").update(`${userId}:${idemKey}`, "utf8").digest("hex");
      await service.from("api_idempotency_keys").insert({
        user_id: userId,
        key_hash: keyHash,
        post_id: result.postId,
      });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message.replace(/^(Post|Media|Akun): /, "") },
      { status: 400 }
    );
  }
}
