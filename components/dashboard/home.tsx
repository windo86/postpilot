import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSummary } from "@/lib/db/dashboard";
import { LogoutButton } from "@/components/auth/logout-button";

/** Isi dashboard (dipakai route "/" saat login & grup dashboard). */
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
      <main className="mx-auto max-w-5xl space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
          Gagal memuat dashboard: {error ?? "unknown"}
        </p>
      </main>
    );
  }

  const cards = [
    { label: "Draft", value: summary.counts.draft, href: "/posts" },
    { label: "Terjadwal", value: summary.counts.scheduled, href: "/schedule" },
    { label: "Published", value: summary.counts.published, href: "/posts" },
    { label: "Gagal", value: summary.counts.failed, href: "/posts" },
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Masuk sebagai {email}</p>
        </div>
        <LogoutButton />
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-xl border border-border bg-card p-4"
          >
            <p className="text-3xl font-semibold">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </Link>
        ))}
      </section>

      <section className="flex flex-wrap gap-3">
        <Link href="/posts/new" className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
          + Post Baru
        </Link>
        <Link href="/schedule" className="rounded-lg border border-input px-4 py-2 text-sm">
          Scheduler
        </Link>
        <Link href="/analytics" className="rounded-lg border border-input px-4 py-2 text-sm">
          Analytics
        </Link>
        <Link href="/media" className="rounded-lg border border-input px-4 py-2 text-sm">
          Media
        </Link>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-medium">Post terbaru</h2>
          {summary.recentPosts.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Belum ada post. <Link href="/posts/new" className="underline">Buat yang pertama</Link>.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {summary.recentPosts.map((p) => (
                <li key={p.id} className="text-sm">
                  <Link href={`/posts/${p.id}`} className="font-medium underline">
                    {p.title ?? "(tanpa judul)"}
                  </Link>{" "}
                  <span className="text-muted-foreground">· {p.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-medium">Jadwal mendatang</h2>
          {summary.upcoming.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Tidak ada antrean. <Link href="/schedule" className="underline">Jadwalkan post</Link>.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {summary.upcoming.map((u) => (
                <li key={u.queueId} className="text-sm">
                  <Link href={`/posts/${u.postId}`} className="font-medium underline">
                    {u.postTitle ?? "(tanpa judul)"}
                  </Link>{" "}
                  <span className="text-muted-foreground">
                    · {u.platform} · {new Date(u.scheduledAt).toLocaleString("id-ID")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-medium">Koneksi platform</h2>
          {summary.connections.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Belum ada akun. <Link href="/accounts" className="underline">Connect</Link>.
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {summary.connections.map((c, i) => (
                <li key={`${c.platform}-${i}`}>
                  <span className="mr-2 rounded bg-muted px-2 py-0.5 text-xs uppercase">{c.platform}</span>
                  {c.username ?? "—"} · {c.status}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-medium">Performa & notifikasi</h2>
          <p className="mt-2 text-sm">
            ❤️ {summary.totals.likes.toLocaleString("id-ID")} likes · 👁️{" "}
            {summary.totals.views.toLocaleString("id-ID")} views
            <span className="text-muted-foreground"> ({summary.totals.postsWithMetrics} post termonitor)</span>
          </p>
          {summary.failures.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {summary.failures.map((f) => (
                <li key={f.id} className="text-destructive">
                  {f.title}: {f.message.slice(0, 120)}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
