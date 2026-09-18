"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function NotificationPreferences() {
  const [email, setEmail] = useState(true);
  const [inApp, setInApp] = useState(true);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j) return;
        if (typeof j.emailNotifications === "boolean") setEmail(j.emailNotifications);
        if (typeof j.inAppNotifications === "boolean") setInApp(j.inAppNotifications);
      })
      .catch(() => undefined);
  }, []);

  async function onSave() {
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailNotifications: email, inAppNotifications: inApp }),
    });
    setBusy(false);
    if (res.ok) setSaved(true);
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h2 className="font-medium">Preferensi notifikasi</h2>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={inApp} onChange={(e) => setInApp(e.target.checked)} />
        Notifikasi dalam aplikasi
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} />
        Email untuk kegagalan penting
      </label>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onSave} disabled={busy}>
          {busy ? "Menyimpan..." : "Simpan"}
        </Button>
        {saved && <span className="text-sm text-muted-foreground">Tersimpan.</span>}
      </div>
    </div>
  );
}
