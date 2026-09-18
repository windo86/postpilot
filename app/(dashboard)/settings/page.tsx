import { AIKeyManager } from "@/components/settings/ai-keys";
import { NotificationPreferences } from "@/components/settings/notifications";
import { PageHeader } from "@/components/content/primitives";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <PageHeader
        title="Settings"
        description="API key AI milikmu (BYOK) dan preferensi notifikasi."
      />
      <section aria-label="API key AI" className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">AI Keys</h2>
        <AIKeyManager />
      </section>
      <section aria-label="Preferensi notifikasi" className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Notifikasi</h2>
        <NotificationPreferences />
      </section>
    </div>
  );
}
