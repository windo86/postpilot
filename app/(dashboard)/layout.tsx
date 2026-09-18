import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Guard dashboard: tanpa sesi → /login.
 * Bootstrap `profiles` bila user baru belum punya row.
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

  return <>{children}</>;
}
