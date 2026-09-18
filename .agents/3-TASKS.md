# Tasks: PostPilot

## Status Dokumen

- **Versi:** 3.0 — Revised for Supabase-first architecture
- **Mode kerja:** satu task pada satu waktu
- **Sumber:** `1-PRD.md` + `2-TECH-SPEC.md`
- **Aturan:** jangan mengerjakan beberapa task besar sekaligus hanya untuk mempercepat.

---

# Aturan Umum untuk OpenCode

1. Baca `1-PRD.md` dan `2-TECH-SPEC.md` sebelum task pertama.
2. `2-TECH-SPEC.md` adalah sumber kebenaran implementasi.
3. Jangan menambahkan ORM atau mengganti database access layer ke ORM.
4. Jangan menambahkan dependency hanya untuk menyelesaikan satu masalah kecil.
5. Jangan memindahkan publish platform ke request web synchronous.
6. Semua token/secret harus encrypted atau hashed sesuai tipe datanya.
7. Jangan memasukkan secret ke source code, test fixture public, log, commit, atau screenshot.
8. Shared code yang dipakai worker tidak boleh import `next/*`.
9. Selesaikan test dan typecheck untuk task sebelum menandai task `Done`.
10. Bila menemukan konflik antara source code dan dokumen, update implementasi agar kembali sesuai Tech Spec; jangan membuat workaround diam-diam.

### Status task

- `Todo`
- `In Progress`
- `Blocked`
- `Done`

### Definition of Done

Task hanya boleh dianggap `Done` bila:

- implementasi selesai;
- typecheck tidak error;
- lint tidak error untuk file terkait;
- test relevan lulus;
- manual test dilakukan untuk flow UI/API bila diperlukan;
- security requirement task terpenuhi;
- tidak ada TODO kritis yang disembunyikan.

---

# Fase 0 — External Registration

## T-00: External App Registration

- **Modul:** Setup eksternal
- **Prioritas:** High
- **Status:** Todo
- **Dependensi:** -
- **Estimasi:** 2–4 jam
- **Dikerjakan:** manual oleh developer, bukan coding agent

### Tujuan

Menyiapkan semua credential dan callback yang dibutuhkan sebelum integration code dibuat.

### Sub-tasks

- [ ] Siapkan Supabase project untuk development.
- [ ] Aktifkan Email/Password di Supabase Auth.
- [ ] Aktifkan Google provider bila fitur Google login digunakan.
- [ ] Buat Meta Developer App untuk Instagram integration yang dipilih.
- [ ] Konfigurasikan OAuth redirect URI HTTPS.
- [ ] Tambahkan tester/developer account yang diperlukan untuk development.
- [ ] Buat TikTok Developer App.
- [ ] Tambahkan Content Posting API.
- [ ] Konfigurasikan redirect URI TikTok.
- [ ] Verifikasi domain/URL yang dibutuhkan untuk transfer media TikTok.
- [ ] Isi secrets ke environment lokal dan Render.
- [ ] Verifikasi seluruh scope dari dokumentasi provider yang aktif.

### Acceptance

- [ ] Credential tersedia.
- [ ] Callback URL dapat diverifikasi.
- [ ] Tidak ada secret yang di-commit.
- [ ] Semua URL callback menggunakan `NEXT_PUBLIC_APP_URL`/config, bukan hardcoded localhost.

---

# Fase 1 — Fondasi

## T-01: Project Setup

- **Modul:** Setup
- **Prioritas:** High
- **Status:** Todo
- **Dependensi:** T-00
- **Estimasi:** 2–3 jam

### Implementasi

- [ ] Inisialisasi Next.js App Router + TypeScript.
- [ ] Setup Tailwind CSS.
- [ ] Setup shadcn/ui.
- [ ] Install `@supabase/supabase-js`.
- [ ] Install `@supabase/ssr`.
- [ ] Install `zod`.
- [ ] Install date/time utility yang benar-benar dibutuhkan.
- [ ] Buat `lib/supabase/client.ts`.
- [ ] Buat `lib/supabase/server.ts`.
- [ ] Buat `lib/supabase/service.ts`.
- [ ] Buat folder `worker/`.
- [ ] Buat folder `supabase/migrations/`.
- [ ] Setup scripts `dev`, `build`, `start`, `worker`, `lint`, `typecheck`.
- [ ] Buat `.env.example` tanpa secret.

### Acceptance

