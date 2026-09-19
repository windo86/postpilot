import { TrendingManager } from "@/components/trending/manager";
import { PageHeader } from "@/components/content/primitives";

export default function TrendingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Trending & Insights"
        description="Catat topik trending manual untuk inspirasi konten."
      />
      <TrendingManager />
    </div>
  );
}
