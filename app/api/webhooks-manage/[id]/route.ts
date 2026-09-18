import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteWebhook, setWebhookActive } from "@/lib/auth/webhooks";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteWebhook(supabase, user.id, id);
  return NextResponse.json({ ok: true });
}

/** Toggle active: { active: boolean }. */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { active?: boolean } | null;
  await setWebhookActive(supabase, user.id, id, body?.active !== false);
  return NextResponse.json({ ok: true });
}
