import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import {
  checkApiKeyRateLimit,
  extractApiKey,
  hashApiKey,
  verifyApiKey,
} from "@/lib/auth/api-keys";

/**
 * Auth Automation API v1: API key via `Authorization: Bearer` / `x-api-key`.
 * Rate limit per key (429 + Retry-After). Return service client + userId.
 */

export interface V1Context {
  service: SupabaseClient;
  userId: string;
}

export async function authenticateV1(
  request: Request
): Promise<{ ctx: V1Context } | { response: NextResponse }> {
  const raw = extractApiKey(request);
  if (!raw) {
    return {
      response: NextResponse.json({ error: "API key hilang (Bearer / x-api-key)" }, { status: 401 }),
    };
  }
  const service = createServiceClient();
  const verified = await verifyApiKey(service, raw);
  if (!verified) {
    return {
      response: NextResponse.json({ error: "API key tidak valid / revoked / expired" }, { status: 401 }),
    };
  }
  const limit = checkApiKeyRateLimit(hashApiKey(raw));
  if (!limit.allowed) {
    return {
      response: NextResponse.json({ error: "Rate limit terlampaui" }, {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSec) },
      }),
    };
  }
  return { ctx: { service, userId: verified.userId } };
}
