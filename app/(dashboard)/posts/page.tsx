import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listPosts } from "@/lib/db/posts";
import { buttonVariants } from "@/components/ui/button";

export default async function PostsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = user
    ? await listPosts(supabase, user.id)
    : { data: [] as never[] };

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Posts</h1>
        <Link href="/posts/new" className={buttonVariants({ variant: "default" })}>
          + Post Baru
        </Link>
      </header>
      <section className="space-y-3">
        {data.length === 0 && (
          <p className="text-sm text-muted-foreground">Belum ada post.</p>
        )}
        {data.map((p) => (
          <Link
            key={p.id}
            href={`/posts/${p.id}`}
            className="block rounded-xl border border-border bg-card p-4"
          >
            <p className="font-medium">{p.title ?? "(tanpa judul)"}</p>
            <p className="text-sm text-muted-foreground">
              {p.status} · {new Date(p.created_at).toLocaleString("id-ID")}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
