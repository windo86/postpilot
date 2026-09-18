# Deploy & Operasi Produksi — PostPilot (T-21)

## 1. GitHub (sekali)

```bash
# di D:\VS Code\app builder\postpilot
gh repo create postpilot --private --source=. --push
# atau manual: buat repo kosong di github.com → git remote add origin <url> → git push -u origin master
```

`.env.local`, `node_modules/`, `.next/`, `supabase/.temp/`, `*.log` tidak ikut
(gitignore). Verifikasi: `git ls-files | grep -E "env.local|node_modules"` harus kosong.

## 2. Render — 2 service dari `render.yaml`

1. dashboard.render.com → New → Blueprint → pilih repo → file `render.yaml`.
2. Isi secrets (dashboard Render → Environment, **sync: false** = manual):
   - Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY` (dari dashboard Supabase project).
   - `APP_ENCRYPTION_KEY`: **generate BARU untuk produksi**
     (`npx tsx -e "import('./lib/crypto/index.ts').then(m=>console.log(m.generateEncryptionKey()))"`).
     ⚠️ Jangan pakai key dev — token dev tidak bisa dibaca produksi dan sebaliknya.
   - `NEXT_PUBLIC_APP_URL`: `https://postpilot-web.onrender.com` (atau nama service-mu).
   - Instagram: `INSTAGRAM_CLIENT_ID/SECRET/REDIRECT_URI`
     (`https://<domain>/api/instagram/oauth`).
   - TikTok: `TIKTOK_CLIENT_KEY/SECRET/REDIRECT_URI`
     (`https://<domain>/api/accounts/tiktok/callback`).
   - Opsional: `RESEND_API_KEY`, `EMAIL_FROM`.
3. Deploy. Cek `GET https://<domain>/api/health` → `{"ok":true}`.
4. Worker: tab Logs harus ada `[worker] starting` lalu diam (idle = normal).

## 3. Migrasi database

```bash
supabase login
supabase link --project-ref <ref>   # password DB bila diminta
supabase db push --linked           # 0001–0006 berurutan, idempoten via tracking
```

Bila push gagal di tengah: `supabase migration repair --status applied <versi>`
untuk versi yang sebenarnya sudah teraplikasi, lalu push ulang. Jangan edit
file migrasi yang sudah ter-push — buat file baru (`0007_...`).

## 4. Backup & restore

- **Otomatis**: Supabase Dashboard → Database → Backups (daily, PITR sesuai plan).
- **Manual sebelum rilis/migrasi berisiko**:
  ```bash
  supabase db dump --linked -f backup-YYYYMMDD.sql
  ```
- **Restore**: Dashboard → Backups → Restore (PITR), atau replay SQL dump ke
  project baru lalu `supabase link` ulang ke project tersebut.

## 5. Rollback deploy

- **Kode**: Render Dashboard → service → Deploys → **Rollback** ke deploy
  sebelumnya (web & worker independen — rollback yang bermasalah saja).
- **DB**: migrasi SQL tidak auto-rollback. Tulis down-migration manual bila
  skema berubah destruktif; untuk MVP: restore dari backup §4.
- **Env salah**: perbaiki di dashboard → Manual Deploy → Clear build cache bila perlu.

## 6. OAuth & URL produksi (ganti dari ngrok!)

| Tempat | Ganti ke |
|---|---|
| `NEXT_PUBLIC_APP_URL` + redirect envs | `https://<domain>` |
| Meta → Business login settings → OAuth redirect URIs | `https://<domain>/api/instagram/oauth` |
| TikTok → Login Kit → Redirect URI | `https://<domain>/api/accounts/tiktok/callback` |
| TikTok → URL properties | verifikasi ulang `/terms`, `/privacy`, domain root (file di `lib/legal/verification.ts`) |
| Supabase → Auth → URL Configuration | Site URL + Redirect URLs → domain produksi |

## 7. Smoke test produksi (acceptance T-21)

1. `/api/health` → ok.
2. Register akun test baru → login → landing → dashboard.
3. Connect Instagram (akun test/dev).
4. Upload 1 gambar → buat post → schedule +2 menit.
5. Worker log: `claimed=1` + `publish ok` (tanpa trigger manual).
6. Cek post live di IG → hapus manual.
7. `/analytics` refresh → snapshot tersimpan.
8. Cek secrets: `git ls-files | grep env.local` kosong; dashboard Render menutupi values.

## 8. Monitoring (log Render, tanpa Sentry)

- Web: Logs → filter `error`, alert bila `/api/health` non-200 (pakai
  UptimeRobot/cron-job.org gratis ke endpoint tersebut).
- Worker: pola sehat = `[worker] starting` + baris `iterasi` hanya saat ada
  kerja; pola sakit = `claim gagal` / `iterasi gagal` berulang, atau tidak ada
  log >2× poll interval (service crash/loop).
- DB: Supabase → Reports (API errors, RLS violations) + tabel
  `publish_attempts` untuk pola kegagalan publish.
