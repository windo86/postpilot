import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createTrending, listTrending } from "@/lib/db/trending";

const trendingSchema = z.object({
  keyword: z.string().trim().min(1).max(200),
  source: z.string().trim().max(100).nullish(),
  sourceUrl: z.string().trim().url("URL sumber tidak valid").max(500).nullish().or(z.literal("")),
  capturedAt: z.string().datetime({ offset: true }).nullish(),
  expiresAt: z.string().datetime({ offset: true }).nullish(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const result = await listTrending(supabase, user.id, {
    q: params.get("q") ?? undefined,
    page: Number(params.get("page") ?? 1),
    perPage: Number(params.get("perPage") ?? 20),
  });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = trendingSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });
  }
  const created = await createTrending(supabase, user.id, {
    ...body.data,
    sourceUrl: body.data.sourceUrl || null,
  });
  return NextResponse.json(created, { status: 201 });
}
