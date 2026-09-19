import {
  BarChart3,
  CalendarDays,
  Image,
  LayoutDashboard,
  Plus,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface NavEntry {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  entries: NavEntry[];
}

/** Hanya route yang benar-benar ada. */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    entries: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Content",
    entries: [
      { href: "/posts/new", label: "Posting Baru", icon: Plus },
      { href: "/media", label: "Media", icon: Image },
    ],
  },
  {
    title: "Planning",
    entries: [{ href: "/schedule", label: "Kalender", icon: CalendarDays }],
  },
  {
    title: "Insights",
    entries: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/trending", label: "Tren & Insight", icon: TrendingUp },
    ],
  },
  {
    title: "AI",
    entries: [{ href: "/ai", label: "AI Studio", icon: Sparkles }],
  },
  {
    title: "Automation",
    entries: [{ href: "/automation", label: "API & Webhooks", icon: Zap }],
  },
  {
    title: "Accounts",
    entries: [{ href: "/accounts", label: "Akun Terhubung", icon: Users }],
  },
  {
    title: "Settings",
    entries: [{ href: "/settings", label: "Pengaturan", icon: Settings }],
  },
];

/** Entry dengan href terpanjang yang cocok — hanya satu yang aktif. */
export function activeHrefForPath(pathname: string): string | null {
  let best: string | null = null;
  for (const g of NAV_GROUPS) {
    for (const e of g.entries) {
      const match =
        e.href === "/" ? pathname === "/" : pathname === e.href || pathname.startsWith(e.href + "/");
      if (match && (!best || e.href.length > best.length)) {
        best = e.href;
      }
    }
  }
  return best;
}

/** Judul konteks topbar dari path. */
export function titleForPath(pathname: string): string {
  if (pathname === "/posts" || pathname.startsWith("/posts/")) return "Posts";
  const active = activeHrefForPath(pathname);
  if (active) {
    for (const g of NAV_GROUPS) {
      const found = g.entries.find((e) => e.href === active);
      if (found) return found.label;
    }
  }
  if (pathname.startsWith("/notifications")) return "Notifications";
  return "PostPilot";
}
