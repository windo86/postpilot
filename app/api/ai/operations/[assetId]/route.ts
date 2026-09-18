import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decrypt } from "@/lib/crypto";
import { getAIKeyCiphertext } from "@/lib/db/ai-keys";
import { createOpenAIProvider } from "@/lib/ai/openai";
import { createGoogleProvider } from "@/lib/ai/google";
import { checkVideoAsset } from "@/lib/ai/operations";

/** Cek status operasi video milik user (finalisasi bila selesai). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assetId } = await params;
  const service = createServiceClient();
  const { data: asset } = await service
    .from("media_assets")
    .select("id,metadata")
    .eq("id", assetId)
    .eq("user_id", user.id)
    .single();
  const meta = (asset as { metadata: { ai_key_id?: string } | null } | null)?.metadata;
  if (!asset || !meta?.ai_key_id) {
    return NextResponse.json({ error: "Operasi tidak ditemukan" }, { status: 404 });
  }
  const key = await getAIKeyCiphertext(service, user.id, meta.ai_key_id);
  if (!key) return NextResponse.json({ error: "API key sudah dihapus" }, { status: 400 });

  const outcome = await checkVideoAsset(
    service,
    [createOpenAIProvider(), createGoogleProvider()],
    assetId,
    decrypt(key.ciphertext)
  );
  return NextResponse.json(outcome);
}
