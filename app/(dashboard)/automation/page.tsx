import { ApiKeyManager } from "@/components/automation/api-keys";
import { WebhookManager } from "@/components/automation/webhooks";

export default function AutomationPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Automation</h1>
        <p className="text-sm text-muted-foreground">
          API keys untuk n8n & tool eksternal, plus incoming webhook.
        </p>
      </header>
      <section className="space-y-4">
        <h2 className="text-lg font-medium">API Keys</h2>
        <ApiKeyManager />
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Incoming Webhooks</h2>
        <WebhookManager />
      </section>
    </main>
  );
}
