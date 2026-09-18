import { TrendingManager } from "@/components/trending/manager";

export default function TrendingPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Trending & Insights</h1>
        <p className="text-sm text-muted-foreground">
          Catat topik trending manual untuk inspirasi konten.
        </p>
      </header>
      <TrendingManager />
    </main>
  );
}
