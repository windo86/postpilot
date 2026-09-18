import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Notifikasi in-app (tabel `notifications`). UI bell menyusul (T-19).
 * Pure — tanpa import `next/*`.
 */

export interface NotificationInput {
  userId: string;
  title: string;
  message: string;
  type: string;
  channel?: "in_app" | "email";
}

export async function createNotification(
  client: SupabaseClient,
  input: NotificationInput
): Promise<void> {
  const { error } = await client.from("notifications").insert({
    user_id: input.userId,
    title: input.title,
    message: input.message,
    type: input.type,
    channel: input.channel ?? "in_app",
  });
  if (error) {
    // Notifikasi gagal tidak boleh menggagalkan worker — catat saja.
    console.error(`[notify] gagal simpan notifikasi: ${error.message}`);
  }
}

export interface NotifyPrefs {
  inApp: boolean;
  email: boolean;
}

/** Preferensi user (default nyala bila profile belum ada). */
export async function getNotifyPrefs(
  client: SupabaseClient,
  userId: string
): Promise<NotifyPrefs> {
  const { data } = await client
    .from("profiles")
    .select("email_notifications_enabled,in_app_notifications_enabled")
    .eq("id", userId)
    .single();
  const row = (data ?? {}) as {
    email_notifications_enabled?: boolean | null;
    in_app_notifications_enabled?: boolean | null;
  };
  return {
    inApp: row.in_app_notifications_enabled ?? true,
    email: row.email_notifications_enabled ?? true,
  };
}
