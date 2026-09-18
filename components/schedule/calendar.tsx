"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlatformBadge, StatusBadge } from "@/components/content/badges";
import {
  COMMON_TIMEZONES,
  dayKeyInTz,
  timeInTz,
  toLocalInputValue,
  zonedWallToUtc,
} from "@/components/schedule/time";

interface CalendarItem {
  queueId: string;
  platformId: string;
  postId: string;
  postTitle: string | null;
  platform: string;
  username: string | null;
  status: string;
  scheduledAt: string;
}

interface DraftPost {
  id: string;
  title: string | null;
  status: string;
}

function monthCells(year: number, month: number): Date[] {
  const first = new Date(Date.UTC(year, month, 1));
  const startDay = (first.getUTCDay() + 6) % 7; // Senin = 0
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(Date.UTC(year, month, 1 - startDay + i)));
  }
  return cells;
}

export function ScheduleCalendar({ initialTimezone }: { initialTimezone: string }) {
  const [timezone, setTimezone] = useState(initialTimezone);
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [drafts, setDrafts] = useState<DraftPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draftWhen, setDraftWhen] = useState<Record<string, string>>({});
  const [reloadToken, setReloadToken] = useState(0);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const refresh = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const from = new Date(Date.UTC(year, month - 1, 1)).toISOString();
      const to = new Date(Date.UTC(year, month + 2, 0, 23, 59, 59)).toISOString();
      const res = await fetch(`/api/schedule?from=${from}&to=${to}`);
      if (!cancelled && res.ok) {
        const j = await res.json();
        setItems(j.data ?? []);
      }
      const posts = await fetch("/api/posts?perPage=100").then((r) =>
        r.ok ? r.json() : { data: [] }
      );
      if (cancelled) return;
      setDrafts((posts.data ?? []).filter((p: DraftPost) => p.status === "draft"));
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [year, month, reloadToken]);

  async function changeTimezone(tz: string) {
    setTimezone(tz);
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: tz }),
    }).catch(() => undefined);
  }

  async function reschedulePost(postId: string, utc: Date) {
    setError(null);
    const res = await fetch(`/api/posts/${postId}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt: utc.toISOString(), timezone }),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok) {
      setError(j?.error ?? "Reschedule gagal");
      return;
    }
    refresh();
  }

  function onDropDay(dayKey: string, e: React.DragEvent) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/postpilot-post");
    if (!raw) return;
    const { postId, scheduledAt } = JSON.parse(raw) as { postId: string; scheduledAt: string };
    const prev = new Date(scheduledAt);
    // Pertahankan jam asal, pindah tanggal (dalam tz terpilih).
    const time = toLocalInputValue(prev, timezone).slice(11);
    const utc = zonedWallToUtc(dayKey, time, timezone);
    void reschedulePost(postId, utc);
  }

  async function scheduleDraft(postId: string) {
    const val = draftWhen[postId];
    if (!val) {
      setError("Isi tanggal & jam dulu.");
      return;
    }
    const [d, t] = val.split("T");
    await reschedulePost(postId, zonedWallToUtc(d, t, timezone));
  }

  async function cancelPost(postId: string) {
    if (!window.confirm("Batalkan jadwal post ini?")) return;
    await fetch(`/api/posts/${postId}/cancel`, { method: "POST" });
    refresh();
  }

  const byDay = new Map<string, CalendarItem[]>();
  for (const it of items) {
    const k = dayKeyInTz(new Date(it.scheduledAt), timezone);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(it);
  }

  const weekStart = (() => {
    const d = new Date(cursor);
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label="Tampilan kalender"
          className="flex rounded-xl bg-[rgb(255_255_255/0.04)] p-1"
        >
          {(["month", "week"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                view === v
                  ? "bg-[rgb(255_255_255/0.09)] font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "month" ? "Bulanan" : "Mingguan"}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
          Hari ini
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="sm" aria-label="Bulan lalu"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          >
            ←
          </Button>
          <span className="min-w-32 text-center text-sm font-medium">
            {cursor.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
          </span>
          <Button
            variant="ghost" size="sm" aria-label="Bulan depan"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
          >
            →
          </Button>
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          Zona waktu
          <select
            value={timezone}
            onChange={(e) => changeTimezone(e.target.value)}
            className="rounded-lg border border-[rgb(255_255_255/0.08)] bg-[rgb(255_255_255/0.03)] px-2 py-1.5 text-sm text-foreground"
          >
            {!COMMON_TIMEZONES.includes(timezone) && <option value={timezone}>{timezone}</option>}
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {view === "month" ? (
        <div className="grid grid-cols-7 gap-1">
          {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
            <p key={d} className="p-1 text-center text-xs text-muted-foreground">{d}</p>
          ))}
          {monthCells(year, month).map((day) => {
            // Kunci hari dihitung dalam tz terpilih (tengah hari UTC anti-geser batas).
            const noon = new Date(
              Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12)
            );
            const key = dayKeyInTz(noon, timezone);
            const dayItems = byDay.get(key) ?? [];
            const inMonth = day.getUTCMonth() === month;
            return (
              <div
                key={key + day.getTime()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDropDay(key, e)}
                className={`min-h-20 rounded-xl p-1.5 transition-colors ${inMonth ? "hover:bg-[rgb(255_255_255/0.025)]" : "opacity-35"}`}
              >
                <p className="text-xs text-muted-foreground">{day.getUTCDate()}</p>
                {dayItems.map((it) => (
                  <div
                    key={it.queueId}
                    draggable={it.status === "pending"}
                    onDragStart={(e) =>
                      e.dataTransfer.setData(
                        "text/postpilot-post",
                        JSON.stringify({ postId: it.postId, scheduledAt: it.scheduledAt })
                      )
                    }
                    title={`${it.postTitle ?? ""} (${it.status})`}
                    className={`mb-1 flex items-center gap-1 truncate rounded-lg px-1.5 py-0.5 text-xs ${
                      it.status === "pending"
                        ? "cursor-grab bg-[rgb(59_130_246/0.12)] text-foreground"
                        : "bg-[rgb(255_255_255/0.04)] text-muted-foreground"
                    }`}
                  >
                    {timeInTz(new Date(it.scheduledAt), timezone)} {it.postTitle ?? "(tanpa judul)"}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {weekDays.map((day) => {
            const dayItems = items.filter((it) => {
              const d = new Date(it.scheduledAt);
              const local = new Date(d.toLocaleString("en-US", { timeZone: timezone }));
              return (
                local.getFullYear() === day.getFullYear() &&
                local.getMonth() === day.getMonth() &&
                local.getDate() === day.getDate()
              );
            });
            return (
              <section key={day.toISOString()}>
                <p className="text-sm font-medium text-muted-foreground">
                  {day.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })}
                </p>
                {dayItems.length === 0 && (
                  <p className="text-sm text-muted-foreground">Kosong.</p>
                )}
                {dayItems.map((it) => (
                  <div key={it.queueId} className="mt-1.5 flex flex-wrap items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-[rgb(255_255_255/0.03)]">
                    <PlatformBadge platform={it.platform} />
                    <span className="tnum text-muted-foreground">{timeInTz(new Date(it.scheduledAt), timezone)}</span>
                    <span className="font-medium">{it.postTitle ?? "(tanpa judul)"}</span>
                    <StatusBadge status={it.status} />
                    {it.status === "pending" && (
                      <>
                        <input
                          type="datetime-local"
                          defaultValue={toLocalInputValue(new Date(it.scheduledAt), timezone)}
                          onChange={(e) => {
                            const [d, t] = e.target.value.split("T");
                            if (d && t) void reschedulePost(it.postId, zonedWallToUtc(d, t, timezone));
                          }}
                          className="rounded border border-input bg-background px-2 py-1 text-xs"
                        />
                        <Button variant="ghost" size="sm" onClick={() => cancelPost(it.postId)}>
                          Batal
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Draft (belum terjadwal)</h2>
        {drafts.length === 0 && (
          <p className="text-sm text-muted-foreground">Tidak ada draft.</p>
        )}
        {drafts.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{d.title ?? "(tanpa judul)"}</span>
            <input
              type="datetime-local"
              value={draftWhen[d.id] ?? ""}
              onChange={(e) => setDraftWhen((s) => ({ ...s, [d.id]: e.target.value }))}
              className="rounded border border-input bg-background px-2 py-1 text-xs"
            />
            <Button size="sm" onClick={() => scheduleDraft(d.id)}>
              Jadwalkan
            </Button>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          Minimal 1 jam dari sekarang, maksimal 30 hari. Publish Now ada di halaman detail post.
        </p>
      </section>
    </div>
  );
}
