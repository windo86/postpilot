"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { NAV_GROUPS, activeHrefForPath } from "@/components/shell/nav";
import { cn } from "cn";

function isActive(pathname: string, href: string): boolean {
  return activeHrefForPath(pathname) === href;
}

function SidebarBody({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <Link
        href="/"
        onClick={onNavigate}
        aria-label="PostPilot"
        className="flex h-14 items-center justify-center border-b border-sidebar-border px-3"
      >
        <Image
          src="/logo.png"
          alt="PostPilot"
          width={407}
          height={145}
          priority
          className={collapsed ? "h-8 w-auto max-w-[56px] object-contain" : "h-10 w-auto max-w-[190px] object-contain"}
        />
      </Link>

      <nav aria-label="Navigasi utama" className="flex-1 space-y-4 overflow-y-auto p-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground">
                {group.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.entries.map((entry) => {
                const active = isActive(pathname, entry.href);
                const Icon = entry.icon;
                return (
                  <li key={entry.href}>
                    <Link
                      href={entry.href}
                      onClick={onNavigate}
                      title={collapsed ? entry.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                        collapsed && "justify-center px-0",
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                        />
                      )}
                      <Icon size={17} strokeWidth={active ? 2.25 : 2} className={cn(active && "text-accent")} />
                      {!collapsed && entry.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}) {
  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "glass-panel sticky top-0 hidden h-screen shrink-0 rounded-none border-y-0 border-l-0 transition-[width] duration-200 lg:block",
          collapsed ? "w-[68px]" : "w-[232px]"
        )}
      >
        <SidebarBody collapsed={collapsed} />
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"}
          className="absolute -right-3 top-16 grid size-6 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground"
          style={{ background: "var(--surface-elevated)" }}
        >
          {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCloseMobile} aria-hidden />
          <aside className="glass-panel absolute left-0 top-0 h-full w-[248px] rounded-none border-y-0 border-l-0">
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Tutup navigasi"
              className="absolute right-2 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            >
              <X size={16} />
            </button>
            <SidebarBody collapsed={false} onNavigate={onCloseMobile} />
          </aside>
        </div>
      )}
    </>
  );
}
