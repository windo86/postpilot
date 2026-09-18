import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createApiKey, listApiKeys } from "@/lib/auth/api-keys";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await listApiKeys(supabase, user.id) });
}

const createSchema = z.object({ name: z.string().trim().min(1).max(100) });

/** Buat key — raw key hanya muncul di response ini sekali. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }
  const { meta, rawKey } = await createApiKey(supabase, user.id, body.data.name);
  return NextResponse.json({ meta, rawKey }, { status: 201 });
}
