import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAssetById } from "@/lib/db/media-assets";

/** Signed URL preview (120 detik). Kepemilikan dicek dulu via RLS. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const asset = await getAssetById(supabase, id, user.id);
  if (!asset) {
    return NextResponse.json({ error: "Asset tidak ditemukan" }, { status: 404 });
  }

  const service = createServiceClient();
  const { data, error } = await service.storage
    .from(asset.storage_bucket)
    .createSignedUrl(asset.storage_path, 120);
  if (error || !data) {
    return NextResponse.json(
      { error: `Gagal membuat preview: ${error?.message ?? "unknown"}` },
      { status: 500 }
    );
  }
  return NextResponse.json({ url: data.signedUrl });
}
