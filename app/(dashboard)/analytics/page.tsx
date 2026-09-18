import { AnalyticsOverview } from "@/components/analytics/overview";

export default function AnalyticsPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Metrik per post, refresh maksimal 1 jam sekali (tombol Refresh memaksa).
        </p>
      </header>
      <AnalyticsOverview />
    </main>
  );
}
