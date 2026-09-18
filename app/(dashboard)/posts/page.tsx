import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listPosts } from "@/lib/db/posts";
import { PageHeader, EmptyState } from "@/components/content/primitives";
import { StatusBadge } from "@/components/content/badges";

export default async function PostsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = user
    ? await listPosts(supabase, user.id)
    : { data: [] as never[] };

  return (
    <div className="space-y-5">
      <PageHeader title="Posts" description="Semua konten Anda.">
        <Link
          href="/posts/new"
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-accent bg-gradient-to-b from-[rgb(255_255_255/0.14)] via-transparent to-transparent px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.16)] hover:bg-[var(--accent-hover)]"
        >
          <Plus size={15} />
          Post Baru
        </Link>
      </PageHeader>
      {data.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="Belum ada postingan"
          description="Mulai dengan membuat postingan pertama Anda."
          actionHref="/posts/new"
          actionLabel="Buat Postingan"
        />
      ) : (
        <ul className="space-y-1">
          {data.map((p) => (
            <li key={p.id}>
              <Link
                href={`/posts/${p.id}`}
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-[rgb(255_255_255/0.04)]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {p.title ?? "(tanpa judul)"}
                  </span>
                  <span className="text-xs text-muted-foreground tnum">
                    {new Date(p.created_at).toLocaleString("id-ID", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </span>
                <StatusBadge status={p.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
