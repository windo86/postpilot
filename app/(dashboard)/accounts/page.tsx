import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listConnectionsByUser } from "@/lib/db/connected-accounts";
import { buttonVariants } from "@/components/ui/button";
import { DisconnectButton } from "@/components/accounts/disconnect-button";

const STATUS_LABEL: Record<string, string> = {
  active: "Aktif",
  expired: "Expired",
  reauth_required: "Perlu login ulang",
  disconnected: "Terputus",
};

const ERROR_MESSAGE: Record<string, string> = {
  config: "Kredensial platform belum dikonfigurasi. Isi env Instagram/TikTok dulu.",
  state: "Verifikasi keamanan gagal. Coba connect ulang.",
  denied: "Kamu membatalkan otorisasi di platform.",
  code: "Kode otorisasi tidak diterima.",
  exchange: "Gagal menukar kode dengan token. Coba lagi.",
  not_found: "Koneksi tidak ditemukan.",
};

function expiryWarning(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const days = (new Date(expiresAt).getTime() - Date.now()) / 86400000;
  if (days < 0) return "Token expired — reconnect untuk publish lagi.";
  if (days < 7) return `Token kedaluwarsa dalam ${Math.ceil(days)} hari.`;
  return null;
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; disconnected?: string; error?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const connections = user ? await listConnectionsByUser(supabase, user.id) : [];

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Akun Terhubung</h1>
        <p className="text-sm text-muted-foreground">
          Hubungkan akun Instagram dan TikTok untuk publish dari PostPilot.
        </p>
      </header>

      {query.connected && (
        <p role="status" className="rounded-lg border border-border bg-card p-3 text-sm">
          Akun {query.connected} berhasil terhubung. 🎉
        </p>
      )}
      {query.disconnected && (
        <p role="status" className="rounded-lg border border-border bg-card p-3 text-sm">
          Akun diputus. Token dihapus dari PostPilot.
        </p>
      )}
      {query.error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-card p-3 text-sm text-destructive">
          {ERROR_MESSAGE[query.error] ?? "Terjadi kesalahan."}
        </p>
      )}

      <section className="flex flex-wrap gap-3">
        <Link
          href="/api/accounts/instagram/connect"
          className={buttonVariants({ variant: "default" })}
        >
          + Connect Instagram
        </Link>
        <Link
          href="/api/accounts/tiktok/connect"
          className={buttonVariants({ variant: "secondary" })}
        >
          + Connect TikTok
        </Link>
      </section>

      <section className="space-y-3">
        {connections.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Belum ada akun terhubung.
          </p>
        )}
        {connections.map((c) => {
          const warning = c.status === "active" ? expiryWarning(c.token_expires_at) : null;
          return (
            <article
              key={c.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
            >
              <div>
                <p className="font-medium">
                  <span className="mr-2 rounded bg-muted px-2 py-0.5 text-xs uppercase">
                    {c.platform}
                  </span>
                  {c.username ?? c.display_name ?? c.platform_account_id}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Status: {STATUS_LABEL[c.status] ?? c.status}
                  {c.token_expires_at &&
                    ` · expired ${new Date(c.token_expires_at).toLocaleDateString("id-ID")}`}
                </p>
                {warning && (
                  <p className="mt-1 text-sm text-destructive">{warning}</p>
                )}
              </div>
              {c.status !== "disconnected" ? (
                <DisconnectButton connectionId={c.id} />
              ) : (
                <span className="text-sm text-muted-foreground">
                  Connect ulang untuk pakai lagi.
                </span>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}
