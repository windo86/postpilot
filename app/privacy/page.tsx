import Link from "next/link";

/** Kebijakan Privasi PostPilot (MVP). Bahasa Indonesia. */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Kebijakan Privasi PostPilot</h1>
        <p className="text-sm text-muted-foreground">Terakhir diperbarui: September 2026 (versi MVP).</p>
      </header>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium">1. Data yang kami kumpulkan</h2>
        <ul className="list-disc pl-5">
          <li>Identitas login: email (dan nama bila via Google).</li>
          <li>
            Token akses Instagram/TikTok yang kamu hubungkan — disimpan
            terenkripsi (AES-256-GCM), tidak pernah dalam plaintext.
          </li>
          <li>Konten yang kamu buat: media, caption, jadwal, dan status publish.</li>
          <li>API key AI milikmu (BYOK) — disimpan terenkripsi.</li>
        </ul>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium">2. Penggunaan data</h2>
        <p>
          Data dipakai semata untuk menjalankan layanan: autentikasi,
          publish terjadwal ke platform yang kamu pilih, retry otomatis,
          analytics dasar, dan notifikasi kegagalan. Kami tidak menjual
          datamu dan tidak membagikannya ke pihak ketiga selain API resmi
          platform yang kamu hubungkan (Meta/TikTok) atas instruksi
          publish-mu.
        </p>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium">3. Penyimpanan & keamanan</h2>
        <p>
          Data tersimpan di database Supabase (region Singapore). Token dan
          API key dienkripsi. Akses antar-user dibatasi Row Level Security
          sehingga user lain tidak dapat melihat datamu.
        </p>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="font-medium">4. Penghapusan data</h2>
        <p>
          Disconnect akun media sosial menghapus token dari sistem kami
          (row koneksi dipertahankan tanpa token untuk riwayat post).
          Untuk penghapusan akun penuh, hubungi kami (lihat Syarat &
          Ketentuan).
        </p>
      </section>

      <p className="text-sm text-muted-foreground">
        <Link href="/terms" className="underline">
          Syarat & Ketentuan
        </Link>{" "}
        ·{" "}
        <Link href="/" className="underline">
          Kembali ke PostPilot
        </Link>
      </p>
    </main>
  );
}
