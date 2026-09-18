# Menjalankan PostPilot di Laptop (tanpa deploy)

> Pilihan aktif: semua jalan lokal (dev + ngrok + worker). Gratis,
> tapi mati saat laptop mati/tidur.

## 3 terminal (urutan penting)

**Terminal 1 — Web:**
```powershell
cd "D:\VS Code\app builder\postpilot"
npm run dev
```
Tunggu `Ready on http://localhost:3000`.

**Terminal 2 — Tunnel:**
```powershell
ngrok http 3000
```
Catat URL `https://....ngrok-free.dev`.

**Terminal 3 — Worker:**
```powershell
cd "D:\VS Code\app builder\postpilot"
npm run worker
```
Harus muncul `[worker] starting`, lalu diam (idle = normal).

## Kalau URL ngrok berubah

URL acak tiap restart tunnel. Samakan di 3 tempat, lalu restart Terminal 1:

1. `.env.local`: `NEXT_PUBLIC_APP_URL`, `INSTAGRAM_REDIRECT_URI`,
   `TIKTOK_REDIRECT_URI` (ganti host-nya saja).
2. Meta → Business login settings → OAuth redirect URIs.
3. TikTok → Login Kit → Redirect URI (+ verify ulang bila diminta).

## Verifikasi cepat (2 menit)

1. Buka URL ngrok → landing → login → dashboard ada angkanya.
2. Buat post → schedule +2 menit → log worker `claimed=1` + `publish ok`.
3. `http://localhost:3000/api/health` → `{"ok":true}`.

## Batasan

- Laptop mati/tidur = semua mati. Jadwal yang lewat tetap jalan telat
  (next_attempt_at sudah due → diklaim saat worker nyala), tidak hilang.
- Jangan tutup ketiga terminal selama dipakai.
- Untuk produksi beneran, lihat `docs/DEPLOY.md` (Render + domain tetap).
