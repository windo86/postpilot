import { AnalyticsOverview } from "@/components/analytics/overview";
import { PageHeader } from "@/components/content/primitives";

export default function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title="Analytics"
        description="Metrik per post, refresh maksimal 1 jam sekali."
      />
      <AnalyticsOverview />
    </div>
  );
}
