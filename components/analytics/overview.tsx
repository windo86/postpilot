"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { TrendChart } from "@/components/analytics/trend-chart";

interface Metrics {
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  views: number | null;
  reach: number | null;
  impressions: number | null;
  fetched_at: string;
}

interface Row {
  platformId: string;
  postId: string;
  postTitle: string | null;
  platform: string;
  username: string | null;
  publishedAt: string | null;
  metrics: Metrics | null;
}

function fmt(v: number | null): string {
  return v === null || v === undefined ? "N/A" : v.toLocaleString("id-ID");
}

export function AnalyticsOverview() {
  const [platform, setPlatform] = useState<"" | "instagram" | "tiktok">("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trendId, setTrendId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refreshList = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const q = platform ? `?platform=${platform}` : "";
      const res = await fetch(`/api/analytics${q}`);
      if (cancelled) return;
      if (!res.ok) {
        setError("Gagal memuat analytics.");
        return;
      }
      const j = await res.json();
      setRows(j.data ?? []);
      setTrendId((prev) => prev ?? j.data?.[0]?.platformId ?? null);
    })().catch(() => {
      if (!cancelled) setError("Gagal memuat analytics.");
    });
    return () => {
      cancelled = true;
    };
  }, [platform, reloadToken]);

  async function refresh(platformId: string) {
    setBusy(platformId);
    setError(null);
    const res = await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platformId, force: true }),
    });
    const j = await res.json().catch(() => null);
    setBusy(null);
    if (!res.ok) {
      setError(j?.error ?? "Refresh gagal");
      return;
    }
    refreshList();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as "" | "instagram" | "tiktok")}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Semua platform</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
        </select>
        <a
          href={platform ? `/api/analytics/export?platform=${platform}` : "/api/analytics/export"}
          className="rounded-lg border border-input px-3 py-2 text-sm"
        >
          Export CSV
        </a>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Belum ada post published. Metrik muncul setelah worker publish.
        </p>
      )}

      {rows.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">Tren performa</h2>
            <select
              value={trendId ?? ""}
              onChange={(e) => setTrendId(e.target.value || null)}
              className="max-w-xs rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
              aria-label="Pilih post untuk grafik"
            >
              {rows.map((r) => (
                <option key={r.platformId} value={r.platformId}>
                  {(r.postTitle ?? "(tanpa judul)").slice(0, 40)} · {r.platform}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3">
            {trendId && <TrendChart platformId={trendId} />}
          </div>
        </section>
      )}

      {rows.map((r) => (
        <article key={r.platformId} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">{r.postTitle ?? "(tanpa judul)"}</p>
              <p className="text-sm text-muted-foreground">
                {r.platform} · {r.username ?? "—"} ·{" "}
                {r.publishedAt ? new Date(r.publishedAt).toLocaleString("id-ID") : "—"}
              </p>
            </div>
            <Button size="sm" variant="outline" disabled={busy === r.platformId} onClick={() => refresh(r.platformId)}>
              {busy === r.platformId ? "Me-refresh..." : "Refresh"}
            </Button>
          </div>
          {r.metrics ? (
            <>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm sm:grid-cols-4">
                {(
                  [
                    ["Likes", r.metrics.likes],
                    ["Comments", r.metrics.comments],
                    ["Shares", r.metrics.shares],
                    ["Saves", r.metrics.saves],
                    ["Views", r.metrics.views],
                    ["Reach", r.metrics.reach],
                    ["Impressions", r.metrics.impressions],
                  ] as [string, number | null][]
                ).map(([label, v]) => (
                  <div key={label} className="rounded-lg bg-muted p-2">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-medium">{fmt(v)}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-xs text-muted-foreground">
                Diperbarui: {new Date(r.metrics.fetched_at).toLocaleString("id-ID")}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Belum ada data (TikTok menyusul, atau belum di-refresh).
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
