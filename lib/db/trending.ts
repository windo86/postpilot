import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Repository `trending_topics` (input manual). Pure — tanpa import `next/*`.
 */

export interface TrendingTopic {
  id: string;
  keyword: string;
  source: string | null;
  source_url: string | null;
  captured_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const COLUMNS = "id,keyword,source,source_url,captured_at,expires_at,created_at";

export async function listTrending(
  client: SupabaseClient,
  userId: string,
  opts: { q?: string; page?: number; perPage?: number } = {}
): Promise<{ data: TrendingTopic[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(100, Math.max(1, opts.perPage ?? 20));
  let query = client
    .from("trending_topics")
    .select(COLUMNS, { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);
  if (opts.q) query = query.ilike("keyword", `%${opts.q}%`);
  const { data, error, count } = await query;
  if (error) throw new Error(`Gagal memuat trending: ${error.message}`);
  return { data: (data ?? []) as TrendingTopic[], total: count ?? 0 };
}

export interface TrendingInput {
  keyword: string;
  source?: string | null;
  sourceUrl?: string | null;
  capturedAt?: string | null;
  expiresAt?: string | null;
}

export async function createTrending(
  client: SupabaseClient,
  userId: string,
  input: TrendingInput
): Promise<TrendingTopic> {
  const { data, error } = await client
    .from("trending_topics")
    .insert({
      user_id: userId,
      keyword: input.keyword,
      source: input.source ?? null,
      source_url: input.sourceUrl ?? null,
      captured_at: input.capturedAt ?? null,
      expires_at: input.expiresAt ?? null,
    })
    .select(COLUMNS)
    .single();
  if (error || !data) throw new Error(`Gagal menyimpan trending: ${error?.message ?? "unknown"}`);
  return data as TrendingTopic;
}

export async function updateTrending(
  client: SupabaseClient,
  userId: string,
  id: string,
  input: TrendingInput
): Promise<TrendingTopic> {
  const { data, error } = await client
    .from("trending_topics")
    .update({
      keyword: input.keyword,
      source: input.source ?? null,
      source_url: input.sourceUrl ?? null,
      captured_at: input.capturedAt ?? null,
      expires_at: input.expiresAt ?? null,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select(COLUMNS)
    .single();
  if (error || !data) throw new Error(`Gagal update trending: ${error?.message ?? "tidak ditemukan"}`);
  return data as TrendingTopic;
}

export async function deleteTrending(
  client: SupabaseClient,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await client
    .from("trending_topics")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(`Gagal hapus trending: ${error.message}`);
}
