import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/** Baca profil ringkas (timezone + preferensi notifikasi). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabase
    .from("profiles")
    .select("timezone,email_notifications_enabled,in_app_notifications_enabled")
    .eq("id", user.id)
    .single();
  const row = (data ?? {}) as {
    timezone?: string | null;
    email_notifications_enabled?: boolean | null;
    in_app_notifications_enabled?: boolean | null;
  };
  return NextResponse.json({
    timezone: row.timezone ?? null,
    emailNotifications: row.email_notifications_enabled ?? true,
    inAppNotifications: row.in_app_notifications_enabled ?? true,
  });
}

const putSchema = z.object({
  timezone: z.string().min(1).max(100).optional(),
  emailNotifications: z.boolean().optional(),
  inAppNotifications: z.boolean().optional(),
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
  const patch: {
    timezone?: string;
    email_notifications_enabled?: boolean;
    in_app_notifications_enabled?: boolean;
  } = {};
  if (body.data.timezone !== undefined) {
    try {
      // Validasi IANA timezone sungguhan.
      Intl.DateTimeFormat(undefined, { timeZone: body.data.timezone });
    } catch {
      return NextResponse.json({ error: "Timezone tidak dikenal" }, { status: 400 });
    }
    patch.timezone = body.data.timezone;
  }
  if (body.data.emailNotifications !== undefined) {
    patch.email_notifications_enabled = body.data.emailNotifications;
  }
  if (body.data.inAppNotifications !== undefined) {
    patch.in_app_notifications_enabled = body.data.inAppNotifications;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Tidak ada field" }, { status: 400 });
  }
  const { error } = await supabase.from("profiles").upsert(
    { id: user.id, ...patch, updated_at: new Date().toISOString() },
    { onConflict: "id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
