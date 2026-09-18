import { AIKeyManager } from "@/components/settings/ai-keys";
import { NotificationPreferences } from "@/components/settings/notifications";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          API key AI milikmu (BYOK) dan preferensi notifikasi.
        </p>
      </header>
      <AIKeyManager />
      <NotificationPreferences />
    </main>
  );
}
