import { NotificationList } from "@/components/notifications/list";
import { PageHeader } from "@/components/content/primitives";

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Notifikasi" />
      <NotificationList />
    </div>
  );
}
