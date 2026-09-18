import Link from "next/link";
import { ArrowRight, CalendarPlus, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSummary } from "@/lib/db/dashboard";
import { PageHeader, EmptyState } from "@/components/content/primitives";
import { PlatformBadge, StatusBadge } from "@/components/content/badges";
import { Thumb } from "@/components/content/visual";
import { WeeklyRhythm } from "@/components/dashboard/weekly-rhythm";
import { PerformanceMini } from "@/components/dashboard/performance-mini";

/**
 * Content command center (Apple-like): header → aktivitas → upcoming
 * visual + performa → perhatian → recent → ritme. Open layout, minim card.
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
        <PageHeader title="Dashboard" />
        <p role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
          Gagal memuat dashboard: {error ?? "unknown"}
        </p>
      </div>
    );
  }

  const firstName = email.split("@")[0];
  const failedPosts = summary.recentPosts.filter((p) =>
    ["failed", "partial_failed"].includes(p.status)
  );
  const reauthNeeded = summary.connections.filter((c) =>
    ["expired", "reauth_required", "disconnected"].includes(c.status)
  );

  return (
    <div className="space-y-7">
      {/* Header */}
      <PageHeader
        title={`Halo, ${firstName}`}
        description="Ringkasan aktivitas konten Anda."
      >
        <Link
          href="/posts/new"
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-accent bg-gradient-to-b from-[rgb(255_255_255/0.14)] via-transparent to-transparent px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.16),0_8px_20px_-8px_rgb(47_109_228/0.6)] hover:bg-[var(--accent-hover)]"
        >
          <Plus size={15} />
          Buat Postingan
        </Link>
      </PageHeader>

      {/* Activity strip: satu baris, separator halus */}
      <section aria-label="Ringkasan aktivitas">
        <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
          {[
            { label: "Draft", value: summary.counts.draft },
            { label: "Terjadwal", value: summary.counts.scheduled },
            { label: "Terbit", value: summary.counts.published },
            { label: "Gagal", value: summary.counts.failed },
          ].map((s) => (
            <div key={s.label} className="flex items-baseline gap-2">
              <dt className="text-sm text-muted-foreground">{s.label}</dt>
              <dd className="tnum text-xl font-semibold tracking-tight">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Upcoming visual */}
        <section aria-label="Jadwal mendatang" className="space-y-3 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Jadwal mendatang</h2>
            <Link href="/schedule" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              Kalender <ArrowRight size={12} />
            </Link>
          </div>
          {summary.upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarPlus}
              title="Belum ada jadwal"
              description="Rencanakan postingan berikutnya agar konten Anda tetap konsisten."
              actionHref="/posts/new"
              actionLabel="Jadwalkan Postingan"
            />
          ) : (
            <ul className="space-y-1">
              {summary.upcoming.map((u) => (
                <li key={u.queueId}>
                  <Link
                    href={`/posts/${u.postId}`}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[rgb(255_255_255/0.04)]"
                  >
                    {u.thumbnailAssetId ? (
                      <Thumb
                        assetId={u.thumbnailAssetId}
                        mediaType={u.thumbnailType ?? "image"}
                        alt={u.postTitle ?? "Thumbnail post"}
                        className="size-12 shrink-0 rounded-lg"
                      />
                    ) : (
                      <span className="size-12 shrink-0 rounded-lg bg-[rgb(255_255_255/0.04)]" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {u.postTitle ?? "(tanpa judul)"}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground tnum">
                        {new Date(u.scheduledAt).toLocaleString("id-ID", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </span>
                    <PlatformBadge platform={u.platform} />
                    <StatusBadge status="scheduled" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Performance */}
        <div className="lg:col-span-2">
          <PerformanceMini />
        </div>
      </div>

      {/* Attention — hanya bila relevan */}
      {(failedPosts.length > 0 || reauthNeeded.length > 0) && (
        <section aria-label="Perlu perhatian" className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Perlu perhatian</h2>
          {reauthNeeded.map((c, i) => (
            <Link
              key={`${c.platform}-${i}`}
              href="/accounts"
              className="flex items-center gap-3 rounded-xl border border-[rgb(251_191_36/0.22)] px-4 py-3"
              style={{ background: "var(--surface)" }}
            >
              <PlatformBadge platform={c.platform} />
              <span className="min-w-0 flex-1 text-sm">
                {c.username ?? c.platform} perlu dihubungkan kembali agar publikasi jalan.
              </span>
              <span className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white">
                Hubungkan Kembali
              </span>
            </Link>
          ))}
          {failedPosts.map((p) => (
            <Link
              key={p.id}
              href={`/posts/${p.id}`}
              className="flex items-center gap-3 rounded-xl border border-[rgb(248_113_113/0.22)] px-4 py-3"
              style={{ background: "var(--surface)" }}
            >
              <span className="min-w-0 flex-1 text-sm">
                <span className="block truncate font-medium">{p.title ?? "(tanpa judul)"}</span>
                <span className="text-muted-foreground">Publikasi gagal — lihat masalahnya.</span>
              </span>
              <StatusBadge status={p.status} />
            </Link>
          ))}
        </section>
      )}

      {/* Recent visual */}
      <section aria-label="Konten terbaru" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Terbaru</h2>
          <Link href="/posts" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            Semua <ArrowRight size={12} />
          </Link>
        </div>
        {summary.recentPosts.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="Belum ada postingan"
            description="Mulai dengan membuat postingan pertama Anda."
            actionHref="/posts/new"
            actionLabel="Buat Postingan"
          />
        ) : (
          <ul className="grid gap-1 sm:grid-cols-2">
            {summary.recentPosts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/posts/${p.id}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[rgb(255_255_255/0.04)]"
                >
                  {p.thumbnailAssetId ? (
                    <Thumb
                      assetId={p.thumbnailAssetId}
                      mediaType={p.thumbnailType ?? "image"}
                      alt={p.title ?? "Thumbnail post"}
                      className="size-11 shrink-0 rounded-lg"
                    />
                  ) : (
                    <span className="size-11 shrink-0 rounded-lg bg-[rgb(255_255_255/0.04)]" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {p.title ?? "(tanpa judul)"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    </span>
                  </span>
                  <StatusBadge status={p.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <WeeklyRhythm />
    </div>
  );
}
