import Link from "next/link";

/** Syarat & Ketentuan PostPilot (MVP). Bahasa Indonesia. */
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Syarat & Ketentuan PostPilot</h1>
        <p className="text-sm text-muted-foreground">Terakhir diperbarui: September 2026 (versi MVP).</p>
      </header>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium">1. Layanan</h2>
        <p>
          PostPilot adalah alat bantu manajemen konten untuk menyiapkan,
          menjadwalkan, dan mempublikasikan konten ke Instagram dan TikTok
          dari satu tempat. Layanan ini masih tahap pengembangan (MVP) dan
          dapat berubah sewaktu-waktu.
        </p>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium">2. Akun</h2>
        <p>
          Kamu masuk dengan email dan password atau Google. Kamu bertanggung
          jawab menjaga kerahasiaan kredensialmu dan atas semua aktivitas
          yang terjadi melalui akunmu, termasuk konten yang dipublikasikan
          ke akun media sosial yang kamu hubungkan.
        </p>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium">3. Konten & akun media sosial</h2>
        <p>
          Kamu menyatakan berhak mempublikasikan setiap konten dan media yang
          kamu unggah. Publikasi tunduk pada aturan platform masing-masing
          (Instagram, TikTok); PostPilot tidak menjamin konten pasti tayang
          bila ditolak oleh platform atau akses aplikasi belum disetujui.
        </p>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium">4. Batasan</h2>
        <p>
          Layanan disediakan “apa adanya” tanpa jaminan ketersediaan penuh.
          Kami dapat menonaktifkan akun yang menyalahgunakan layanan,
          misalnya spam atau pelanggaran kebijakan platform.
        </p>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium">5. Pemutusan</h2>
        <p>
          Kamu dapat berhenti kapan saja dengan disconnect akun media sosial
          dan berhenti memakai aplikasi. Lihat{" "}
          <Link href="/privacy" className="underline">
            Kebijakan Privasi
          </Link>{" "}
          untuk penghapusan data.
        </p>
      </section>

      <p className="text-sm text-muted-foreground">
        <Link href="/" className="underline">
          Kembali ke PostPilot
        </Link>
      </p>
    </main>
  );
}
