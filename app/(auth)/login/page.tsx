"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/auth/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "callback_gagal"
      ? "Login via OAuth gagal, coba lagi."
      : null
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email atau password salah."
          : error.message
      );
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm space-y-4 rounded-2xl border border-[rgb(255_255_255/0.07)] p-6"
    >
        <h1 className="text-xl font-semibold">Masuk ke PostPilot</h1>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Memproses..." : "Masuk"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link href="/register" className="text-primary underline">
            Daftar
          </Link>{" "}
          ·{" "}
          <Link href="/reset-password" className="text-primary underline">
            Lupa password
          </Link>
        </p>
      </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
