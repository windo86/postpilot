import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { mediaConfigFromEnv, ownerIdFromPath } from "@/lib/media/config";
import { completeAsset, getAssetById } from "@/lib/db/media-assets";

const completeSchema = z.object({
  assetId: z.string().uuid(),
  width: z.number().int().positive().nullish(),
  height: z.number().int().positive().nullish(),
  durationSeconds: z.number().positive().nullish(),
  tags: z.array(z.string().min(1).max(50)).max(20).default([]),
});

/**
 * Selesaikan upload: pastikan object ADA di Storage (via service client),
 * validasi ulang pemilik + ukuran, tandai asset `ready`.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = completeSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0].message },
      { status: 400 }
    );
  }

  const asset = await getAssetById(supabase, body.data.assetId, user.id);
  if (!asset) {
    return NextResponse.json({ error: "Asset tidak ditemukan" }, { status: 404 });
  }
  if (ownerIdFromPath(asset.storage_path) !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verifikasi object benar-benar ter-upload (bukan klaim kosong).
  const service = createServiceClient();
  const { data: objects, error: listError } = await service.storage
    .from(asset.storage_bucket)
    .list(asset.storage_path.split("/").slice(0, -1).join("/"), {
      search: asset.storage_path.split("/").pop(),
    });
  const found = (objects ?? []).find(
    (o) => o.name === asset.storage_path.split("/").pop()
  );
  if (listError || !found) {
    return NextResponse.json(
      { error: "File belum ter-upload ke Storage" },
      { status: 400 }
    );
  }

  const cfg = mediaConfigFromEnv();
  const maxBytes =
    asset.media_type === "image" ? cfg.maxImageBytes : cfg.maxVideoBytes;
  if (
    typeof found.metadata?.size === "number" &&
    found.metadata.size > maxBytes
  ) {
    return NextResponse.json(
      { error: "File di Storage melebihi batas ukuran" },
      { status: 400 }
    );
  }

  const done = await completeAsset(supabase, asset.id, user.id, {
    width: body.data.width,
    height: body.data.height,
    durationSeconds: body.data.durationSeconds,
    tags: body.data.tags,
  });
  return NextResponse.json({ asset: done });
}
