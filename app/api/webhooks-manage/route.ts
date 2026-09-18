import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createWebhook, listWebhooks } from "@/lib/auth/webhooks";

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await listWebhooks(supabase, user.id) });
}

/** Buat endpoint — token & secret hanya muncul di response ini sekali. */
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
  const created = await createWebhook(supabase, user.id, { name: body.data.name });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return NextResponse.json(
    { ...created.meta, endpointUrl: `${appUrl}/api/webhooks/${created.endpointToken}`, signingSecret: created.signingSecret },
    { status: 201 }
  );
}
