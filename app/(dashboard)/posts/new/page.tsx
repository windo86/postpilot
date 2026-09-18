import { Composer } from "@/components/posts/composer";

export default function NewPostPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Post Baru</h1>
        <p className="text-sm text-muted-foreground">
          Pilih media, target akun, tulis caption per platform.
        </p>
      </header>
      <Composer />
    </main>
  );
}
