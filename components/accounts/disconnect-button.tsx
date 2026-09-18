"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DisconnectButton({ connectionId }: { connectionId: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
        Disconnect
      </Button>
    );
  }

  return (
    <form
      method="POST"
      action={`/api/accounts/${connectionId}/disconnect`}
      className="flex items-center gap-2"
    >
      <span className="text-sm text-muted-foreground">Yakin?</span>
      <Button type="submit" variant="destructive" size="sm">
        Ya, putuskan
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(false)}
      >
        Batal
      </Button>
    </form>
  );
}
