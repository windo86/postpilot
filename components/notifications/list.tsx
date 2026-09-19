"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface Item {
  id: string;
  title: string;
  message: string;
  type: string;
  read_at: string | null;
  created_at: string;
}

export function NotificationList() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/notifications?limit=50");
      if (cancelled) return;
      if (!res.ok) {
        setError("Gagal memuat notifikasi.");
        return;
      }
      const j = await res.json();
      setItems(j.data ?? []);
    })().catch(() => {
      if (!cancelled) setError("Gagal memuat notifikasi.");
    });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    refresh();
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    refresh();
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {items.some((i) => !i.read_at) && (
        <Button size="sm" variant="outline" onClick={markAllRead}>
          Tandai semua dibaca
        </Button>
      )}
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">Belum ada notifikasi.</p>
      )}
      {items.map((n) => (
        <article
          key={n.id}
          className={`rounded-2xl border px-4 py-3 ${
            n.read_at
              ? "border-[rgb(255_255_255/0.05)] opacity-60"
              : "border-accent/30"
          }`}
          style={{ background: "var(--surface)" }}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">{n.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(n.created_at).toLocaleString("id-ID")}
              </p>
            </div>
            {!n.read_at && (
              <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>
                Tandai dibaca
              </Button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
