import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { revokeTikTokToken } from "@/lib/platforms/tiktok/client";
import { tiktokConfigFromEnv } from "@/lib/platforms/tiktok/env";
import {
  disconnectConnection,
  getConnectionById,
  getConnectionSecrets,
} from "@/lib/db/connected-accounts";

/**
 * Disconnect akun: revoke di provider (best-effort) + NULL-kan token
 * + status 'disconnected'. Row dipertahankan (dipakai post_platforms).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const { id } = await params;
  const conn = await getConnectionById(supabase, id, user.id);
  if (!conn) {
    return NextResponse.redirect(`${origin}/accounts?error=not_found`);
  }

  if (conn.platform === "tiktok") {
    try {
      const secrets = await getConnectionSecrets(supabase, id, user.id);
      if (secrets?.accessTokenEncrypted) {
        await revokeTikTokToken(
          tiktokConfigFromEnv(),
          decrypt(secrets.accessTokenEncrypted)
        );
      }
    } catch {
      // Best-effort: revoke gagal tidak menggagalkan disconnect lokal.
    }
  }

  await disconnectConnection(supabase, id, user.id);
  return NextResponse.redirect(`${origin}/accounts?disconnected=1`);
}