- [ ] App dapat start lokal.
- [ ] Client/browser Supabase dan server Supabase dapat dibuat.
- [ ] Service client hanya dapat di-import dari server/worker code.
- [ ] Worker entry point dapat dijalankan sebagai Node process.

---

## T-02: Database Schema + RLS

- **Modul:** Database
- **Prioritas:** High
- **Status:** Todo
- **Dependensi:** T-01
- **Estimasi:** 5–7 jam

### File target

```text
supabase/migrations/
├── 0001_initial_schema.sql
├── 0002_indexes_rls.sql
└── 0003_queue_functions.sql
```

### Sub-tasks

- [ ] Buat `profiles` yang mereferensikan `auth.users`.
- [ ] Buat `connected_accounts`.
- [ ] Buat `media_assets`.
- [ ] Buat `posts`.
- [ ] Buat `post_platforms`.
- [ ] Buat `post_media`.
- [ ] Buat `schedule_queue`.
- [ ] Buat `publish_attempts`.
- [ ] Buat `post_metrics`.
- [ ] Buat `trending_topics`.
- [ ] Buat `brand_styles`.
- [ ] Buat `ai_api_keys`.
- [ ] Buat `webhooks`.
- [ ] Buat `api_keys`.
- [ ] Buat `notifications`.
- [ ] Tambahkan foreign key dan `on delete` behavior yang tepat.
- [ ] Tambahkan index untuk query dashboard, calendar, queue, dan analytics.
- [ ] Aktifkan RLS pada seluruh tabel user-owned.
- [ ] Buat policy ownership.
- [ ] Buat RPC untuk atomic queue claim.
- [ ] Buat RPC untuk stale-job recovery bila diperlukan.
- [ ] Jalankan migration ke development Supabase.
- [ ] Test RLS dengan dua user test.

### Acceptance

- [ ] Tidak ada table yang menggunakan ownership ambigu.
- [ ] User A tidak dapat membaca data user B.
- [ ] Queue claim tidak menghasilkan duplicate claim pada dua worker simulasi.

---

## T-03: Supabase Auth

- **Modul:** Auth
- **Prioritas:** High
- **Status:** Todo
- **Dependensi:** T-01, T-02
- **Estimasi:** 3–5 jam

### Sub-tasks

- [ ] Setup email/password di Supabase Auth.
- [ ] Setup Google provider bila opsi diaktifkan.
- [ ] Buat login page.
- [ ] Buat register page.
- [ ] Buat reset-password flow.
- [ ] Buat logout action.
- [ ] Buat `app/auth/callback/route.ts`.
- [ ] Implement server auth client.
- [ ] Buat route/page protection untuk dashboard.
- [ ] Buat profile bootstrap jika user baru belum memiliki `profiles` row.
- [ ] Test session setelah browser refresh.

### Acceptance

- [ ] Login/logout/register bekerja.
- [ ] Protected routes benar-benar terproteksi.
- [ ] Tidak ada password disimpan di custom table aplikasi.

---

## T-04: Crypto Library

- **Modul:** Security
- **Prioritas:** High
- **Status:** Todo
- **Dependensi:** T-01
- **Estimasi:** 1–2 jam

### File

```text
lib/crypto/index.ts
```

### Sub-tasks

- [ ] Implement AES-256-GCM encrypt.
- [ ] Implement decrypt.
- [ ] Tambahkan ciphertext version.
- [ ] Validasi panjang `APP_ENCRYPTION_KEY`.
- [ ] Tolak startup jika key invalid pada production.
- [ ] Test roundtrip.
- [ ] Test wrong key/corrupt ciphertext.
- [ ] Pastikan tidak import `next/*`.

### Acceptance

- [ ] Access token dapat encrypted/decrypted.
- [ ] AI key dapat encrypted/decrypted.
- [ ] Secret tidak muncul di error message.

---

## T-05: Multi-Account Management

- **Modul:** Accounts
- **Prioritas:** High
- **Status:** Todo
- **Dependensi:** T-00, T-02, T-03, T-04
- **Estimasi:** 6–9 jam

### Instagram

- [ ] Buat connect route.
- [ ] Buat callback route.
- [ ] Tukarkan authorization result sesuai flow platform yang aktif.
- [ ] Simpan token encrypted.
- [ ] Simpan account ID, username, display name, scopes, expiry.

### TikTok

- [ ] Buat connect route.
- [ ] Buat callback route.
- [ ] Simpan token encrypted.
- [ ] Simpan open ID/account ID dan metadata dasar.

### UI Accounts

