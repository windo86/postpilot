import { AIStudio } from "@/components/ai/studio";
import { PageHeader } from "@/components/content/primitives";

export default function AIPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title="AI Studio"
        description="Generate caption, gambar, dan video dengan API key milikmu."
      />
      <AIStudio />
    </div>
  );
}
