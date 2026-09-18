import Link from "next/link";
import { CheckCircle2, Plus, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listConnectionsByUser } from "@/lib/db/connected-accounts";
import { DisconnectButton } from "@/components/accounts/disconnect-button";
import { PageHeader, EmptyState } from "@/components/content/primitives";
import { PlatformBadge, StatusBadge } from "@/components/content/badges";

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
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Akun Terhubung"
        description="Hubungkan akun Instagram dan TikTok untuk publish dari PostPilot."
      >
        <Link
          href="/api/accounts/instagram/connect"
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-accent bg-gradient-to-b from-[rgb(255_255_255/0.14)] via-transparent to-transparent px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.16)] hover:bg-[var(--accent-hover)]"
        >
          <Plus size={15} />
          Instagram
        </Link>
        <Link
          href="/api/accounts/tiktok/connect"
          className="flex items-center gap-1.5 rounded-xl border border-[rgb(255_255_255/0.08)] bg-[rgb(255_255_255/0.04)] px-4 py-2 text-sm hover:bg-[rgb(255_255_255/0.07)]"
        >
          <Plus size={15} />
          TikTok
        </Link>
      </PageHeader>

      {query.connected && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-[rgb(52_211_153/0.25)] px-4 py-3 text-sm" style={{ background: "var(--surface)" }}>
          <CheckCircle2 size={16} className="shrink-0 text-[var(--success)]" />
          Akun {query.connected} berhasil terhubung.
        </p>
      )}
      {query.disconnected && (
        <p role="status" className="rounded-xl border border-[rgb(255_255_255/0.07)] px-4 py-3 text-sm text-muted-foreground" style={{ background: "var(--surface)" }}>
          Akun diputus. Token dihapus dari PostPilot.
        </p>
      )}
      {query.error && (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-[rgb(248_113_113/0.25)] px-4 py-3 text-sm text-destructive" style={{ background: "var(--surface)" }}>
          <XCircle size={16} className="shrink-0" />
          {ERROR_MESSAGE[query.error] ?? "Terjadi kesalahan."}
        </p>
      )}

      {connections.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="Belum ada akun terhubung"
          description="Connect Instagram atau TikTok untuk mulai publish dari PostPilot."
          actionHref="/api/accounts/instagram/connect"
          actionLabel="Connect Instagram"
        />
      ) : (
        <ul className="space-y-1">
          {connections.map((c) => {
            const warning = c.status === "active" ? expiryWarning(c.token_expires_at) : null;
            return (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 rounded-xl px-2 py-2.5 hover:bg-[rgb(255_255_255/0.03)]"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    <PlatformBadge platform={c.platform} />
                    <span className="truncate">
                      {c.username ?? c.display_name ?? c.platform_account_id}
                    </span>
                    <StatusBadge status={c.status} />
                  </p>
                  {c.token_expires_at && (
                    <p className="mt-0.5 text-xs text-muted-foreground tnum">
                      Expired {new Date(c.token_expires_at).toLocaleDateString("id-ID")}
                    </p>
                  )}
                  {warning && (
                    <p className="mt-0.5 text-xs text-[var(--warning)]">{warning}</p>
                  )}
                </div>
                {c.status !== "disconnected" ? (
                  <DisconnectButton connectionId={c.id} />
                ) : (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Connect ulang untuk pakai lagi.
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
