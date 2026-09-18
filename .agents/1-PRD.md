# PRD: PostPilot — Multi-Platform Social Media Management

## Metadata

- **Nama aplikasi:** PostPilot
- **Versi dokumen:** 2.0 — Revised MVP
- **Platform:** Web App
- **Target:** Individual creators dan small business owners
- **Platform sosial MVP:** Instagram dan TikTok
- **Bahasa UI:** Indonesia
- **Database:** Supabase PostgreSQL
- **Storage:** Supabase Storage
- **Deployment:** Render Web Service + Background Worker
- **Prinsip utama:** sederhana, stabil di laptop developer, aman untuk token, dan mudah dikembangkan tanpa ORM

---

## 1. Visi Produk

PostPilot adalah aplikasi web untuk membuat, menyimpan, menjadwalkan, dan mempublikasikan konten ke Instagram dan TikTok dari satu tempat.

PostPilot bukan aplikasi sosial media. Fokusnya adalah **content operations**: media library, content composer, scheduler, publishing queue, retry, analytics dasar, AI content assistance, dan automation melalui REST API/webhook.

MVP dibuat untuk **akun individu**. Satu user dapat menghubungkan beberapa akun Instagram/TikTok miliknya. Team workspace, role, approval workflow, dan kolaborasi ditunda.

### Prinsip produk

1. **Centralized:** satu tempat untuk menyiapkan dan mengatur konten.
2. **Reliable:** publish dijalankan melalui queue + worker, bukan request web yang panjang.
3. **Platform-aware:** validasi mengikuti aturan platform dan tidak menganggap semua platform memiliki aturan yang sama.
4. **User-controlled:** AI membantu membuat konten, tetapi user tetap meninjau dan mengedit hasil sebelum publish.
5. **Secure by default:** token platform dan secret tidak pernah disimpan sebagai plaintext.

---

## 2. Masalah yang Diselesaikan

User yang aktif di beberapa platform biasanya harus:

- mengunggah media berulang kali;
- menulis caption berkali-kali;
- mengingat jadwal publish secara manual;
- memantau kegagalan posting tanpa sistem retry;
- berpindah aplikasi untuk membuat atau menyiapkan konten;
- mengelola token dan akun sosial secara terpisah.

PostPilot menyatukan alur tersebut dalam satu aplikasi.

---

## 3. Tujuan MVP

### Tujuan utama

**A. Centralized Posting**

User dapat membuat satu konten dan menyiapkannya untuk Instagram dan/atau TikTok dari satu composer.

**B. Scheduling**

User dapat memilih tanggal, waktu, dan timezone. Konten masuk queue dan worker mengeksekusi publish pada waktu yang ditentukan.

**C. Reliable Delivery**

Kegagalan transient seperti timeout, rate limit, dan error server dapat di-retry otomatis. Kegagalan permanent ditampilkan dengan alasan yang jelas.

**D. Media Reuse**

Media yang pernah diunggah tersimpan di library dan dapat digunakan kembali.

**E. AI Assistance**

User dapat menggunakan provider AI miliknya sendiri untuk generate image, video, dan caption.

**F. Basic Analytics**

User dapat melihat metrik per post yang berhasil diambil dari platform.

**G. Automation**

External tool seperti n8n dapat membuat post atau menjadwalkan post melalui REST API dan webhook.

### Yang tidak dijanjikan pada MVP

- rekomendasi waktu optimal berbasis machine learning;
- auto-scraping trending;
- workflow builder visual;
- team collaboration;
- approval workflow;
- native mobile app;
- jaminan semua konten pasti dipublikasikan bila API platform menolak atau akses aplikasi belum disetujui.

---

## 4. Persona

### Persona 1 — Content Creator

- Level teknis: menengah
- Tujuan: menyiapkan dan menjadwalkan konten lintas platform dengan cepat
- Pain point: banyak pekerjaan berulang dan sering lupa jadwal
- Kebutuhan utama: composer, media library, scheduler, queue, analytics

### Persona 2 — Small Business Owner

- Level teknis: pemula
- Tujuan: promosi produk secara konsisten
- Pain point: keterbatasan waktu dan kesulitan membuat konten
- Kebutuhan utama: template sederhana, AI assistance, scheduler, automation

---

## 5. Scope MVP

### Termasuk

