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
      { href: "/posts", label: "Posts", icon: FileText },
      { href: "/media", label: "Media", icon: Image },
      { href: "/posts/new", label: "Create", icon: Plus },
    ],
  },
  {
    title: "Planning",
    entries: [{ href: "/schedule", label: "Calendar", icon: CalendarDays }],
  },
  {
    title: "Insights",
    entries: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/trending", label: "Trending", icon: TrendingUp },
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
    entries: [{ href: "/accounts", label: "Connected", icon: Users }],
  },
  {
    title: "System",
    entries: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

/** Judul konteks topbar dari path. */
export function titleForPath(pathname: string): string {
  for (const g of NAV_GROUPS) {
    for (const e of g.entries) {
      if (e.href === "/" ? pathname === "/" : pathname === e.href || pathname.startsWith(e.href + "/")) {
        return e.label;
      }
    }
  }
  if (pathname.startsWith("/notifications")) return "Notifications";
  return "PostPilot";
}
