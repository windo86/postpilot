import { ApiKeyManager } from "@/components/automation/api-keys";

export default function AutomationPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Automation</h1>
        <p className="text-sm text-muted-foreground">
          API keys untuk n8n & tool eksternal. Webhook menyusul (T-18).
        </p>
      </header>
      <ApiKeyManager />
    </main>
  );
}
