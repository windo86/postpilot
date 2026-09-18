import { createClient } from "@/lib/supabase/server";
import { ScheduleCalendar } from "@/components/schedule/calendar";

export default async function SchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let tz = "Asia/Jakarta";
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("id", user.id)
      .single();
    if (data?.timezone) tz = data.timezone as string;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Scheduler</h1>
        <p className="text-sm text-muted-foreground">
          Seret post antar tanggal untuk reschedule. Waktu tersimpan sebagai UTC.
        </p>
      </header>
      <ScheduleCalendar initialTimezone={tz} />
    </main>
  );
}
