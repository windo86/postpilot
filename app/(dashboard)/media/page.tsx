import { MediaLibrary } from "@/components/media/library";
import { PageHeader } from "@/components/content/primitives";

export default function MediaPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Media Library"
        description="Upload sekali, pakai berulang kali. File besar otomatis resumable."
      />
      <MediaLibrary />
    </div>
  );
}
