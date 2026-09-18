"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Hook {
  id: string;
  name: string;
  event_type: string;
  active: boolean;
  last_received_at: string | null;
}

export function WebhookManager() {
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<{ endpointUrl: string; signingSecret: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/webhooks-manage")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => {
        if (!cancelled) setHooks(j.data ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  async function onCreate() {
    setError(null);
    setFresh(null);
    if (!name.trim()) {
      setError("Nama wajib diisi.");
      return;
    }
    const res = await fetch("/api/webhooks-manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok) {
      setError(j?.error ?? "Gagal membuat webhook");
      return;
    }
    setFresh({ endpointUrl: j.endpointUrl, signingSecret: j.signingSecret });
    setName("");
    refresh();
  }

  async function onToggle(h: Hook) {
    await fetch(`/api/webhooks-manage/${h.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !h.active }),
    });
    refresh();
  }

  async function onDelete(id: string) {
    if (!window.confirm("Hapus endpoint ini? Pengirim lama langsung mati.")) return;
    await fetch(`/api/webhooks-manage/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2.5 rounded-2xl border border-[rgb(255_255_255/0.07)] p-4" style={{ background: "var(--surface)" }}>
        <h3 className="text-sm font-medium">Buat endpoint webhook</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Nama, mis. n8n-posting"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs border-[rgb(255_255_255/0.08)] bg-[rgb(255_255_255/0.03)]"
          />
          <Button size="sm" onClick={onCreate}>
            Buat
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {fresh && (
          <div className="space-y-1 rounded-xl bg-[rgb(59_130_246/0.10)] p-3 font-mono text-xs break-all">
            <p>URL: {fresh.endpointUrl}</p>
            <p>Secret: {fresh.signingSecret}</p>
            <p className="font-sans text-muted-foreground">
              Salin keduanya sekarang. Tanda tangani body dengan header{" "}
              <code>x-webhook-signature: sha256=&lt;hmac&gt;</code>.
            </p>
          </div>
        )}
      </div>

      <ul className="space-y-1">
        {hooks.map((h) => (
          <li
            key={h.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-2 py-2.5 hover:bg-[rgb(255_255_255/0.03)]"
          >
            <div className="text-sm">
              <span className="font-medium">{h.name}</span>{" "}
              <span className={h.active ? "text-[var(--success)]" : "text-muted-foreground"}>
                {h.active ? "aktif" : "nonaktif"}
              </span>
              <span className="ml-2 text-xs text-muted-foreground">
                {h.last_received_at
                  ? `terakhir ${new Date(h.last_received_at).toLocaleString("id-ID")}`
                  : "belum pernah dipakai"}
              </span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => onToggle(h)}>
                {h.active ? "Nonaktifkan" : "Aktifkan"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(h.id)}>
                Hapus
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {hooks.length === 0 && (
        <p className="text-sm text-muted-foreground">Belum ada endpoint.</p>
      )}

      <details className="rounded-2xl border border-[rgb(255_255_255/0.07)] p-4 text-sm" style={{ background: "var(--surface)" }}>
        <summary className="cursor-pointer text-sm font-medium">Contoh payload</summary>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-[rgb(0_0_0/0.35)] p-3 font-mono text-xs leading-relaxed">
{`POST {endpoint}  (event post.create)
H: x-webhook-signature: sha256=<hmac-sha256-hex(body)>
{
  "event": "post.create",
  "eventId": "n8n-2026-001",
  "data": {
    "title": "Promo",
    "mediaIds": ["<uuid>"],
    "targets": [{ "connectedAccountId": "<uuid>",
      "platform": "instagram", "caption": "Halo" }]
  }
}
# event lain: post.schedule {postId, scheduledAt, timezone},
# post.publish {postId} — semua 202 + idempotent per eventId`}
        </pre>
      </details>
    </div>
  );
}