- [ ] List connected accounts.
- [ ] Tampilkan platform badge.
- [ ] Tampilkan status.
- [ ] Tampilkan expiry warning.
- [ ] Tombol reconnect.
- [ ] Tombol disconnect + confirm dialog.

### Acceptance

- [ ] Duplicate connection dicegah.
- [ ] Disconnect aman.
- [ ] OAuth state/CSRF protection diterapkan.
- [ ] Token tidak pernah ditampilkan di UI.

---

## T-06: Media Library + Direct Upload

- **Modul:** Media
- **Prioritas:** High
- **Status:** Todo
- **Dependensi:** T-02, T-04
- **Estimasi:** 5–7 jam

### Sub-tasks

- [ ] Buat private storage bucket.
- [ ] Buat upload authorization route.
- [ ] Buat storage path convention.
- [ ] Implement direct upload browser.
- [ ] Implement resumable/TUS untuk file besar.
- [ ] Validasi MIME/size di client.
- [ ] Validasi ulang metadata saat upload complete.
- [ ] Simpan `media_assets`.
- [ ] Buat signed URL untuk preview.
- [ ] Buat grid view.
- [ ] Search by name/tag/type/date.
- [ ] Pagination.
- [ ] Delete asset + object cleanup.

### Acceptance

- [ ] Upload gambar berjalan.
- [ ] Upload video besar tidak melewati request body Next.js.
- [ ] Browser tidak pernah memperoleh service-role key.

---

# Fase 2 — Content & Publishing

## T-07: Content Composer

- **Modul:** Composer
- **Prioritas:** High
- **Status:** Todo
- **Dependensi:** T-05, T-06
- **Estimasi:** 6–9 jam

### Sub-tasks

- [ ] Buat create post page.
- [ ] Media selector dari Media Library.
- [ ] Upload media baru dari composer.
- [ ] Account selector per platform.
- [ ] Caption editor terpisah per platform.
- [ ] Hashtag field.
- [ ] TikTok commercial disclosure.
- [ ] TikTok privacy selection setelah creator info tersedia.
- [ ] Preview dasar.
- [ ] Buat parent `posts`.
- [ ] Buat `post_platforms` per target.
- [ ] Buat `post_media`.
- [ ] Generate internal idempotency key.

### Acceptance

- [ ] Instagram-only post dapat dibuat.
- [ ] TikTok-only post dapat dibuat.
- [ ] Multi-platform post dapat dibuat.
- [ ] Caption dapat berbeda per platform.

---

## T-08: Platform Validators

- **Modul:** Validation
- **Prioritas:** High
- **Status:** Todo
- **Dependensi:** T-06, T-07
- **Estimasi:** 4–6 jam

### Sub-tasks

- [ ] `lib/validators/common.ts`.
- [ ] `lib/validators/instagram.ts`.
- [ ] `lib/validators/tiktok.ts`.
- [ ] Validasi MIME.
- [ ] Validasi file size.
- [ ] Validasi aspect ratio.
- [ ] Validasi duration.
- [ ] Validasi jumlah media.
- [ ] Validasi caption.
- [ ] Validasi TikTok privacy level dari creator info.
- [ ] Jalankan validation saat submit.
- [ ] Jalankan validation ulang di worker sebelum publish.

### Acceptance

- [ ] Error message actionable.
- [ ] Tidak ada angka platform yang tersebar di banyak file.
- [ ] Dynamic TikTok max duration berasal dari creator info.

---

## T-09: Instagram Publishing

- **Modul:** Instagram
- **Prioritas:** High
- **Status:** Todo
- **Dependensi:** T-05, T-07, T-08
- **Estimasi:** 5–8 jam

### Sub-tasks

- [ ] Buat `lib/platforms/instagram/client.ts`.
- [ ] Implement OAuth helper sesuai integration path aktif.
- [ ] Implement media/container creation.
- [ ] Implement container status check.
- [ ] Implement publish.
- [ ] Implement quota/429 handling.
- [ ] Simpan container ID sebelum langkah publish berikutnya.
- [ ] Simpan platform post ID saat sukses.
- [ ] Sanitize response sebelum disimpan.
- [ ] Tambahkan unit test state transition.
- [ ] Buat manual test memakai test account.

### Acceptance

- [ ] Publish hanya dilakukan worker.
- [ ] Timeout tidak otomatis menciptakan duplicate publish.
- [ ] Error 401/403 tidak di-retry tanpa reauth/fix.

---

## T-10: TikTok Publishing

