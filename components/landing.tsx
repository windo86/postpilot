import Link from "next/link";
import { CalendarDays, Image as ImageIcon, PenLine, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";

const FEATURES = [
  { icon: PenLine, title: "Composer", desc: "Caption per platform, preview, dan validasi otomatis." },
  { icon: CalendarDays, title: "Scheduler", desc: "Kalender drag-and-drop dengan queue + retry andal." },
  { icon: ImageIcon, title: "Media Library", desc: "Upload sekali, pakai berulang kali." },
  { icon: Sparkles, title: "AI Generator", desc: "Caption, gambar, dan video dari API key milikmu." },
];

/** Landing publik PostPilot (official website untuk review platform). */
export default function LandingPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-10 p-6">
      <header className="flex items-center justify-between py-4">
        <p className="text-lg font-semibold" aria-label="PostPilot">
          <BrandLogo variant="horizontal" className="h-8 max-w-[150px]" />
        </p>
        <div className="flex gap-2">
          <Link href="/login" className="rounded-lg border border-input px-4 py-2 text-sm">
            Masuk
          </Link>
          <Link href="/register" className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
            Daftar
          </Link>
        </div>
      </header>

      <section className="space-y-4 py-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Satu tempat untuk posting ke Instagram & TikTok
        </h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          Tulis sekali, jadwalkan, dan biarkan PostPilot mempublikasikan ke
          semua akunmu — lengkap dengan AI content generator, media library,
          dan analytics.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/register" className="rounded-lg bg-primary px-5 py-2.5 text-sm text-primary-foreground">
            Mulai gratis
          </Link>
          <Link href="/login" className="rounded-lg border border-input px-5 py-2.5 text-sm">
            Masuk
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-border bg-card p-4">
            <p className="flex items-center gap-2 font-medium">
              <f.icon size={16} className="text-accent" />
              {f.title}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="flex flex-wrap gap-4 border-t border-border py-6 text-sm text-muted-foreground">
        <Link href="/terms" className="underline">
          Syarat & Ketentuan
        </Link>
        <Link href="/privacy" className="underline">
          Kebijakan Privasi
        </Link>
      </footer>
    </main>
  );
}
