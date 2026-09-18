import type { NextRequest } from "next/server";
import { handleInstagramCallback } from "@/app/api/accounts/instagram/callback/handler";

/**
 * Alias callback OAuth Instagram — cocok dengan redirect URI yang
 * terdaftar di Meta App Dashboard. Handler & state cookie sama.
 */
export async function GET(request: NextRequest) {
  return handleInstagramCallback(request);
}
