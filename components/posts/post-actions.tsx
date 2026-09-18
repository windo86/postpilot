"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PostActions({ postId, status }: { postId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(action: "publish" | "cancel") {
    if (action === "cancel" && !window.confirm("Batalkan post ini?")) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/posts/${postId}/${action}`, { method: "POST" });
    const j = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(j?.error ?? "Gagal");
      return;
    }
    router.refresh();
  }

  const canAct = ["draft", "scheduled", "failed", "cancelled"].includes(status);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button disabled={busy || !canAct} onClick={() => call("publish")}>
          Publish Now
        </Button>
        <Button variant="outline" disabled={busy || !canAct} onClick={() => call("cancel")}>
          Batalkan
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
