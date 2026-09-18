"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

/** Bell notifikasi + badge unread. */
export function NotificationBell() {
  const [unread, setUnread] = useState(0);

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

  return (
    <Link
      href="/notifications"
      aria-label={`Notifikasi (${unread} belum dibaca)`}
      className="relative rounded-lg p-2 text-muted-foreground hover:bg-[rgb(255_255_255/0.06)] hover:text-foreground"
    >
      <Bell size={18} />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-medium text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
