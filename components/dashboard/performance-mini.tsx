"use client";

import { useEffect, useState } from "react";
import { Sparkline } from "@/components/content/visual";

/** Mini performance snapshot: angka + sparkline views (disembunyikan bila kosong). */
export function PerformanceMini() {
  const [views, setViews] = useState<number[] | null>(null);
  const [totals, setTotals] = useState({ likes: 0, views: 0, shares: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/analytics");
      if (cancelled || !res.ok) return;
      const j = await res.json();
      const rows = (j.data ?? []) as {
        platformId: string;
        metrics: { likes: number | null; views: number | null; shares: number | null } | null;
      }[];
      let likes = 0;
      let viewTotal = 0;
      let shares = 0;
      for (const r of rows) {
        likes += r.metrics?.likes ?? 0;
        viewTotal += r.metrics?.views ?? 0;
        shares += r.metrics?.shares ?? 0;
      }
      if (!cancelled) setTotals({ likes, views: viewTotal, shares });
      const withMetrics = rows.find((r) => r.metrics);
      if (!withMetrics) {
        if (!cancelled) setViews([]);
        return;
      }
      const h = await fetch(`/api/analytics/history?platformId=${withMetrics.platformId}`);
      if (cancelled || !h.ok) return;
      const hj = await h.json();
      const vs = ((hj.data ?? []) as { views: number | null }[])
        .map((s) => s.views)
        .filter((v): v is number => v !== null);
      if (!cancelled) setViews(vs);
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-label="Performa">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">Performa</h2>
          <p className="tnum mt-1 text-2xl font-semibold tracking-tight">
            {totals.views.toLocaleString("id-ID")}
            <span className="ml-1 text-sm font-normal text-muted-foreground">views</span>
          </p>
        </div>
        {views !== null && views.length >= 2 && (
          <Sparkline values={views} label="Tren views" />
        )}
      </div>
      <div className="mt-2 flex gap-4 text-sm">
        <span>
          <span className="tnum font-medium">{totals.likes.toLocaleString("id-ID")}</span>{" "}
          <span className="text-muted-foreground">likes</span>
        </span>
        <span>
          <span className="tnum font-medium">{totals.shares.toLocaleString("id-ID")}</span>{" "}
          <span className="text-muted-foreground">shares</span>
        </span>
      </div>
    </section>
  );
}
