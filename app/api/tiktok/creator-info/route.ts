import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decrypt } from "@/lib/crypto";
import { getConnectionById, getConnectionSecrets } from "@/lib/db/connected-accounts";
import { fetchCreatorInfo } from "@/lib/platforms/tiktok/publish";

/**
 * Creator info TikTok terbaru untuk satu akun (privacy options dinamis,
 * max durasi, nickname). Sekaligus mengisi username/display name yang
 * kosong sejak connect. Rate limit TikTok: 20/menit.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accountId = new URL(request.url).searchParams.get("accountId");
  if (!accountId) return NextResponse.json({ error: "accountId wajib" }, { status: 400 });

  const conn = await getConnectionById(supabase, accountId, user.id);
  if (!conn || conn.platform !== "tiktok") {
    return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
  }
  const secrets = await getConnectionSecrets(supabase, accountId, user.id);
  if (!secrets?.accessTokenEncrypted) {
    return NextResponse.json({ error: "Token tidak tersedia — reconnect" }, { status: 400 });
  }

  try {
    const info = await fetchCreatorInfo(decrypt(secrets.accessTokenEncrypted));
    // Simpan nickname agar UI konsisten.
    if (info.nickname) {
      const service = createServiceClient();
      await service
        .from("connected_accounts")
        .update({
          username: info.nickname,
          display_name: info.nickname,
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId)
        .eq("user_id", user.id);
    }
    return NextResponse.json(info);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
