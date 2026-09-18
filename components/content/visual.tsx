"use client";

import { useEffect, useId, useState } from "react";
import { Image as ImageIcon } from "lucide-react";

/** Thumbnail media dari signed preview URL (lazy per item). */
export function Thumb({
  assetId,
  mediaType,
  alt,
  className,
}: {
  assetId: string;
  mediaType: "image" | "video" | string;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/media/${assetId}/preview`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j?.url) setUrl(j.url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  if (!url) {
    return (
      <span
        aria-label="Memuat thumbnail"
        className={`grid place-items-center bg-[rgb(255_255_255/0.04)] ${className ?? ""}`}
      >
        <ImageIcon size={16} className="text-muted-foreground" />
      </span>
    );
  }
  if (mediaType === "video") {
    return <video src={url} preload="metadata" className={`object-cover ${className ?? ""}`} aria-label={alt} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} loading="lazy" className={`object-cover ${className ?? ""}`} />;
}

/** Sparkline mini: garis tipis tanpa axis/clutter. */
export function Sparkline({
  values,
  width = 120,
  height = 32,
  stroke = "var(--accent)",
  label,
}: {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  label: string;
}) {
  const gid = `spark-${useId().replace(/:/g, "")}`;
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);
  const pts = values.map(
    (v, i) =>
      `${(i * stepX).toFixed(1)},${(height - 3 - ((v - min) / span) * (height - 6)).toFixed(1)}`
  );
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p}`).join(" ");
  const area = `${line} L${width.toFixed(1)},${height} L0,${height} Z`;
  const last = values[values.length - 1];
  const lastY = height - 3 - ((last - min) / span) * (height - 6);
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={label}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={lastY} r="2.5" fill={stroke} />
    </svg>
  );
}
