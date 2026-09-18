import { Resend } from "resend";

/**
 * Email notifikasi failure via Resend. Dilewati (skip) bila RESEND_API_KEY
 * belum di-set — worker tetap jalan, notifikasi in-app tetap dibuat.
 * Pure — tanpa import `next/*`.
 */

export interface FailureEmail {
  to: string;
  subject: string;
  text: string;
}

export async function sendFailureEmail(
  email: FailureEmail
): Promise<{ sent: boolean; skipped?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { sent: false, skipped: "RESEND_API_KEY belum di-set" };
  }
  const from = process.env.EMAIL_FROM || "PostPilot <noreply@postpilot.app>";
  try {
    await new Resend(key).emails.send({
      from,
      to: email.to,
      subject: email.subject,
      text: email.text,
    });
    return { sent: true };
  } catch (e) {
    console.error(`[notify] email gagal: ${(e as Error).message}`);
    return { sent: false, skipped: (e as Error).message };
  }
}
