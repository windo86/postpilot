import Link from "next/link";
import { AlertTriangle, CalendarClock, Eye, Heart, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSummary } from "@/lib/db/dashboard";

/**
 * Command center: header → aksi utama → upcoming → health →
 * perhatian → recent. Bukan dinding statistik.
 */
export async function DashboardHome({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const supabase = await createClient();

  let summary = null;
  let error: string | null = null;
  try {
    summary = await getDashboardSummary(supabase, userId);
  } catch (e) {
    error = (e as Error).message;
  }

  if (error || !summary) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
          Gagal memuat dashboard: {error ?? "unknown"}
        </p>
      </div>
    );
  }

  const failedPosts = summary.recentPosts.filter((p) =>
    ["failed", "partial_failed"].includes(p.status)
  );
  const queuedCount = summary.upcoming.length;
  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-5">
      {/* Header + aksi utama */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{today}</p>
          <h1 className="text-xl font-semibold tracking-tight">
            Halo, {email.split("@")[0]}
          </h1>
        </div>
        <Link
          href="/posts/new"
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          <Plus size={15} />
          Buat Postingan
        </Link>
      </div>

      {/* Kesehatan publishing — satu baris status */}
      <section
        aria-label="Status publishing"
        className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-border px-4 py-3 text-sm"
        style={{ background: "var(--surface)" }}
      >
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2 rounded-full bg-[var(--success)]"
          />
          <span className="tnum font-medium">{summary.counts.published}</span>
          <span className="text-muted-foreground">terbit</span>
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarClock size={14} className="text-muted-foreground" />
          <span className="tnum font-medium">{queuedCount}</span>
          <span className="text-muted-foreground">antre</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="tnum font-medium">{summary.counts.draft}</span>
          <span className="text-muted-foreground">draft</span>
        </span>
        {summary.counts.failed > 0 && (
          <span className="flex items-center gap-1.5 text-[var(--danger)]">
            <AlertTriangle size={14} />
            <span className="tnum font-medium">{summary.counts.failed}</span>
            <span>perlu perhatian</span>
          </span>
        )}
      </section>

      {/* Perhatian */}
      {failedPosts.length > 0 && (
        <section aria-label="Perlu perhatian" className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Perlu perhatian</h2>
          {failedPosts.map((p) => (
            <Link
              key={p.id}
              href={`/posts/${p.id}`}
              className="flex items-center gap-3 rounded-xl border border-[rgb(248_113_113/0.25)] px-4 py-3 hover:bg-[rgb(248_113_113/0.06)]"
              style={{ background: "var(--surface)" }}
            >
              <AlertTriangle size={16} className="shrink-0 text-[var(--danger)]" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {p.title ?? "(tanpa judul)"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Publikasi gagal — buka untuk coba lagi
                </span>
              </span>
            </Link>
          ))}
        </section>
      )}

      {/* Upcoming */}
      <section aria-label="Jadwal mendatang" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Jadwal mendatang</h2>
          <Link href="/schedule" className="text-xs text-muted-foreground hover:text-foreground">
            Kalender
          </Link>
        </div>
        {summary.upcoming.length === 0 ? (
          <Link
            href="/posts/new"
            className="block rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground hover:border-[rgb(255_255_255/0.18)] hover:text-foreground"
          >
            Belum ada antrean — jadwalkan postingan pertama
          </Link>
        ) : (
          <ul className="divide-y divide-[rgb(255_255_255/0.05)] rounded-xl border border-border" style={{ background: "var(--surface)" }}>
            {summary.upcoming.map((u) => (
              <li key={u.queueId}>
                <Link href={`/posts/${u.postId}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[rgb(255_255_255/0.03)]">
                  <span className="w-14 shrink-0 text-xs text-muted-foreground tnum">
                    {new Date(u.scheduledAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {u.postTitle ?? "(tanpa judul)"}
                  </span>
                  <span className="shrink-0 rounded bg-[rgb(255_255_255/0.07)] px-1.5 py-0.5 text-[11px] uppercase text-muted-foreground">
                    {u.platform}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent */}
        <section aria-label="Post terbaru" className="rounded-xl border border-border p-4" style={{ background: "var(--surface)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Terbaru</h2>
            <Link href="/posts" className="text-xs text-muted-foreground hover:text-foreground">
              Semua
            </Link>
          </div>
          {summary.recentPosts.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Belum ada post.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {summary.recentPosts.map((p) => (
                <li key={p.id} className="text-sm">
                  <Link href={`/posts/${p.id}`} className="hover:underline">
                    {p.title ?? "(tanpa judul)"}
                  </Link>{" "}
                  <span className="text-xs text-muted-foreground">· {p.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Koneksi + performa */}
        <section aria-label="Akun dan performa" className="rounded-xl border border-border p-4" style={{ background: "var(--surface)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Akun & performa</h2>
            <Link href="/analytics" className="text-xs text-muted-foreground hover:text-foreground">
              Analytics
            </Link>
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <Heart size={14} className="text-muted-foreground" />
              <span className="tnum font-medium">{summary.totals.likes.toLocaleString("id-ID")}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Eye size={14} className="text-muted-foreground" />
              <span className="tnum font-medium">{summary.totals.views.toLocaleString("id-ID")}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              {summary.connections.length} akun terhubung
            </span>
          </div>
          {summary.connections.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              <Link href="/accounts" className="underline">Connect akun</Link> untuk mulai publish.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
