import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { deleteAsset, getAssetById } from "@/lib/db/media-assets";

/** Hapus asset: cek milik sendiri → hapus object Storage → hapus row. */
export async function DELETE(
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
  const { error: storageError } = await service.storage
    .from(asset.storage_bucket)
    .remove([asset.storage_path]);
  // Object hilang duluan bukan error fatal — row tetap dibersihkan.
  if (storageError && !/not found|does not exist/i.test(storageError.message)) {
    return NextResponse.json(
      { error: `Gagal hapus file: ${storageError.message}` },
      { status: 500 }
    );
  }

  await deleteAsset(supabase, id, user.id);
  return NextResponse.json({ ok: true });
}
