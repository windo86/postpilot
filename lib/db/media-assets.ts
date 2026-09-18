import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Repository `media_assets`. Menerima client yang sudah dibuat.
 * Pure — tidak ada import `next/*`.
 */

export type MediaAssetStatus = "uploading" | "processing" | "ready" | "failed" | "deleted";

export interface MediaAsset {
  id: string;
  user_id: string;
  storage_bucket: string;
  storage_path: string;
  original_name: string | null;
  media_type: "image" | "video";
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  tags: string[];
  source: "upload" | "ai";
  status: MediaAssetStatus;
  created_at: string;
}

const COLUMNS =
  "id,user_id,storage_bucket,storage_path,original_name,media_type,mime_type,file_size,width,height,duration_seconds,tags,source,status,created_at";

export interface CreateAssetInput {
  userId: string;
  bucket: string;
  path: string;
  originalName: string;
  mediaType: "image" | "video";
  mimeType: string;
  fileSize: number;
}

export async function createAsset(
  client: SupabaseClient,
  input: CreateAssetInput
): Promise<MediaAsset> {
  const { data, error } = await client
    .from("media_assets")
    .insert({
      user_id: input.userId,
      storage_bucket: input.bucket,
      storage_path: input.path,
      original_name: input.originalName,
      media_type: input.mediaType,
      mime_type: input.mimeType,
      file_size: input.fileSize,
      source: "upload",
      status: "uploading",
    })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(`Gagal membuat asset: ${error.message}`);
  return data as MediaAsset;
}

export interface CompleteAssetInput {
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  tags?: string[];
}

export async function completeAsset(
  client: SupabaseClient,
  id: string,
  userId: string,
  input: CompleteAssetInput
): Promise<MediaAsset> {
  const { data, error } = await client
    .from("media_assets")
    .update({
      width: input.width ?? null,
      height: input.height ?? null,
      duration_seconds: input.durationSeconds ?? null,
      tags: input.tags ?? [],
      status: "ready",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select(COLUMNS)
    .single();
  if (error) throw new Error(`Gagal menyelesaikan upload: ${error.message}`);
  return data as MediaAsset;
}

export interface ListAssetsFilter {
  q?: string;
  type?: "image" | "video";
  tag?: string;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
}

export async function listAssets(
  client: SupabaseClient,
  userId: string,
  filter: ListAssetsFilter = {}
): Promise<{ data: MediaAsset[]; total: number; page: number; perPage: number }> {
  const page = Math.max(1, filter.page ?? 1);
  const perPage = Math.min(100, Math.max(1, filter.perPage ?? 24));

  let query = client
    .from("media_assets")
    .select(COLUMNS, { count: "exact" })
    .eq("user_id", userId)
    .neq("status", "deleted")
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (filter.q) {
    query = query.ilike("original_name", `%${filter.q}%`);
  }
  if (filter.type) {
    query = query.eq("media_type", filter.type);
  }
  if (filter.tag) {
    query = query.contains("tags", [filter.tag]);
  }
  if (filter.from) {
    query = query.gte("created_at", filter.from);
  }
  if (filter.to) {
    query = query.lte("created_at", filter.to);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`Gagal memuat media: ${error.message}`);
  return { data: (data ?? []) as MediaAsset[], total: count ?? 0, page, perPage };
}

export async function getAssetById(
  client: SupabaseClient,
  id: string,
  userId: string
): Promise<MediaAsset | null> {
  const { data, error } = await client
    .from("media_assets")
    .select(COLUMNS)
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Gagal memuat asset: ${error.message}`);
  }
  return data as MediaAsset;
}

export async function deleteAsset(
  client: SupabaseClient,
  id: string,
  userId: string
): Promise<void> {
  const { error } = await client
    .from("media_assets")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(`Gagal menghapus asset: ${error.message}`);
}
