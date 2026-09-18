"use client";

import { useEffect, useState } from "react";

/** Ritme posting mingguan: hitungan per hari Sen–Min (bukan kalender penuh). */
export function WeeklyRhythm() {
  const [counts, setCounts] = useState<number[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const now = new Date();
      const dow = (now.getDay() + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - dow);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      const res = await fetch(
        `/api/schedule?from=${monday.toISOString()}&to=${sunday.toISOString()}`
      );
      if (cancelled || !res.ok) return;
      const j = await res.json();
      const days: number[] = [0, 0, 0, 0, 0, 0, 0];
      for (const it of j.data ?? []) {
        const d = new Date(it.scheduledAt);
        const idx = (d.getDay() + 6) % 7;
        days[idx]++;
      }
      setCounts(days);
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const labels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const todayIdx = (new Date().getDay() + 6) % 7;

  return (
    <section aria-label="Ritme posting mingguan">
      <h2 className="text-sm font-medium text-muted-foreground">Ritme minggu ini</h2>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {(counts ?? [0, 0, 0, 0, 0, 0, 0]).map((n, i) => (
          <div
            key={labels[i]}
            className={`flex flex-col items-center gap-1 rounded-lg py-2 ${
              i === todayIdx ? "bg-[rgb(255_255_255/0.05)]" : ""
            }`}
          >
            <span className="text-[11px] text-muted-foreground">{labels[i]}</span>
            <span className="tnum text-sm font-medium">{counts === null ? "–" : n}</span>
            <span
              aria-hidden
              className={`size-1.5 rounded-full ${n > 0 ? "bg-accent" : "bg-[rgb(255_255_255/0.10)]"}`}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
