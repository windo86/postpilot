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
    <div className="space-y-1 rounded-2xl border border-[rgb(255_255_255/0.07)] p-2" style={{ background: "var(--surface)" }}>
      {(
        [
          { label: "Notifikasi dalam aplikasi", desc: "Bell + halaman notifikasi", value: inApp, set: setInApp },
          { label: "Email kegagalan penting", desc: "Hanya saat publish gagal permanen", value: email, set: setEmail },
        ] as const
      ).map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5">
          <div>
            <p className="text-sm">{row.label}</p>
            <p className="text-xs text-muted-foreground">{row.desc}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={row.value}
            aria-label={row.label}
            onClick={() => {
              row.set(!row.value);
              setSaved(false);
            }}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              row.value ? "bg-[var(--accent)]" : "bg-[rgb(255_255_255/0.14)]"
            }`}
          >
            <span
              className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                row.value ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 px-2 pb-1 pt-2">
        <Button size="sm" onClick={onSave} disabled={busy}>
          {busy ? "Menyimpan..." : "Simpan"}
        </Button>
        {saved && <span className="text-sm text-muted-foreground">Tersimpan.</span>}
      </div>
    </div>
  );
}
