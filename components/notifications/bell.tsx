"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
      className="relative rounded-lg border border-input px-3 py-2 text-sm"
    >
      🔔
      {unread > 0 && (
        <span className="absolute -right-2 -top-2 rounded-full bg-destructive px-1.5 text-xs text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
