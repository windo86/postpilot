import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell } from "@/components/notifications/bell";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/posts", label: "Posts" },
  { href: "/schedule", label: "Scheduler" },
  { href: "/media", label: "Media" },
  { href: "/ai", label: "AI" },
  { href: "/analytics", label: "Analytics" },
  { href: "/automation", label: "Automation" },
  { href: "/accounts", label: "Akun" },
  { href: "/settings", label: "Settings" },
];

/**
 * Guard dashboard: tanpa sesi → /login.
 * Bootstrap `profiles` bila user baru belum punya row.
 * Top bar: navigasi + bell notifikasi.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    await supabase.from("profiles").insert({
      id: user.id,
      display_name: user.email?.split("@")[0] ?? null,
    });
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 p-2" aria-label="Navigasi utama">
          <Link href="/" className="mr-2 font-semibold">
            PostPilot
          </Link>
          {NAV.slice(1).map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
          <span className="ml-auto">
            <NotificationBell />
          </span>
        </nav>
      </header>
      {children}
    </>
  );
}