- App authentication melalui Supabase Auth
- Email/password authentication
- Google sign-in sebagai opsi yang dapat diaktifkan
- Multi-account Instagram
- Multi-account TikTok
- OAuth connect/disconnect untuk akun sosial
- Encrypted platform tokens
- Media Library
- Direct/resumable upload ke Supabase Storage
- Content Composer
- Caption terpisah per platform
- TikTok privacy setting dan commercial disclosure
- Preview dasar
- Platform validation
- Publish Now melalui queue
- Scheduler calendar
- Queue + retry + worker
- Instagram publishing
- TikTok publishing
- Per-post analytics dasar
- Dashboard
- Manual Trending & Insights
- AI image generation
- AI video generation
- AI caption suggestion
- BYOK AI keys
- REST API
- Incoming webhook untuk automation
- In-app notification
- Email notification untuk failure penting

### Ditunda ke v2

- Team/workspace
- Roles & permissions
- Approval workflow
- Visual automation builder
- Outbound webhook/event bus yang lengkap
- Native mobile app
- Automated trend scraping
- Social inbox/comment management
- Story publishing bila belum didukung oleh integration scope yang dipilih
- Advanced growth analytics/follower history
- PDF analytics export

---

## 6. User Stories

### Authentication & Accounts

1. Sebagai user, saya ingin membuat akun dengan email dan password agar dapat masuk ke PostPilot.
2. Sebagai user, saya ingin login dengan Google jika opsi tersebut diaktifkan.
3. Sebagai user, saya ingin menghubungkan akun Instagram agar dapat publish dari PostPilot.
4. Sebagai user, saya ingin menghubungkan akun TikTok agar dapat publish dari PostPilot.
5. Sebagai user, saya ingin melihat status koneksi akun.
6. Sebagai user, saya ingin disconnect akun yang tidak lagi digunakan.
7. Sebagai user, saya ingin mendapat peringatan sebelum token platform kedaluwarsa.

### Content Composer

8. Sebagai user, saya ingin memilih media dari Media Library.
9. Sebagai user, saya ingin mengunggah media baru dari composer.
10. Sebagai user, saya ingin menulis caption berbeda untuk Instagram dan TikTok.
11. Sebagai user, saya ingin memilih akun target per platform.
12. Sebagai user TikTok, saya ingin memilih privacy level yang memang tersedia untuk akun saya.
13. Sebagai user, saya ingin menandai konten komersial untuk TikTok.
14. Sebagai user, saya ingin melihat preview sebelum publish.
15. Sebagai user, saya ingin mendapatkan pesan validasi yang jelas jika konten tidak memenuhi aturan platform.

### Media Library

16. Sebagai user, saya ingin menyimpan media untuk dipakai kembali.
17. Sebagai user, saya ingin mencari media berdasarkan nama, tag, tipe, dan tanggal.
18. Sebagai user, saya ingin menghapus media yang tidak lagi diperlukan.

### Scheduler & Publishing

19. Sebagai user, saya ingin publish sekarang tanpa menunggu scheduler.
20. Sebagai user, saya ingin menjadwalkan publish pada tanggal dan waktu tertentu.
21. Sebagai user, saya ingin melihat post pada calendar.
22. Sebagai user, saya ingin memindahkan jadwal melalui drag-and-drop.
23. Sebagai user, saya ingin membatalkan post yang belum diproses.
24. Sebagai user, saya ingin melihat status draft, scheduled, processing, published, failed, atau partial failed.
25. Sebagai user, saya ingin post gagal transient di-retry otomatis.

### AI

26. Sebagai user, saya ingin generate image dari prompt.
27. Sebagai user, saya ingin generate video dari prompt jika provider mendukungnya.
28. Sebagai user, saya ingin meminta beberapa opsi caption.
29. Sebagai user, saya ingin menyimpan hasil AI ke Media Library.
30. Sebagai user, saya ingin memasukkan API key provider AI milik saya sendiri.

### Analytics

31. Sebagai user, saya ingin melihat metrik setiap post berdasarkan platform.
32. Sebagai user, saya ingin melihat waktu terakhir analytics diperbarui.
33. Sebagai user, saya ingin export data analytics dalam CSV.

### Automation

34. Sebagai user, saya ingin membuat API key untuk n8n atau tool lain.
35. Sebagai user, saya ingin external tool membuat post atau schedule melalui API.
36. Sebagai user, saya ingin membuat incoming webhook yang aman untuk menerima trigger dari external tool.

---

## 7. Functional Requirements

### FR-01 — Authentication

- Menggunakan Supabase Auth.
- MVP utama: email + password.
- Google sign-in dapat diaktifkan melalui konfigurasi Supabase Auth.
- Session tersedia pada browser dan server menggunakan cookie-based SSR flow.
- Semua route dashboard harus terproteksi.

