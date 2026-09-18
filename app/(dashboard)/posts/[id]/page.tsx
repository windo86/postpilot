import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPostDetail } from "@/lib/db/posts";
import { PostActions } from "@/components/posts/post-actions";

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
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">{detail.title ?? "(tanpa judul)"}</h1>
        <p className="text-sm text-muted-foreground">Status: {detail.status}</p>
        <div className="mt-3">
          <PostActions postId={detail.id} status={detail.status} />
        </div>
      </header>
      <section className="space-y-3">
        <h2 className="font-medium">Target platform</h2>
        {detail.targets.map((t) => (
          <article key={t.id} className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm">
              <span className="mr-2 rounded bg-muted px-2 py-0.5 text-xs uppercase">
                {t.platform}
              </span>
              {t.username ?? "—"} · {t.status}
            </p>
            {t.caption && (
              <p className="mt-2 whitespace-pre-wrap text-sm">{t.caption}</p>
            )}
            {t.failure_message && (
              <p className="mt-1 text-sm text-destructive">{t.failure_message}</p>
            )}
          </article>
        ))}
      </section>
      <section className="space-y-2">
        <h2 className="font-medium">Media ({detail.media.length})</h2>
        <ul className="list-disc pl-5 text-sm text-muted-foreground">
          {detail.media.map((m) => (
            <li key={m.id}>
              {m.original_name ?? m.storage_path} ({m.media_type})
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
