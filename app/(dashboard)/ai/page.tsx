import { AIStudio } from "@/components/ai/studio";

export default function AIPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">AI Content Generator</h1>
        <p className="text-sm text-muted-foreground">
          Generate caption, gambar, dan video dengan API key milikmu (BYOK).
        </p>
      </header>
      <AIStudio />
    </main>
  );
}
