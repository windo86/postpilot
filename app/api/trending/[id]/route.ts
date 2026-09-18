import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { deleteTrending, updateTrending } from "@/lib/db/trending";

const trendingSchema = z.object({
  keyword: z.string().trim().min(1).max(200),
  source: z.string().trim().max(100).nullish(),
  sourceUrl: z.string().trim().url("URL sumber tidak valid").max(500).nullish().or(z.literal("")),
  capturedAt: z.string().datetime({ offset: true }).nullish(),
  expiresAt: z.string().datetime({ offset: true }).nullish(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = trendingSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }
  const { id } = await params;
  try {
    const updated = await updateTrending(supabase, user.id, id, {
      ...body.data,
      sourceUrl: body.data.sourceUrl || null,
    });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteTrending(supabase, user.id, id);
  return NextResponse.json({ ok: true });
}
