import { NotificationList } from "@/components/notifications/list";

export default function NotificationsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Notifikasi</h1>
      <NotificationList />
    </main>
  );
}
