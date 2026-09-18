"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Menu, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NotificationBell } from "@/components/notifications/bell";
import { titleForPath } from "@/components/shell/nav";

export function Topbar({ email, onMenu }: { email: string; onMenu: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [accountOpen, setAccountOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountOpen ]);

  async function onLogout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initial = (email.trim()[0] ?? "?").toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-[rgb(255_255_255/0.07)] bg-[rgb(10_14_20/0.72)] backdrop-blur-xl [box-shadow:inset_0_1px_0_rgb(255,255,255,0.05)]">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:px-6">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Buka navigasi"
          className="rounded-lg p-2 text-muted-foreground hover:bg-[rgb(255_255_255/0.06)] hover:text-foreground lg:hidden"
        >
          <Menu size={18} />
        </button>
        <h1 className="truncate text-sm font-medium text-foreground">{titleForPath(pathname)}</h1>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("postpilot:command"))}
            className="hidden w-56 items-center gap-2 rounded-xl border border-[rgb(255_255_255/0.07)] bg-[rgb(255_255_255/0.03)] px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-[rgb(255_255_255/0.14)] hover:text-foreground sm:flex"
          >
            <Search size={14} />
            <span>Cari / perintah</span>
            <kbd className="rounded border border-border px-1.5 font-mono text-[11px]">⌘K</kbd>
          </button>
          <NotificationBell />
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setAccountOpen((v) => !v)}
              aria-label="Menu akun"
              aria-expanded={accountOpen}
              className="flex items-center gap-1 rounded-lg p-1 hover:bg-[rgb(255_255_255/0.06)]"
            >
              <span className="grid size-8 place-items-center rounded-full bg-[rgb(255_255_255/0.09)] text-sm font-medium">
                {initial}
              </span>
              <ChevronDown size={14} className="text-muted-foreground" />
            </button>
            {accountOpen && (
              <div className="glass-panel absolute right-0 top-11 w-56 overflow-hidden rounded-xl">
                <p className="truncate border-b border-border px-3 py-2.5 text-xs text-muted-foreground">{email}</p>
                <Link
                  href="/settings"
                  onClick={() => setAccountOpen(false)}
                  className="block px-3 py-2 text-sm hover:bg-[rgb(255_255_255/0.06)]"
                >
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-[rgb(255_255_255/0.06)]"
                >
                  <LogOut size={14} />
                  Keluar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
