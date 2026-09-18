import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/app-shell";
import { DashboardHome } from "@/components/dashboard/home";
import LandingPage from "@/components/landing";

/**
 * Root: landing publik untuk tamu, dashboard + AppShell untuk user login.
 * (Bukan redirect — satu URL resmi untuk website/review platform.)
 */
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <LandingPage />;
  return (
    <AppShell email={user.email ?? ""}>
      <DashboardHome userId={user.id} email={user.email ?? ""} />
    </AppShell>
  );
}