- **Modul:** TikTok
- **Prioritas:** High
- **Status:** Todo
- **Dependensi:** T-05, T-07, T-08
- **Estimasi:** 6–10 jam

### Sub-tasks

- [ ] Buat `lib/platforms/tiktok/client.ts`.
- [ ] Implement creator info query.
- [ ] Implement video direct post.
- [ ] Implement photo post.
- [ ] Implement media transfer.
- [ ] Implement status fetch.
- [ ] Simpan publish ID sebelum polling.
- [ ] Implement privacy-level validation.
- [ ] Implement commercial disclosure.
- [ ] Implement endpoint-specific rate limiter.
- [ ] Handle `429`.
- [ ] Handle unaudited/private restriction.
- [ ] Optional: implement TikTok webhook final-status handler.
- [ ] Test video publish.
- [ ] Test photo publish.

### Acceptance

- [ ] `creator_info` dipanggil dan hasilnya dipakai.
- [ ] Privacy option invalid ditolak sebelum initialize.
- [ ] Polling tidak menggunakan loop blocking panjang.

---

## T-11: Scheduler

- **Modul:** Scheduler
- **Prioritas:** High
- **Status:** Todo
- **Dependensi:** T-07, T-09, T-10
- **Estimasi:** 5–7 jam

### Sub-tasks

- [ ] Monthly calendar.
- [ ] Weekly calendar.
- [ ] Schedule form.
- [ ] User timezone selector/settings.
- [ ] Convert local time ke UTC.
- [ ] Simpan `scheduled_at` UTC.
- [ ] Set `next_attempt_at`.
- [ ] Validasi minimal 1 jam.
- [ ] Validasi maksimal 30 hari.
- [ ] Drag-and-drop reschedule.
- [ ] Cancel scheduled post.
- [ ] Disable editing setelah processing dimulai.

### Acceptance

- [ ] Calendar menampilkan post sesuai timezone user.
- [ ] Reschedule mengubah UTC secara benar.
- [ ] Cancel mencegah job pending dijalankan.

---

## T-12: Queue & Background Worker

- **Modul:** Queue
- **Prioritas:** Critical
- **Status:** Todo
- **Dependensi:** T-09, T-10, T-11
- **Estimasi:** 7–10 jam

### Sub-tasks

- [ ] Buat `worker/index.ts`.
- [ ] Buat `lib/queue/claim.ts`.
- [ ] Buat `lib/queue/processor.ts`.
- [ ] Buat `lib/queue/retry.ts`.
- [ ] Buat `lib/queue/recovery.ts`.
- [ ] Implement atomic claim via DB function.
- [ ] Implement lease/locked_at.
- [ ] Implement stale job recovery.
- [ ] Implement max 3 total attempts.
- [ ] Implement exponential backoff + jitter.
- [ ] Log `publish_attempts`.
- [ ] Update `post_platforms.status`.
- [ ] Update parent `posts.status` dari child statuses.
- [ ] Refresh token yang mendekati expiry.
- [ ] Refresh analytics yang sudah stale.
- [ ] Send email on permanent failure.
- [ ] Graceful shutdown.
- [ ] Test restart worker di tengah job.
- [ ] Test dua worker simulasi agar tidak double-claim.

### Acceptance

- [ ] Job tidak double-claim.
- [ ] Retry transient berjalan.
- [ ] Permanent error berhenti tanpa retry.
- [ ] Worker dapat restart dan melanjutkan job aman.

---

# Fase 3 — Insight & Dashboard

## T-13: Analytics

- **Modul:** Analytics
- **Prioritas:** Mid
- **Status:** Todo
- **Dependensi:** T-09, T-10, T-12
- **Estimasi:** 4–6 jam

### Sub-tasks

- [ ] Implement Instagram metrics endpoint sesuai current API version.
- [ ] Implement TikTok analytics endpoint yang tersedia untuk integration.
- [ ] Simpan snapshot ke `post_metrics`.
- [ ] Hindari mengisi metric unsupported sebagai 0.
- [ ] Refresh maksimum setiap 1 jam kecuali manual.
- [ ] Buat analytics page.
- [ ] Filter by platform/date.
- [ ] Export CSV.

### Acceptance

- [ ] Analytics timestamp terlihat.
- [ ] Unsupported metric ditampilkan sebagai N/A.
- [ ] CSV berisi data yang sesuai filter.

---

## T-14: Dashboard

- **Modul:** Dashboard
- **Prioritas:** Mid
- **Status:** Todo
- **Dependensi:** T-07, T-11, T-13
- **Estimasi:** 4–6 jam

