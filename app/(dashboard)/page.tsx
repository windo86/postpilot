import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/logout-button";

/**
 * Dashboard placeholder (T-03). Dashboard penuh di T-14.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">PostPilot</h1>
          <p className="text-sm text-muted-foreground">
            Masuk sebagai {user?.email}
          </p>
        </div>
        <LogoutButton />
      </header>
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-medium">Selamat datang 👋</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fondasi auth selesai. Composer, scheduler, dan analytics menyusul di
          task berikutnya.
        </p>
      </section>
    </main>
  );
}
