# Setup Guide: Instagram & TikTok Developer App (dari Nol)

Kerjakan berurutan, jangan skip. Siapkan dulu: akun Facebook (bukan cuma Instagram), akun Instagram yang sudah di-switch ke Business/Creator, dan ngrok yang sudah ada authtoken.

---

## Bagian A — Instagram (Meta Developer App)

### A1. Prasyarat akun
- [ ] Punya akun Facebook (kalau belum, daftar di facebook.com/reg — tidak perlu aktif dipakai)
- [ ] Akun Instagram sudah Business atau Creator (Settings → Account type and tools → Switch to professional account)

### A2. Buat Meta App
- [ ] Buka developers.facebook.com, login pakai akun **Facebook**
- [ ] Kalau baru pertama kali, klik "Get Started" → accept Platform Policy → verifikasi HP kalau diminta
- [ ] My Apps → Create App → pilih tipe **Business**
- [ ] Isi nama app — **hindari kata "Instagram", "Facebook", "Meta", "Insta"** (akan ditolak). Pakai nama unik, contoh: `PostPilot HW`
- [ ] Skip "connect business portfolio" (pilih "I don't want to connect a business portfolio yet")
- [ ] Konfirmasi password Facebook kalau diminta

### A3. Tambah use case Instagram
- [ ] Di dashboard app, klik **"Add use cases"**
- [ ] Filter **"Content management"**
- [ ] Pilih **"Manage messaging & content on Instagram"** → Save → "Add to this app"

### A4. Setup Instagram Business Login
- [ ] Di sidebar kiri, klik use case Instagram yang baru ditambahkan
- [ ] Pilih **"API setup with Instagram Login"** (BUKAN "API setup with Facebook Login", BUKAN product lama "Instagram Graph API")
- [ ] Klik **"Add all required permissions"** (otomatis dapat `instagram_business_basic`, `instagram_business_content_publish`)

### A5. Tambah akun Instagram sebagai tester
- [ ] Ke sidebar **Roles** (atau **App roles**) → **Add People**
- [ ] Cari nama **Facebook**-mu sendiri (bukan username Instagram) di search field
- [ ] Centang role **"Instagram Tester"** (di bagian "Additional roles for this app")
- [ ] Klik **Add**
- [ ] Buka **instagram.com** (browser, boleh laptop) → login akun yang mau dites → **More/Menu → Settings → Website permissions → Apps and Websites → tab "Tester Invites"**
- [ ] Terima undangan dari app-mu di situ (klik **Accept**)

### A6. Siapkan ngrok (HTTPS wajib untuk redirect URI)
- [ ] Jalankan Next.js app: `npm run dev` (biasanya port 3000)
- [ ] Terminal baru: `ngrok http 3000`
- [ ] Copy URL HTTPS yang muncul, contoh: `https://abcd-1234.ngrok-free.app`
- [ ] **Catat baik-baik** — kalau ngrok di-restart, URL ini berubah dan semua step di bawah harus diulang

### A7. Daftarkan domain ngrok ke App Domains
- [ ] Sidebar → **Settings → Basic**
- [ ] Field **"App Domains"** → tambahkan domain ngrok **tanpa `https://` dan tanpa path**, contoh: `abcd-1234.ngrok-free.app`
- [ ] Save Changes

### A8. Set redirect URI
- [ ] Balik ke use case Instagram → "API setup with Instagram Login"
- [ ] Field **"Valid OAuth Redirect URIs"** → tambahkan: `https://abcd-1234.ngrok-free.app/api/instagram/oauth` (sesuaikan path dengan route yang benar-benar ada di kode — cek dengan opencode kalau ragu)
- [ ] Save

### A9. Ambil credential
- [ ] Di halaman setup yang sama, copy **Instagram App ID** dan **Instagram App Secret**
- [ ] Simpan ke `.env.local`:
```
INSTAGRAM_CLIENT_ID=...
INSTAGRAM_CLIENT_SECRET=...
NEXT_PUBLIC_APP_URL=https://abcd-1234.ngrok-free.app
```

### A10. Test
- [ ] Di bagian "Generate access tokens", klik **Generate token** di akun tester-mu — kalau berhasil muncul token panjang, koneksi dasar sudah benar
- [ ] Coba jalankan flow OAuth penuh dari app-mu sendiri (lewat browser, akses app via URL ngrok, bukan localhost langsung — karena redirect URI terdaftarnya yang ngrok)

---

## Bagian B — TikTok Developer App

### B1. Buat app
- [ ] developers.tiktok.com → login/daftar → **Manage apps** → **Connect an app**
- [ ] Ownership: **Individual**
- [ ] App type: **Other** (bukan "Login Kit" saja — supaya bisa tambah beberapa product)

### B2. Tambah product
- [ ] Di halaman app → **Add products** → tambahkan **Content Posting API**
- [ ] (Boleh tambah **Login Kit** juga kalau nanti butuh data profil dasar — tapi Content Posting API yang wajib untuk posting)
- [ ] Di scopes, tambahkan `video.publish` dan/atau `video.upload`

### B3. Sandbox mode
- [ ] App otomatis mulai di **Sandbox** — bisa tambah sampai 5 akun tester, test full flow tanpa audit
- [ ] Post yang dihasilkan otomatis **private** — ini normal untuk tahap development

### B4. Verifikasi URL & redirect
- [ ] Ikuti instruksi "URL Properties" di dashboard untuk verifikasi domain — pakai domain ngrok yang sama seperti Instagram (`https://abcd-1234.ngrok-free.app`)
- [ ] Redirect URI: `https://abcd-1234.ngrok-free.app/api/tiktok/oauth` (sesuaikan path dengan kode)

### B5. Ambil credential
- [ ] Copy **Client Key** dan **Client Secret** dari halaman Credentials
- [ ] Simpan ke `.env.local`:
```
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
```

### B6. Audit (nanti, tidak sekarang)
- [ ] Setelah semua fitur jalan di sandbox, submit audit produksi untuk post publik — siapkan privacy policy URL + video demo flow lengkap

---

## Checklist akhir sebelum lanjut coding

- [ ] `.env.local` punya: `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL`
- [ ] ngrok tetap jalan selama kamu development (kalau restart, ulangi A6-A8 dan B4)
- [ ] Generate token test di Instagram berhasil
