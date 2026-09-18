import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  buildStoragePath,
  mediaConfigFromEnv,
  validateUploadFile,
} from "@/lib/media/config";
import { createAsset } from "@/lib/db/media-assets";

const authorizeSchema = z.object({
  filename: z.string().min(1).max(255),
  mime: z.string().min(1).max(127),
  size: z.number().int().positive(),
});

/**
 * Otorisasi upload: validasi user + format + ukuran, buat path kanonis
 * + row `uploading`, kembalikan instruksi upload langsung ke Storage.
 * - File kecil → signed URL (PUT sekali).
 * - File ≥ threshold → TUS resumable (browser pakai user JWT-nya sendiri).
 * Browser TIDAK PERNAH menerima service-role key.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = authorizeSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0].message },
      { status: 400 }
    );
  }

  const cfg = mediaConfigFromEnv();
  const checked = validateUploadFile(body.data.mime, body.data.size, cfg);
  if (!checked.ok || !checked.mediaType) {
    return NextResponse.json({ error: checked.error }, { status: 400 });
  }

  const path = buildStoragePath({
    userId: user.id,
    uuid: randomUUID(),
    filename: body.data.filename,
  });

  const asset = await createAsset(supabase, {
    userId: user.id,
    bucket: cfg.bucket,
    path,
    originalName: body.data.filename,
    mediaType: checked.mediaType,
    mimeType: body.data.mime,
    fileSize: body.data.size,
  });

  if (body.data.size >= cfg.tusThresholdBytes) {
    return NextResponse.json({
      assetId: asset.id,
      mode: "tus",
      bucket: cfg.bucket,
      path,
    });
  }

  const service = createServiceClient();
  const { data, error } = await service.storage
    .from(cfg.bucket)
    .createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json(
      { error: `Gagal membuat upload URL: ${error?.message ?? "unknown"}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    assetId: asset.id,
    mode: "signed",
    bucket: cfg.bucket,
    path,
    token: data.token,
  });
}
