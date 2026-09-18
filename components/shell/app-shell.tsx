"use client";

import { useState } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { CommandMenu } from "@/components/shell/command-menu";

/** Kerangka aplikasi: sidebar glass + topbar minimal + konten. */
export function AppShell({ email, children }: { email: string; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar email={email} onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6">{children}</main>
      </div>
      <CommandMenu />
    </div>
  );
}