**Acceptance criteria:**
- User yang belum login tidak dapat membuka dashboard.
- User dapat register, login, logout, dan reset password.
- Session tetap valid setelah refresh browser.

### FR-02 — Connect Instagram

- User memulai OAuth Instagram dari halaman Accounts.
- Callback ditangani route khusus OAuth.
- Token disimpan terenkripsi.
- `platform_account_id`, username/display name, scopes, expiry, dan status dicatat.
- OAuth account platform dipisahkan dari authentication account PostPilot.

**Acceptance criteria:**
- Connect sukses membuat satu `connected_accounts` row.
- Connect ulang akun yang sama tidak membuat duplicate connection.
- Disconnect membuat connection tidak dapat digunakan untuk publish.

### FR-03 — Connect TikTok

- User memulai OAuth TikTok dari halaman Accounts.
- Access token disimpan terenkripsi.
- Scope harus sesuai kemampuan yang benar-benar digunakan.
- Metadata creator disimpan agar UI dapat menampilkan akun tujuan.
- Privacy options dan batas durasi diambil dari informasi creator terbaru saat proses publish.

**Acceptance criteria:**
- Connect/disconnect bekerja.
- Akun yang token-nya invalid ditandai `expired` atau `reauth_required`.
- Publish tidak dijalankan ke akun tanpa scope yang diperlukan.

### FR-04 — Media Upload

- Gambar/video di-upload langsung dari browser ke Supabase Storage.
- Untuk file besar digunakan resumable upload.
- Aplikasi hanya membuat upload authorization dan menyimpan metadata.
- Bucket media bersifat private.
- URL akses media dibuat sementara/signed URL ketika diperlukan.

**Aturan MVP:**
- UI menolak format yang tidak didukung.
- Video besar tidak boleh melewati server Next.js sebagai multipart body biasa.
- Batas ukuran aplikasi harus configurable dan mengikuti kebutuhan platform serta storage plan.

### FR-05 — Media Library

- Media tersimpan dengan metadata:
  - nama asli;
  - tipe;
  - MIME type;
  - ukuran;
  - width/height jika tersedia;
  - duration jika video dan metadata tersedia;
  - storage path;
  - tags;
  - created_at.
- Support search + pagination.
- Delete harus menghapus metadata database dan object storage dengan aman.

### FR-06 — Content Composer

- User memilih satu atau beberapa media.
- User memilih satu atau beberapa connected account target.
- Caption disimpan terpisah per platform.
- Post terdiri dari satu parent `posts` dan satu atau lebih `post_platforms`.
- Setiap target platform memiliki lifecycle sendiri.

**Acceptance criteria:**
- Instagram dapat sukses walaupun TikTok gagal.
- TikTok dapat sukses walaupun Instagram gagal.
- Parent post menampilkan status gabungan yang menjelaskan kondisi tiap platform.

### FR-07 — TikTok Metadata & Disclosure

- Tampilkan creator nickname/account target.
- Tampilkan privacy options yang dikembalikan API.
- User memilih privacy level yang tersedia.
- Commercial disclosure disimpan pada target TikTok.
- Publish harus menghormati hasil `creator_info` terbaru.

### FR-08 — Platform Validation

Validasi dilakukan dua kali:

1. saat composer submit;
2. tepat sebelum worker melakukan publish.

Validasi meliputi MIME type, ukuran, jumlah media, aspect ratio, duration, caption, dan field wajib platform.

Aplikasi **tidak boleh menganggap nilai hardcoded lama sebagai sumber kebenaran tunggal**. Aturan yang dinamis harus berasal dari response API atau konfigurasi platform yang dapat diperbarui.

### FR-09 — Publish Now

- Tombol Publish Now membuat atau memperbarui `schedule_queue` menjadi siap diproses sekarang.
- Route web tidak menunggu API Instagram/TikTok sampai selesai.
- Worker yang melakukan publish.
- UI menampilkan status `queued`/`processing` sampai hasil tersedia.

### FR-10 — Scheduler

- Support monthly dan weekly calendar.
- Simpan waktu sebagai UTC untuk eksekusi.
- Simpan IANA timezone yang dipilih user untuk audit dan editing.
- Default timezone berasal dari profile/user setting atau browser timezone.
- MVP: scheduled time minimal 1 jam dari sekarang dan maksimal 30 hari ke depan.
- Publish Now adalah jalur terpisah dari aturan minimum schedule.
- Drag-and-drop hanya mengubah job yang belum mulai diproses.

### FR-11 — Queue & Retry

