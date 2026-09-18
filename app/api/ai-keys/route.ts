import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAIKey, listAIKeys } from "@/lib/db/ai-keys";

const createSchema = z.object({
  provider: z.enum(["openai", "google"]),
  label: z.string().trim().max(100).nullish(),
  key: z.string().min(8).max(500),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await listAIKeys(supabase, user.id) });
}

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
  try {
    const created = await createAIKey(supabase, user.id, {
      provider: body.data.provider,
      label: body.data.label,
      rawKey: body.data.key,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
