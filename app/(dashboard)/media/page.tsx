import { MediaLibrary } from "@/components/media/library";

export default function MediaPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Media Library</h1>
        <p className="text-sm text-muted-foreground">
          Upload sekali, pakai berulang kali. File besar otomatis memakai
          resumable upload.
        </p>
      </header>
      <MediaLibrary />
    </main>
  );
}
