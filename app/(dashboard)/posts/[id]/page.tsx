import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPostDetail } from "@/lib/db/posts";
import { PostActions } from "@/components/posts/post-actions";
import { PageHeader } from "@/components/content/primitives";
import { PlatformBadge, StatusBadge } from "@/components/content/badges";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const detail = user ? await getPostDetail(supabase, id, user.id) : null;
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={detail.title ?? "(tanpa judul)"}
        description={`Dibuat ${new Date(detail.created_at).toLocaleString("id-ID", {
          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
        })}`}
      >
        <StatusBadge status={detail.status} />
      </PageHeader>
      <PostActions postId={detail.id} status={detail.status} />
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Target platform</h2>
        {detail.targets.map((t) => (
          <article key={t.id} className="space-y-2 rounded-2xl border border-border p-4" style={{ background: "var(--surface)" }}>
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <PlatformBadge platform={t.platform} />
              <span className="text-muted-foreground">{t.username ?? "—"}</span>
              <StatusBadge status={t.status} />
            </p>
            {t.caption && (
              <p className="whitespace-pre-wrap text-sm">{t.caption}</p>
            )}
            {t.failure_message && (
              <p className="text-sm text-destructive">{t.failure_message}</p>
            )}
          </article>
        ))}
      </section>
      <section className="space-y-1">
        <h2 className="text-sm font-medium text-muted-foreground">Media ({detail.media.length})</h2>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {detail.media.map((m) => (
            <li key={m.id}>
              {m.original_name ?? m.storage_path} · {m.media_type}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
