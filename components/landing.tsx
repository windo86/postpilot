import Link from "next/link";

/** Landing publik PostPilot (official website untuk review platform). */
export default function LandingPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-10 p-6">
      <header className="flex items-center justify-between py-4">
        <p className="text-lg font-semibold">PostPilot</p>
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
        {[
          ["📝 Composer", "Caption per platform, preview, dan validasi otomatis."],
          ["🗓️ Scheduler", "Kalender drag-and-drop dengan queue + retry andal."],
          ["🖼️ Media Library", "Upload sekali, pakai berulang kali."],
          ["🤖 AI Generator", "Caption, gambar, dan video dari API key milikmu."],
        ].map(([title, desc]) => (
          <div key={title} className="rounded-xl border border-border bg-card p-4">
            <p className="font-medium">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
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
