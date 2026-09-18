"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface KeyMeta {
  id: string;
  provider: "openai" | "google";
  label: string | null;
  key_last4: string | null;
}

type Kind = "caption" | "image" | "video";

export function AIStudio() {
  const [keys, setKeys] = useState<KeyMeta[]>([]);
  const [keyId, setKeyId] = useState("");
  const [kind, setKind] = useState<Kind>("caption");
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<"square" | "portrait" | "landscape">("square");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [captions, setCaptions] = useState<string[]>([]);
  const [imageId, setImageId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai-keys")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => {
        setKeys(j.data ?? []);
        if (j.data?.length === 1) setKeyId(j.data[0].id);
      })
      .catch(() => undefined);
  }, []);

  async function onGenerate() {
    setError(null);
    setCaptions([]);
    setImageId(null);
    setImageUrl(null);
    setVideoStatus(null);
    if (!keyId) {
      setError("Pilih API key dulu (tambah di Settings).");
      return;
    }
    if (!prompt.trim()) {
      setError("Prompt tidak boleh kosong.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId, kind, prompt: prompt.trim(), size }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error ?? "Generate gagal");
      if (kind === "caption") setCaptions(j.options ?? []);
      else if (kind === "image" && j.asset) {
        setImageId(j.asset.id);
        const pv = await fetch(`/api/media/${j.asset.id}/preview`).then((r) => r.json());
        setImageUrl(pv.url ?? null);
      } else if (kind === "video") {
        setVideoStatus(`Processing (operasi ${String(j.operationId).slice(0, 40)}…). Cek berkala — worker ikut pantau.`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="flex gap-1">
          {(["caption", "image", "video"] as Kind[]).map((k) => (
            <Button key={k} size="sm" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)}>
              {k === "caption" ? "Caption" : k === "image" ? "Gambar" : "Video"}
            </Button>
          ))}
        </div>
        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada API key. <Link href="/settings" className="underline">Tambah di Settings</Link>.
          </p>
        ) : (
          <select
            value={keyId}
            onChange={(e) => setKeyId(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— Pilih API key —</option>
            {keys.map((k) => (
              <option key={k.id} value={k.id}>
                {k.provider} · {k.label ?? "tanpa label"} · ••••{k.key_last4}
              </option>
            ))}
          </select>
        )}
        <textarea
          rows={4}
          maxLength={2000}
          placeholder="Tulis prompt, mis. foto produk kopi susu aesthetic pagi hari"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        {kind === "image" && (
          <select
            value={size}
            onChange={(e) => setSize(e.target.value as "square" | "portrait" | "landscape")}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="square">Kotak (1:1)</option>
            <option value="portrait">Potrait (9:16)</option>
            <option value="landscape">Landscape (16:9)</option>
          </select>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button onClick={onGenerate} disabled={busy}>
          {busy ? "Memproses..." : "Generate"}
        </Button>
      </div>

      <div className="space-y-3">
        <h2 className="font-medium">Hasil</h2>
        {captions.map((c, i) => (
          <div key={i} className="flex items-start justify-between gap-2 rounded-xl border border-border bg-card p-3">
            <p className="text-sm">{c}</p>
            <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(c)}>
              Salin
            </Button>
          </div>
        ))}
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="hasil AI" className="max-w-full rounded-xl border border-border" />
        )}
        {imageId && (
          <p className="text-sm text-muted-foreground">
            Tersimpan di <Link href="/media" className="underline">Media Library</Link>.
          </p>
        )}
        {videoStatus && <p className="text-sm text-muted-foreground">{videoStatus}</p>}
        {kind === "video" && (
          <p className="text-xs text-muted-foreground">
            Video butuh plan berbayar Google dan waktu render bermenit-menit.
          </p>
        )}
      </div>
    </div>
  );
}
