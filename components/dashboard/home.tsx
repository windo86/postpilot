import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Eye,
  FileText,
  Heart,
  PencilLine,
  Plus,
  Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSummary } from "@/lib/db/dashboard";
import { LogoutButton } from "@/components/auth/logout-button";

/**
 * Command center: hero → aksi → upcoming timeline → health →
 * perhatian → recent. Visual kaya tapi tenang.
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

  const name = email.split("@")[0];
  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const failedPosts = summary.recentPosts.filter((p) =>
    ["failed", "partial_failed"].includes(p.status)
  );

  const stats = [
    { label: "Draft", value: summary.counts.draft, href: "/posts", icon: PencilLine, tint: "text-muted-foreground", chip: "bg-[rgb(255_255_255/0.06)]" },
    { label: "Terjadwal", value: summary.counts.scheduled, href: "/schedule", icon: CalendarClock, tint: "text-accent", chip: "bg-[rgb(59_130_246/0.14)]" },
    { label: "Terbit", value: summary.counts.published, href: "/posts", icon: Send, tint: "text-[var(--success)]", chip: "bg-[rgb(52_211_153/0.12)]" },
    { label: "Gagal", value: summary.counts.failed, href: "/posts", icon: AlertTriangle, tint: "text-[var(--danger)]", chip: "bg-[rgb(248_113_113/0.12)]" },
  ];

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl border border-border p-5 sm:p-6"
        style={{ background: "var(--surface)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(480px 180px at 8% 0%, rgb(59 130 246 / 0.16), transparent 70%), radial-gradient(380px 160px at 95% 100%, rgb(167 139 250 / 0.12), transparent 70%)",
          }}
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{today}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Halo, {name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.upcoming.length === 0
                ? "Tidak ada antrean hari ini — siap menjadwalkan?"
                : `${summary.upcoming.length} postingan antre untuk terbit.`}
            </p>
          </div>
          <Link
            href="/posts/new"
            className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgb(59_130_246/0.6)] hover:bg-[var(--accent-hover)]"
          >
            <Plus size={15} />
            Buat Postingan
          </Link>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="flex items-center gap-3 rounded-xl border border-border bg-[rgb(255_255_255/0.025)] p-3 hover:bg-[rgb(255_255_255/0.05)]"
            >
              <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${s.chip}`}>
                <s.icon size={17} className={s.tint} />
              </span>
              <span>
                <span className="block text-xl font-semibold leading-none tnum">{s.value}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{s.label}</span>
              </span>
            </Link>
          ))}
        </div>
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
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[rgb(248_113_113/0.12)]">
                <AlertTriangle size={17} className="text-[var(--danger)]" />
              </span>
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

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Upcoming timeline */}
        <section aria-label="Jadwal mendatang" className="rounded-2xl border border-border p-4 lg:col-span-3" style={{ background: "var(--surface)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Jadwal mendatang</h2>
            <Link href="/schedule" className="text-xs text-muted-foreground hover:text-foreground">
              Kalender
            </Link>
          </div>
          {summary.upcoming.length === 0 ? (
            <Link
              href="/posts/new"
              className="mt-3 block rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground hover:border-[rgb(255_255_255/0.18)] hover:text-foreground"
            >
              Belum ada antrean — jadwalkan postingan pertama
            </Link>
          ) : (
            <ol className="mt-1">
              {summary.upcoming.map((u, i) => (
                <li key={u.queueId} className="relative flex gap-3 pb-4 pl-1 pt-3 last:pb-1">
                  {i < summary.upcoming.length - 1 && (
                    <span aria-hidden className="absolute bottom-0 left-[9px] top-8 w-px bg-[rgb(255_255_255/0.08)]" />
                  )}
                  <span
                    aria-hidden
                    className="mt-1.5 size-2 shrink-0 rounded-full"
                    style={{
                      background: u.platform === "instagram"
                        ? "linear-gradient(135deg,#f472b6,#fb923c)"
                        : "#22d3ee",
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <Link href={`/posts/${u.postId}`} className="block truncate text-sm font-medium hover:underline">
                      {u.postTitle ?? "(tanpa judul)"}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground tnum">
                      {new Date(u.scheduledAt).toLocaleString("id-ID", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}{" "}
                      · {u.platform}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="space-y-4 lg:col-span-2">
          {/* Performa */}
          <section aria-label="Performa" className="rounded-2xl border border-border p-4" style={{ background: "var(--surface)" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Performa</h2>
              <Link href="/analytics" className="text-xs text-muted-foreground hover:text-foreground">
                Analytics
              </Link>
            </div>
            <div className="mt-3 flex items-center gap-5">
              <span className="flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-lg bg-[rgb(244_114_182/0.12)]">
                  <Heart size={16} className="text-[#f472b6]" />
                </span>
                <span>
                  <span className="block text-lg font-semibold leading-none tnum">
                    {summary.totals.likes.toLocaleString("id-ID")}
                  </span>
                  <span className="text-xs text-muted-foreground">likes</span>
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-lg bg-[rgb(96_165_250/0.12)]">
                  <Eye size={16} className="text-accent" />
                </span>
                <span>
                  <span className="block text-lg font-semibold leading-none tnum">
                    {summary.totals.views.toLocaleString("id-ID")}
                  </span>
                  <span className="text-xs text-muted-foreground">views</span>
                </span>
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {summary.connections.length === 0 ? (
                <><Link href="/accounts" className="underline">Connect akun</Link> untuk mulai publish.</>
              ) : (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-[var(--success)]" />
                  {summary.connections.length} akun terhubung · {summary.totals.postsWithMetrics} post termonitor
                </span>
              )}
            </p>
          </section>

          {/* Recent */}
          <section aria-label="Post terbaru" className="rounded-2xl border border-border p-4" style={{ background: "var(--surface)" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Terbaru</h2>
              <Link href="/posts" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <FileText size={13} /> Semua
              </Link>
            </div>
            {summary.recentPosts.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Belum ada post. <Link href="/posts/new" className="underline">Buat yang pertama</Link>.
              </p>
            ) : (
              <ul className="mt-1 divide-y divide-[rgb(255_255_255/0.05)]">
                {summary.recentPosts.map((p) => (
                  <li key={p.id}>
                    <Link href={`/posts/${p.id}`} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span className="truncate">{p.title ?? "(tanpa judul)"}</span>
                      <StatusPill status={p.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              <span>Masuk sebagai {email}</span>
              <LogoutButton className="h-auto border-0 bg-transparent p-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground hover:underline" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: "bg-[rgb(52_211_153/0.12)] text-[var(--success)]",
    scheduled: "bg-[rgb(59_130_246/0.14)] text-accent",
    processing: "bg-[rgb(59_130_246/0.14)] text-accent",
    failed: "bg-[rgb(248_113_113/0.12)] text-[var(--danger)]",
    partial_failed: "bg-[rgb(251_191_36/0.12)] text-[var(--warning)]",
    draft: "bg-[rgb(255_255_255/0.06)] text-muted-foreground",
    cancelled: "bg-[rgb(255_255_255/0.06)] text-muted-foreground",
  };
  const label: Record<string, string> = {
    published: "Terbit",
    scheduled: "Terjadwal",
    processing: "Proses",
    failed: "Gagal",
    partial_failed: "Sebagian",
    draft: "Draft",
    cancelled: "Batal",
  };
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${map[status] ?? map.draft}`}>
      {label[status] ?? status}
    </span>
  );
}
