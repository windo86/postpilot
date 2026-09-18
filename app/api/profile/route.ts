import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/** Baca/tulis timezone user (dipakai scheduler). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  return NextResponse.json({ timezone: (data?.timezone as string | null) ?? null });
}

const putSchema = z.object({
  timezone: z.string().min(1).max(100),
});

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = putSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }
  try {
    // Validasi IANA timezone sungguhan.
    Intl.DateTimeFormat(undefined, { timeZone: body.data.timezone });
  } catch {
    return NextResponse.json({ error: "Timezone tidak dikenal" }, { status: 400 });
  }
  const { error } = await supabase.from("profiles").upsert(
    { id: user.id, timezone: body.data.timezone, updated_at: new Date().toISOString() },
    { onConflict: "id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
