import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { checkApiKeyRateLimit } from "@/lib/auth/api-keys";
import {
  decryptSigningSecret,
  findWebhookByToken,
  touchWebhookReceived,
  verifyWebhookSignature,
} from "@/lib/auth/webhooks";
import {
  createPostWithValidation,
  getPostDetail,
} from "@/lib/db/posts";
import { publishNow, scheduleTargets, validateScheduledAt } from "@/lib/db/schedule";

const targetSchema = z.object({
  connectedAccountId: z.string().uuid(),
  platform: z.enum(["instagram", "tiktok"]),
  caption: z.string().max(2200).nullish(),
  hashtags: z.array(z.string().min(1).max(100)).max(30).default([]),
  commercialDisclosure: z.boolean().default(false),
  privacyLevel: z.string().max(50).nullish(),
});

const payloadSchema = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("post.create"),
    eventId: z.string().min(1).max(200),
    data: z.object({
      title: z.string().max(200).nullish(),
      targets: z.array(targetSchema).min(1).max(10),
      mediaIds: z.array(z.string().uuid()).min(1).max(10),
    }),
  }),
  z.object({
    event: z.literal("post.schedule"),
    eventId: z.string().min(1).max(200),
    data: z.object({
      postId: z.string().uuid(),
      scheduledAt: z.string().datetime({ offset: true }),
      timezone: z.string().min(1).max(100).default("UTC"),
      platformIds: z.array(z.string().uuid()).optional(),
    }),
  }),
  z.object({
    event: z.literal("post.publish"),
    eventId: z.string().min(1).max(200),
    data: z.object({ postId: z.string().uuid() }),
  }),
]);

/**
 * Incoming webhook n8n/dsb. Auth: token di path (hash-only) + HMAC body.
 * Idempotent per (webhook, eventId). Async → 202.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const service = createServiceClient();

  const hook = await findWebhookByToken(service, token);
  if (!hook || !hook.active) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const limit = checkApiKeyRateLimit(`wh:${hook.endpoint_token_hash}`);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limit terlampaui" }, {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSec) },
    });
  }

  const raw = await request.text();
  let secret: string;
  try {
    secret = decryptSigningSecret(hook.signing_secret_ciphertext);
  } catch {
    return NextResponse.json({ error: "Webhook rusak — buat ulang" }, { status: 500 });
  }
  if (!verifyWebhookSignature(raw, request.headers.get("x-webhook-signature"), secret)) {
    return NextResponse.json({ error: "Signature tidak valid" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Body bukan JSON valid" }, { status: 400 });
  }
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { event, eventId, data } = parsed.data;
  const userId = hook.user_id;

  // Idempotency per (webhook, eventId).
  const keyHash = createHash("sha256").update(`wh:${hook.id}:${eventId}`, "utf8").digest("hex");
  const { data: seen } = await service
    .from("api_idempotency_keys")
    .select("post_id")
    .eq("key_hash", keyHash)
    .single();
  if (seen) {
    await touchWebhookReceived(service, hook.id);
    return NextResponse.json(
      { postId: (seen as { post_id: string }).post_id, deduped: true, accepted: true },
      { status: 202 }
    );
  }

  try {
    let postId: string;
    if (event === "post.create") {
      const created = await createPostWithValidation(service, userId, {
        title: data.title,
        targets: data.targets,
        mediaIds: data.mediaIds,
      });
      postId = created.postId;
    } else {
      if (!(await getPostDetail(service, data.postId, userId))) {
        return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });
      }
      postId = data.postId;
      if (event === "post.schedule") {
        const when = new Date(data.scheduledAt);
        const violation = validateScheduledAt(when);
        if (violation) return NextResponse.json({ error: violation }, { status: 400 });
        await scheduleTargets(service, {
          userId, postId, platformIds: data.platformIds, scheduledAt: when, timezone: data.timezone,
        });
      } else {
        await publishNow(service, userId, postId);
      }
    }
    await service.from("api_idempotency_keys").insert({
      user_id: userId,
      key_hash: keyHash,
      post_id: postId,
    });
    await touchWebhookReceived(service, hook.id);
    return NextResponse.json({ postId, accepted: true }, { status: 202 });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message.replace(/^(Post|Media|Akun): /, "") },
      { status: 400 }
    );
  }
}