### Sub-tasks

- [ ] Overview cards: drafts, scheduled, published, failed.
- [ ] Recent posts.
- [ ] Upcoming schedule.
- [ ] Quick actions.
- [ ] Platform connection status summary.
- [ ] Recent failure notification summary.
- [ ] Performance summary dari snapshot metrics.

### Acceptance

- [ ] Dashboard hanya menampilkan data user aktif.
- [ ] Empty state tersedia.
- [ ] Loading dan error state tersedia.

---

# Fase 4 — AI & Automation

## T-15: Trending & Insights

- **Modul:** Trending
- **Prioritas:** Low
- **Status:** Todo
- **Dependensi:** T-02
- **Estimasi:** 2–3 jam

### Sub-tasks

- [ ] Form keyword.
- [ ] Source + source URL opsional.
- [ ] Expiry/captured date.
- [ ] Search.
- [ ] Pagination.
- [ ] Edit/delete.

### Acceptance

- [ ] Trending manual dapat dibuat, dicari, diedit, dihapus.

---

## T-16: AI Content Generator

- **Modul:** AI
- **Prioritas:** Mid
- **Status:** Todo
- **Dependensi:** T-04, T-06
- **Estimasi:** 6–9 jam

### Sub-tasks

- [ ] Buat provider abstraction.
- [ ] Settings untuk BYOK provider.
- [ ] Encrypt API keys.
- [ ] Tampilkan hanya provider/name/last4 di UI.
- [ ] Implement text/caption generation.
- [ ] Implement image generation.
- [ ] Implement video generation bila provider mendukung async operation.
- [ ] Simpan generated asset ke Media Library.
- [ ] Jika generation async, simpan provider operation ID di media metadata.
- [ ] Worker polling generation status bila dibutuhkan.
- [ ] Model IDs dari environment/config.
- [ ] Validasi prompt dan ukuran request.

### Acceptance

- [ ] Raw AI key tidak pernah dikirim kembali ke browser.
- [ ] Generated image tersimpan sebagai `media_assets.source = ai`.
- [ ] Generation failure terlihat jelas.

---

## T-17: Automation API & API Keys

- **Modul:** Automation
- **Prioritas:** Low
- **Status:** Todo
- **Dependensi:** T-07, T-12
- **Estimasi:** 5–7 jam

### Sub-tasks

- [ ] API key creation.
- [ ] Hash key sebelum save.
- [ ] Tampilkan raw key hanya saat creation.
- [ ] API key revoke.
- [ ] `POST /api/v1/posts`.
- [ ] `POST /api/v1/posts/{id}/publish`.
- [ ] `POST /api/v1/posts/{id}/schedule`.
- [ ] `GET /api/v1/posts/{id}`.
- [ ] `GET /api/v1/connected-accounts`.
- [ ] Rate limit per API key.
- [ ] Dukungan `Idempotency-Key`.
- [ ] Return `202 Accepted` untuk async work.
- [ ] Test dengan contoh request n8n.

### Acceptance

- [ ] Request tanpa API key ditolak.
- [ ] Revoked key tidak dapat dipakai.
- [ ] Duplicate idempotency request tidak membuat post baru.

---

## T-18: Incoming Webhook

- **Modul:** Automation
- **Prioritas:** Low
- **Status:** Todo
- **Dependensi:** T-17
- **Estimasi:** 4–6 jam

### Sub-tasks

- [ ] Buat halaman webhook management.
- [ ] Generate endpoint token.
- [ ] Simpan token hanya dalam bentuk hash.
- [ ] Generate signing secret.
- [ ] Simpan signing secret encrypted.
- [ ] Buat `POST /api/webhooks/{token}`.
- [ ] Verifikasi signature/HMAC.
- [ ] Validasi schema payload.
- [ ] Dukungan event ID/idempotency.
- [ ] Rate limit.
- [ ] Audit last received timestamp.
- [ ] Test valid/invalid signature.

### Acceptance

- [ ] Request valid membuat/menjadwalkan post sesuai payload.
- [ ] Request invalid tidak membuat post.
- [ ] Duplicate event tidak menggandakan post.

---

## T-19: In-App Notifications

- **Modul:** Notifications
- **Prioritas:** Low
- **Status:** Todo
- **Dependensi:** T-02, T-12
- **Estimasi:** 3–4 jam

### Sub-tasks

- [ ] `createNotification()`.
- [ ] Notification bell + unread count.
- [ ] Notification list.
- [ ] Mark read.
- [ ] Preference in profile/settings.
- [ ] Integrasi permanent publish failure.
- [ ] Integrasi token reauth required.
- [ ] Integrasi email failure.

