"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { passwordSchema } from "@/lib/auth/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak sama");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-[rgb(255_255_255/0.07)] p-6"
      >
        <h1 className="text-xl font-semibold">Password baru</h1>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password baru (min. 8 karakter)
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Konfirmasi password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Menyimpan..." : "Simpan password"}
        </Button>
      </form>
    </main>
  );
}
