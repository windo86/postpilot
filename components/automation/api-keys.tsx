"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface KeyMeta {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export function ApiKeyManager() {
  const [keys, setKeys] = useState<KeyMeta[]>([]);
  const [name, setName] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/api-keys")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => {
        if (!cancelled) setKeys(j.data ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  async function onCreate() {
    setError(null);
    setFreshKey(null);
    if (!name.trim()) {
      setError("Nama wajib diisi (mis. n8n-prod).");
      return;
    }
    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok) {
      setError(j?.error ?? "Gagal membuat key");
      return;
    }
    setFreshKey(j.rawKey);
    setName("");
    refresh();
  }

  async function onRevoke(id: string) {
    if (!window.confirm("Revoke key ini? Integrasi yang memakainya langsung mati.")) return;
    await fetch(`/api/api-keys/${id}/revoke`, { method: "POST" });
    refresh();
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2.5 rounded-2xl border border-[rgb(255_255_255/0.07)] p-4" style={{ background: "var(--surface)" }}>
        <h3 className="text-sm font-medium">Buat API key (untuk n8n / tool lain)</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Nama, mis. n8n-prod"
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
        {freshKey && (
          <p role="status" className="rounded-xl bg-[rgb(59_130_246/0.10)] p-3 font-mono text-sm break-all">
            {freshKey}
            <span className="mt-1 block font-sans text-muted-foreground">
              Salin sekarang — tidak akan ditampilkan lagi.
            </span>
          </p>
        )}
      </div>

      <ul className="space-y-1">
        {keys.map((k) => (
          <li
            key={k.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-2 py-2.5 hover:bg-[rgb(255_255_255/0.03)]"
          >
            <div className="text-sm">
              <span className="font-medium">{k.name}</span>{" "}
              <span className="font-mono text-xs text-muted-foreground">{k.key_prefix}…</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {k.revoked_at ? "revoked" : k.last_used_at ? `dipakai ${new Date(k.last_used_at).toLocaleDateString("id-ID")}` : "belum dipakai"}
              </span>
            </div>
            {!k.revoked_at && (
              <Button size="sm" variant="ghost" onClick={() => onRevoke(k.id)}>
                Revoke
              </Button>
            )}
          </li>
        ))}
      </ul>
      {keys.length === 0 && (
        <p className="text-sm text-muted-foreground">Belum ada API key.</p>
      )}

      <details className="rounded-2xl border border-[rgb(255_255_255/0.07)] p-4 text-sm" style={{ background: "var(--surface)" }}>
        <summary className="cursor-pointer text-sm font-medium">Contoh request (n8n / curl)</summary>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-[rgb(0_0_0/0.35)] p-3 font-mono text-xs leading-relaxed">
{`# Buat post (Idempotency-Key opsional, aman retry)
curl -X POST https://APP/api/v1/posts \\
  -H "Authorization: Bearer pp_live_..." \\
  -H "Idempotency-Key: n8n-001" \\
  -H "Content-Type: application/json" \\
  -d '{"mediaIds":["<uuid>"],"targets":[{"connectedAccountId":"<uuid>","platform":"instagram","caption":"Halo"}]}'

# Jadwalkan (202) / publish now (202) / status (200)
curl -X POST https://APP/api/v1/posts/<id>/schedule \\
  -H "Authorization: Bearer pp_live_..." \\
  -d '{"scheduledAt":"2026-09-20T07:00:00Z","timezone":"Asia/Jakarta"}'`}
        </pre>
      </details>
    </div>
  );
}