### Acceptance

- [ ] Notification tidak bocor antar user.
- [ ] Unread count benar.
- [ ] Email hanya dikirim bila preference mengizinkan.

---

# Fase 5 — Hardening & Launch

## T-20: Security Hardening

- **Modul:** Security
- **Prioritas:** High
- **Status:** Todo
- **Dependensi:** T-04, T-05, T-12, T-17, T-18
- **Estimasi:** 4–6 jam

### Sub-tasks

- [ ] Audit env variables.
- [ ] Audit server-only modules.
- [ ] Pastikan service key tidak masuk client bundle.
- [ ] Audit log redaction.
- [ ] Test RLS cross-user.
- [ ] Test unauthorized API access.
- [ ] Test webhook signature.
- [ ] Test API key revoke.
- [ ] Review security headers.
- [ ] Review CSRF/state protection pada OAuth flows.
- [ ] Review secure cookie/session configuration.

---

## T-21: Production Readiness

- **Modul:** Launch
- **Prioritas:** High
- **Status:** Todo
- **Dependensi:** T-13, T-14, T-16, T-17, T-18, T-19, T-20
- **Estimasi:** 5–8 jam

### Sub-tasks

- [ ] Production Supabase project.
- [ ] Production Storage bucket.
- [ ] Production environment variables.
- [ ] Render Web Service.
- [ ] Render Background Worker.
- [ ] Health logging worker.
- [ ] Error monitoring.
- [ ] Backup/restore procedure database.
- [ ] Migration procedure terdokumentasi.
- [ ] OAuth redirect production.
- [ ] Platform app review/audit checklist.
- [ ] End-to-end smoke test.
- [ ] Document rollback procedure.

### Acceptance

- [ ] Web Service production berjalan.
- [ ] Worker production berjalan.
- [ ] Queue dapat diproses tanpa manual trigger.
- [ ] Production secrets tidak ada di Git.
- [ ] Smoke test publish/schedule berjalan pada test account yang sah.

---

# Ringkasan Task

| Fase | Tasks | Fokus |
|---|---:|---|
| Fase 0 | 1 | External registration |
| Fase 1 | 6 | Foundation, auth, database, crypto, accounts, storage |
| Fase 2 | 6 | Composer, validation, Instagram, TikTok, scheduler, worker |
| Fase 3 | 3 | Analytics, dashboard, trending |
| Fase 4 | 4 | AI, API keys, webhook, notifications |
| Fase 5 | 2 | Security dan production readiness |
| **Total** | **22** | **End-to-end MVP** |

Estimasi total kasar: **sekitar 90–125 jam developer work**, tergantung pengalaman, proses review platform, debugging API pihak ketiga, dan tingkat polish UI.

---

# Urutan Pengerjaan yang Disarankan

```text
T-00
  ↓
T-01 → T-02 → T-03 → T-04
                  ↓
                 T-05 → T-06
                           ↓
                     T-07 → T-08
                       ↙       ↘
                    T-09       T-10
                       ↘       ↙
                         T-11
                           ↓
                  T-12 → T-13 → T-14
                           ↓
            T-15 / T-16 / T-17 / T-18 / T-19
                           ↓
                    T-20 → T-21
```

T-15 dapat dikerjakan paralel setelah database siap. T-17/T-18 sebaiknya tetap menunggu queue stabil karena automation akan membuat pekerjaan asynchronous.

---

# Cara Pakai dengan OpenCode

Prompt awal:

> Baca `1-PRD.md`, `2-TECH-SPEC.md`, dan `3-TASKS.md`. Jangan melakukan coding dulu. Ringkas arsitektur, lifecycle post, database ownership, queue flow, security boundary, dan dependency policy. Tandai konflik dokumen bila ada.

Setelah itu kerjakan satu task:

> Kerjakan T-01 saja sesuai `2-TECH-SPEC.md`. Jangan mengerjakan T-02 atau task lain. Setelah selesai, jalankan typecheck dan lint. Laporkan file yang berubah, hasil test, dan masalah yang masih tersisa.

Setiap task selesai:

1. review diff;
2. test;
3. update status task;
4. commit git;
5. lanjut ke task berikutnya.

---

# Final Rule untuk Coding Agent

**Jangan mengejar jumlah file atau banyaknya kode. Kejar konsistensi dengan PRD, Tech Spec, security boundary, dan Definition of Done.**
