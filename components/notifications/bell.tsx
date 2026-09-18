"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

interface PreviewItem {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

/** Bell: popup preview + "Lihat semua Notifikasi" di bawah. */
export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PreviewItem[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/notifications?unread=1&limit=1");
        if (cancelled || !res.ok) return;
        const j = await res.json();
        setUnread(j.unread ?? 0);
      } catch {
        // Bell gagal diam-diam — bukan fitur kritis.
      }
    };
    void poll();
    const t = setInterval(poll, 60000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/notifications?limit=5")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j) setItems(j.data ?? []);
      })
      .catch(() => undefined);
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  async function openAll() {
    setOpen(false);
    router.push("/notifications");
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => undefined);
    setItems((list) => list.filter((n) => n.id !== id));
    setUnread((u) => Math.max(0, u - 1));
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifikasi (${unread} belum dibaca)`}
        aria-expanded={open}
        className="relative rounded-lg p-2 text-muted-foreground hover:bg-[rgb(255_255_255/0.06)] hover:text-foreground"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-medium text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="glass-panel absolute right-0 top-11 w-80 overflow-hidden rounded-xl">
          <p className="border-b border-border px-3 py-2.5 text-sm font-medium">Notifikasi</p>
          {items.length === 0 ? (
            <p className="px-3 py-5 text-center text-sm text-muted-foreground">
              Tidak ada notifikasi.
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className="block w-full px-3 py-2.5 text-left hover:bg-[rgb(255_255_255/0.05)]"
                  >
                    <span className="block truncate text-sm font-medium">{n.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{n.message}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("id-ID", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={openAll}
            className="block w-full border-t border-border px-3 py-2.5 text-center text-sm font-medium text-accent hover:bg-[rgb(255_255_255/0.05)]"
          >
            Lihat semua Notifikasi
          </button>
        </div>
      )}
    </div>
  );
}