Setiap target platform mempunyai queue item independen.

Retry hanya otomatis untuk error transient, misalnya:

- network timeout;
- HTTP 429;
- HTTP 500/502/503/504;
- temporary provider unavailable.

Jangan retry otomatis untuk:

- invalid token;
- permission/scope tidak cukup;
- media tidak valid;
- caption/metadata invalid;
- user/account restricted;
- permanent platform error.

**MVP retry policy:** maksimal 3 attempt total per publish operation, dengan exponential backoff dan jitter.

### FR-12 — Idempotency & Duplicate Protection

- Setiap `post_platform` memiliki internal idempotency key.
- API eksternal dapat mengirim `Idempotency-Key`.
- Worker harus menyimpan `platform_publish_id`/container id sebelum langkah lanjutan jika platform mengembalikannya.
- Jika worker timeout setelah request eksternal dikirim, worker tidak boleh langsung membuat publish baru tanpa memeriksa status yang tersedia.
- Kondisi yang benar-benar tidak dapat dipastikan harus masuk `failed` dengan reason `unknown_publish_state` untuk review manual, bukan blind retry yang berpotensi duplicate post.

### FR-13 — Instagram Publishing

Publish menggunakan workflow platform yang berlaku pada integration version saat implementasi.

Worker bertanggung jawab untuk:

1. membuat media/container bila diperlukan;
2. menunggu status siap;
3. melakukan publish;
4. menyimpan platform post ID;
5. mencatat raw response yang telah disanitasi.

Rate/quota enforcement harus berada di worker sebelum request dan juga menangani HTTP 429.

### FR-14 — TikTok Publishing

Worker harus:

1. mengambil creator information terbaru;
2. memvalidasi privacy level dan max duration;
3. menginisialisasi video/photo publish sesuai jenis konten;
4. menyelesaikan transfer media bila diperlukan;
5. menyimpan `publish_id`;
6. melakukan polling status atau menerima webhook jika mekanisme webhook sudah diaktifkan;
7. menyimpan hasil final.

Untuk client yang belum diaudit, UI dan status sistem harus memperlakukan konten sesuai restriction private yang diberikan platform.

### FR-15 — Analytics

- Analytics per `post_platform`.
- Data disimpan sebagai snapshot dengan `fetched_at`.
- Refresh default maksimal setiap 1 jam per post kecuali manual refresh dilakukan.
- Nilai yang tidak didukung platform tidak boleh diisi sebagai nol palsu.
- UI harus menampilkan `N/A` atau menyembunyikan metric yang tidak tersedia.
- Export MVP: CSV.

### FR-16 — AI Content Generator

- Provider abstraction.
- Provider dan model dipilih melalui konfigurasi.
- Model ID tidak hardcoded pada UI.
- User dapat menggunakan BYOK.
- API key tidak pernah dikirim ke browser setelah disimpan.
- Generated media diberi `source = ai` dan disimpan di Media Library.

### FR-17 — Automation API

REST API MVP:

- `POST /api/v1/posts` — membuat post draft/queued.
- `POST /api/v1/posts/{id}/publish` — memasukkan target post ke queue.
- `POST /api/v1/posts/{id}/schedule` — menjadwalkan target post.
- `GET /api/v1/posts/{id}` — status.
- `GET /api/v1/connected-accounts` — akun terhubung.

Semua request eksternal menggunakan API key yang di-hash di database.

Response untuk operasi async sebaiknya menggunakan `202 Accepted` bila pekerjaan belum selesai.

### FR-18 — Incoming Webhook

- User membuat endpoint webhook dari halaman Automation.
- Secret disimpan terenkripsi.
- Request diverifikasi dengan HMAC/signature.
- Payload divalidasi menggunakan schema.
- Rate limit diberlakukan per endpoint/key dan sumber request.
- Duplicate delivery harus aman melalui event ID/idempotency key.

### FR-19 — Notifications

Notifikasi dibuat untuk minimal:

- publish failed permanent;
- token membutuhkan re-authentication;
- scheduled publish berhasil;
- scheduled publish gagal setelah retry habis.

Channel MVP:

- in-app;
- email untuk failure penting.

---

## 8. Non-Functional Requirements

### Security

- Semua komunikasi production melalui HTTPS.
- Token platform dan AI API key dienkripsi dengan AES-256-GCM.
- Encryption key hanya di environment variable server/worker.
- Supabase `service_role` key hanya boleh berada di server/worker.
- RLS aktif untuk seluruh tabel user-owned.
- API key inbound disimpan sebagai hash, bukan plaintext.
- Webhook signing secret disimpan encrypted karena perlu dibaca saat verifikasi.
- Jangan log access token, refresh token, API key, cookie, atau secret.

