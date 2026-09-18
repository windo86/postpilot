import { NextResponse, type NextRequest } from "next/server";
import { authenticateV1 } from "@/app/api/v1/auth";
import { listConnectionsByUser } from "@/lib/db/connected-accounts";

/** Daftar akun terhubung (tanpa token) untuk automation. */
export async function GET(request: NextRequest) {
  const auth = await authenticateV1(request);
  if ("response" in auth) return auth.response;
  const { service, userId } = auth.ctx;
  return NextResponse.json({ data: await listConnectionsByUser(service, userId) });
}
