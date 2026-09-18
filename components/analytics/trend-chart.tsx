"use client";

import { useEffect, useState } from "react";

interface Point {
  fetched_at: string;
  likes: number | null;
  views: number | null;
}

const W = 560;
const H = 220;
const PAD = { top: 12, right: 12, bottom: 26, left: 40 };

/** Grafik tren likes & views (SVG murni, tanpa dependency). */
export function TrendChart({ platformId }: { platformId: string }) {
  const [points, setPoints] = useState<Point[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/analytics/history?platformId=${platformId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j) setPoints(j.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [platformId]);

  if (error) {
    return <p className="text-sm text-destructive">Grafik gagal dimuat.</p>;
  }
  const clean = points.filter((p) => p.likes !== null || p.views !== null);
  if (clean.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada riwayat — refresh analytics 2× untuk melihat tren.
      </p>
    );
  }

  const max = Math.max(
    1,
    ...clean.map((p) => Math.max(p.likes ?? 0, p.views ?? 0))
  );
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i: number) =>
    clean.length === 1 ? PAD.left + iw / 2 : PAD.left + (i / (clean.length - 1)) * iw;
  const y = (v: number) => PAD.top + ih - (v / max) * ih;

  const line = (get: (p: Point) => number | null) =>
    clean
      .map((p, i) => {
        const v = get(p);
        return v === null ? null : `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(" ");

  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Tren likes dan views">
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left} x2={W - PAD.right}
              y1={y(t)} y2={y(t)}
              stroke="rgb(255 255 255 / 0.07)"
            />
            <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">
              {t >= 1000 ? `${(t / 1000).toFixed(1)}k` : t}
            </text>
          </g>
        ))}
        <path d={line((p) => p.views)} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
        <path d={line((p) => p.likes)} fill="none" stroke="#f472b6" strokeWidth="2" strokeLinejoin="round" />
        {clean.map((p, i) => (
          <g key={p.fetched_at + i}>
            {p.views !== null && <circle cx={x(i)} cy={y(p.views)} r="3" fill="var(--accent)" />}
            {p.likes !== null && <circle cx={x(i)} cy={y(p.likes)} r="3" fill="#f472b6" />}
          </g>
        ))}
        <text x={PAD.left} y={H - 8} fontSize="10" fill="var(--text-muted)">
          {new Date(clean[0].fetched_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
        </text>
        <text x={W - PAD.right} y={H - 8} fontSize="10" textAnchor="end" fill="var(--text-muted)">
          {new Date(clean[clean.length - 1].fetched_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
        </text>
      </svg>
      <figcaption className="mt-1 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-accent" /> Views
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-[#f472b6]" /> Likes
        </span>
      </figcaption>
    </figure>
  );
}
