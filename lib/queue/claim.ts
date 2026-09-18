import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Wrapper RPC queue (atomic, FOR UPDATE SKIP LOCKED).
 * Pure — tanpa import `next/*`.
 */

export interface ClaimedJob {
  id: string;
  post_platform_id: string;
  scheduled_at: string;
  next_attempt_at: string;
  status: string;
  attempt_count: number;
  locked_at: string | null;
  locked_by: string | null;
}

/** Claim job due. 1 claim = 1 attempt (counter naik di RPC). */
export async function claimDueJobs(
  client: SupabaseClient,
  workerId: string,
  limit = 5
): Promise<ClaimedJob[]> {
  const { data, error } = await client.rpc("claim_due_jobs", {
    p_worker_id: workerId,
    p_limit: limit,
  });
  if (error) throw new Error(`Queue claim gagal: ${error.message}`);
  return (data ?? []) as ClaimedJob[];
}

/** Kembalikan job stale ke pending (atau failed bila attempt habis). */
export async function recoverStaleJobs(
  client: SupabaseClient,
  leaseSeconds = 300,
  maxAttempts = 3
): Promise<number> {
  const { data, error } = await client.rpc("recover_stale_jobs", {
    p_lease_seconds: leaseSeconds,
    p_max_attempts: maxAttempts,
  });
  if (error) throw new Error(`Stale recovery gagal: ${error.message}`);
  return (data as number) ?? 0;
}
