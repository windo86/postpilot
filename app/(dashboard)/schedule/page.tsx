import { createClient } from "@/lib/supabase/server";
import { ScheduleCalendar } from "@/components/schedule/calendar";
import { PageHeader } from "@/components/content/primitives";

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
    <div className="space-y-5">
      <PageHeader
        title="Kalender"
        description="Seret post antar tanggal untuk reschedule."
      />
      <ScheduleCalendar initialTimezone={tz} />
    </div>
  );
}
