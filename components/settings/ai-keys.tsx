"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface KeyMeta {
  id: string;
  provider: "openai" | "google";
  label: string | null;
  key_last4: string | null;
  created_at: string;
}

export function AIKeyManager() {
  const [keys, setKeys] = useState<KeyMeta[]>([]);
  const [provider, setProvider] = useState<"openai" | "google">("openai");
  const [label, setLabel] = useState("");
  const [rawKey, setRawKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai-keys")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => {
        if (!cancelled) setKeys(j.data ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  async function onAdd() {
    setError(null);
    if (rawKey.trim().length < 8) {
      setError("API key terlalu pendek.");
      return;
    }
    const res = await fetch("/api/ai-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, label: label.trim() || null, key: rawKey.trim() }),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok) {
      setError(j?.error ?? "Gagal menyimpan");
      return;
    }
    setRawKey("");
    setLabel("");
    refresh();
  }

  async function onDelete(id: string) {
    if (!window.confirm("Hapus API key ini? Generate yang berjalan ikut mati.")) return;
    await fetch(`/api/ai-keys/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2.5 rounded-2xl border border-[rgb(255_255_255/0.07)] p-4" style={{ background: "var(--surface)" }}>
        <h3 className="text-sm font-medium">Tambah API key (milikmu sendiri)</h3>
        <div className="flex flex-wrap gap-2">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as "openai" | "google")}
            aria-label="Provider AI"
            className="rounded-lg border border-[rgb(255_255_255/0.08)] bg-[rgb(255_255_255/0.03)] px-3 py-2 text-sm"
          >
            <option value="openai">OpenAI</option>
            <option value="google">Google (Gemini/Veo)</option>
          </select>
          <Input
            placeholder="Label (opsional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="max-w-xs border-[rgb(255_255_255/0.08)] bg-[rgb(255_255_255/0.03)]"
          />
        </div>
        <Input
          type="password"
          placeholder="sk-... / AIza..."
          value={rawKey}
          onChange={(e) => setRawKey(e.target.value)}
          autoComplete="off"
          className="border-[rgb(255_255_255/0.08)] bg-[rgb(255_255_255/0.03)] font-mono"
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button size="sm" onClick={onAdd}>
          Simpan terenkripsi
        </Button>
        <p className="text-xs text-muted-foreground">
          Key dienkripsi AES-256-GCM dan tidak pernah ditampilkan lagi.
        </p>
      </div>

      <ul className="space-y-1">
        {keys.map((k) => (
          <li
            key={k.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-2 py-2.5 hover:bg-[rgb(255_255_255/0.03)]"
          >
            <div className="text-sm">
              <span className="mr-2 rounded-full bg-[rgb(255_255_255/0.07)] px-2 py-0.5 text-[11px] uppercase text-muted-foreground">{k.provider}</span>
              {k.label ?? "—"}
              <span className="ml-2 font-mono text-xs text-muted-foreground">••••{k.key_last4}</span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onDelete(k.id)}>
              Hapus
            </Button>
          </li>
        ))}
      </ul>
      {keys.length === 0 && (
        <p className="text-sm text-muted-foreground">Belum ada API key.</p>
      )}
    </div>
  );
}
