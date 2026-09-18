"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  FileText,
  Image,
  LayoutDashboard,
  Plus,
  Settings,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
  Zap,
  Bell,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";

interface Action {
  label: string;
  hint: string;
  href: string;
  icon: LucideIcon;
}

const ACTIONS: Action[] = [
  { label: "Buat postingan", hint: "Composer", href: "/posts/new", icon: Plus },
  { label: "Upload media", hint: "Media Library", href: "/media", icon: Upload },
  { label: "Buka kalender", hint: "Scheduler", href: "/schedule", icon: CalendarDays },
  { label: "Buka analytics", hint: "Insights", href: "/analytics", icon: BarChart3 },
  { label: "Connect account", hint: "Accounts", href: "/accounts", icon: Users },
  { label: "Cari post", hint: "Posts", href: "/posts", icon: FileText },
  { label: "Media library", hint: "Content", href: "/media", icon: Image },
  { label: "AI studio", hint: "Generate", href: "/ai", icon: Sparkles },
  { label: "Trending", hint: "Insights", href: "/trending", icon: TrendingUp },
  { label: "Automation", hint: "API & Webhooks", href: "/automation", icon: Zap },
  { label: "Notifikasi", hint: "System", href: "/notifications", icon: Bell },
  { label: "Dashboard", hint: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Settings", hint: "System", href: "/settings", icon: Settings },
];

export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const toggle = () =>
      setOpen((v) => {
        if (!v) {
          setQuery("");
          setIndex(0);
        }
        return !v;
      });
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onToggle = () => toggle();
    window.addEventListener("keydown", onKey);
    window.addEventListener("postpilot:command", onToggle);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("postpilot:command", onToggle);
    };
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open ]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ACTIONS;
    return ACTIONS.filter(
      (a) => a.label.toLowerCase().includes(q) || a.hint.toLowerCase().includes(q)
    );
  }, [query ]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Command menu">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div
        className="absolute left-1/2 top-[16vh] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-border shadow-2xl"
        style={{ background: "var(--surface-elevated)" }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && results[index]) {
              go(results[index].href);
            }
          }}
          placeholder="Ketik perintah atau cari halaman..."
          aria-label="Cari perintah"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <ul ref={listRef} className="max-h-72 overflow-y-auto p-1.5" role="listbox">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              Tidak ada hasil.
            </li>
          )}
          {results.map((a, i) => {
            const Icon = a.icon;
            return (
              <li key={a.href + a.label} role="option" aria-selected={i === index}>
                <button
                  type="button"
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => go(a.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm",
                    i === index ? "bg-[rgb(255_255_255/0.07)]" : "text-muted-foreground"
                  )}
                >
                  <Icon size={16} className={cn(i === index && "text-accent")} />
                  <span className={cn(i === index ? "text-foreground" : "text-muted-foreground")}>
                    {a.label}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">{a.hint}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          ↑↓ navigasi · Enter buka · Esc tutup
        </p>
      </div>
    </div>
  );
}
