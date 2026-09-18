import { ApiKeyManager } from "@/components/automation/api-keys";
import { WebhookManager } from "@/components/automation/webhooks";
import { PageHeader } from "@/components/content/primitives";

export default function AutomationPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <PageHeader
        title="Automation"
        description="API keys untuk n8n & tool eksternal, plus incoming webhook."
      />
      <section aria-label="API keys" className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">API Keys</h2>
        <ApiKeyManager />
      </section>
      <section aria-label="Incoming webhooks" className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Incoming Webhooks</h2>
        <WebhookManager />
      </section>
    </div>
  );
}