### Performance

- Dashboard awal target < 2 detik pada kondisi normal.
- API internal normal target < 500 ms untuk operasi database ringan.
- Upload video tidak melewati request body Next.js.
- Publish API bersifat asynchronous.

### Reliability

- Worker mempunyai graceful shutdown.
- Queue memiliki lease/lock dan recovery untuk job stale.
- Setiap external publish attempt dicatat.
- Retry hanya untuk error transient.
- Worker dapat dijalankan ulang tanpa membuat duplicate publish secara buta.

### Usability

- Responsive desktop/tablet/mobile.
- Bahasa Indonesia.
- Dark mode.
- Status post harus mudah dipahami tanpa membuka log teknis.
- Error harus memberi tindakan berikutnya, misalnya `Reconnect Instagram` atau `Perbaiki video`.

---

## 9. Data & Lifecycle Rules

### Parent post status

- `draft`
- `scheduled`
- `processing`
- `published`
- `partial_failed`
- `failed`
- `cancelled`

### Per-platform status

- `draft`
- `queued`
- `processing`
- `published`
- `failed`
- `cancelled`

Parent post dihitung dari status semua target platform.

### Ownership

Semua data yang dimiliki user harus memiliki `user_id` yang merujuk ke `auth.users.id` secara langsung atau melalui relasi yang jelas.

---

## 10. Out of Scope V1

- Team/workspace
- Role/permission selain ownership user
- Approval workflow
- Visual workflow builder
- Social inbox
- Auto trend scraping
- Native mobile app
- Advanced follower-growth snapshots
- PDF analytics export
- Full media transcoding pipeline
- Automatic content moderation AI

---

## 11. Success Criteria MVP

### Functional

- [ ] User dapat register/login/logout.
- [ ] User dapat connect Instagram dan TikTok.
- [ ] User dapat upload image/video ke Media Library.
- [ ] User dapat membuat post dengan target platform berbeda.
- [ ] User dapat publish now.
- [ ] User dapat schedule post.
- [ ] Worker menjalankan queued publish.
- [ ] Retry transient failure berjalan otomatis.
- [ ] Permanent failure terlihat jelas di UI.
- [ ] TikTok publish menghormati creator/privacy information terbaru.
- [ ] User dapat melihat analytics per post bila platform menyediakan metric tersebut.
- [ ] User dapat menggunakan AI BYOK.
- [ ] User dapat menggunakan REST API/webhook.

### Technical

- [ ] Tidak ada ORM.
- [ ] Database access memakai Supabase client + SQL migrations.
- [ ] RLS aktif.
- [ ] Upload besar memakai direct/resumable storage upload.
- [ ] Publish eksternal hanya dilakukan oleh worker.
- [ ] Token/secret tidak tercetak di log.
- [ ] Duplicate protection dan stale-job recovery diuji.

### Go-Live

Go-live tetap bergantung pada approval/audit, scope, account eligibility, review, dan kebijakan platform pihak ketiga. Status tersebut tidak dianggap sebagai masalah coding yang dapat diselesaikan dari aplikasi saja.

---

## 12. Product Decision Log

### D-01 — Supabase sebagai platform backend utama

Database, storage, dan authentication menggunakan Supabase agar tidak ada lapisan ORM/auth/storage yang duplikatif.

### D-02 — Publish asynchronous

Semua publish masuk queue. Web request hanya membuat/update pekerjaan dan mengembalikan status.

### D-03 — Per-platform isolation

Instagram dan TikTok memiliki lifecycle sendiri agar keberhasilan salah satu platform tidak menutupi kegagalan platform lain.

### D-04 — No local container dependency untuk development database

Development dapat menggunakan project Supabase remote. Menjalankan stack database lokal berbasis container bukan requirement MVP.

### D-05 — Rules configurable

Batas platform yang mudah berubah disimpan sebagai configuration/provider response, bukan disebar sebagai angka hardcoded di seluruh aplikasi.

---

## 13. Hubungan dengan Dokumen Lain

- `1-PRD.md` = **what & why**
- `2-TECH-SPEC.md` = **how**
- `3-TASKS.md` = **execution order**

Ketiga dokumen harus selalu konsisten. Bila ada konflik:

1. aturan produk di PRD menentukan scope;
2. arsitektur di Tech Spec menentukan implementasi;
3. Tasks menentukan urutan pengerjaan.
