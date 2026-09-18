# Tech Spec: PostPilot

## Status Dokumen

- **Versi:** 2.0 — Revised, Supabase-first architecture
- **Tujuan:** menjadi sumber kebenaran teknis untuk implementasi PostPilot MVP.
- **Prinsip:** minim dependency, stabil di laptop developer, database sederhana, worker terpisah, dan tidak menggunakan ORM.

---

## 1. Overview

PostPilot adalah web app Next.js untuk manajemen konten Instagram dan TikTok. Aplikasi terdiri dari dua proses utama:

1. **Web Service** — UI, authenticated routes, API internal, OAuth callback, enqueue jobs.
2. **Background Worker** — publish ke Instagram/TikTok, retry, polling hasil publish, refresh token, dan refresh analytics.

Database dan storage berada di Supabase.

### Aturan arsitektur yang wajib

- Web request **tidak** melakukan publish eksternal yang lama.
- Worker adalah satu-satunya komponen yang melakukan operasi publish asynchronous.
- `lib/core`, `lib/db`, `lib/platforms`, `lib/queue`, `lib/crypto` harus dapat dijalankan tanpa import `next/*`.
- Database access tidak memakai ORM.
- Database schema dikelola dengan SQL migrations di `supabase/migrations/`.
- Browser tidak boleh menerima service-role key, platform token, AI key, atau encryption key.

---

## 2. Stack

| Area | Pilihan |
|---|---|
| Framework | Next.js App Router |
| Language | TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Validation | Zod |
| Auth | Supabase Auth |
| Browser/server DB client | `@supabase/supabase-js` + `@supabase/ssr` |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| Large upload | TUS/resumable upload |
| Background Worker | Node.js process |
| Hosting | Render Web Service + Background Worker |
| Encryption | Node `crypto` / AES-256-GCM |
| Date/time | `date-fns` + timezone utilities bila diperlukan |
| Icons | lucide-react |
| AI | Provider abstraction, BYOK |
| Email | Resend atau provider setara |

### Dependency policy

- Jangan menambahkan library besar untuk pekerjaan yang bisa dilakukan oleh Web API/Node built-ins.
- Jangan menambahkan state-management library global sebelum ada kebutuhan nyata.
- Hindari native dependency yang tidak diperlukan.
- Jangan menjalankan database container lokal sebagai requirement development.

---

## 3. Authentication Architecture

Supabase Auth menjadi satu-satunya authentication layer aplikasi.

### MVP auth

- Email/password.
- Google OAuth dapat diaktifkan melalui Supabase Auth Provider.
- Session menggunakan cookie-based SSR integration.
- User identity berasal dari `auth.users.id`.
- Data aplikasi yang perlu profile/preferences disimpan di `public.profiles`.

### Client split

**Browser**

`lib/supabase/client.ts`

- menggunakan publishable key;
- aman digunakan di browser;
- tunduk pada RLS.

**Server**

`lib/supabase/server.ts`

- menggunakan SSR cookie client;
- digunakan Server Component, Server Action, dan Route Handler.

**Worker/service**

`lib/supabase/service.ts`

- menggunakan service-role key;
- hanya server/worker;
- tidak boleh di-import oleh client bundle.

### Auth callback

`app/auth/callback/route.ts`

Dipakai untuk OAuth callback Supabase Auth seperti Google.

### Social platform OAuth

OAuth Instagram/TikTok bukan Supabase Auth. OAuth tersebut harus dipisahkan dari authentication PostPilot dan disimpan pada `connected_accounts`.

---

## 4. Database Access tanpa ORM

Semua SQL dikelola di:

```text
supabase/
├── migrations/
│   ├── 0001_initial_schema.sql
│   ├── 0002_indexes_rls.sql
│   └── 0003_queue_functions.sql
└── seed.sql
```

Akses application menggunakan Supabase JS.

### Repository pattern

Repository tidak membuat singleton client sendiri. Repository menerima client yang sudah dibuat:

```ts
async function getPostById(client, postId) {
  return client
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();
}
```

Dengan pola ini:

- Server route dapat memakai client yang tunduk RLS.
- Worker dapat memakai service client.
- Business logic tidak tergantung framework Next.js.
- Testing repository lebih mudah.

### SQL transaction & atomic queue claim

Supabase JS tidak boleh digunakan sebagai alasan untuk melakukan beberapa update kritis secara terpisah.

Operasi queue yang harus atomic menggunakan PostgreSQL function/RPC, terutama:

- claim due jobs;
- recover stale jobs;
- transition status tertentu;
- increment attempt counter.

---

## 5. Database Schema

MVP menggunakan **15 tabel aplikasi** + system schema `auth.users` milik Supabase.

### 5.1 `profiles`

Profile dan preference user.

Field minimum:

- `id uuid primary key references auth.users(id) on delete cascade`
- `display_name text`
- `timezone text`
- `email_notifications_enabled boolean default true`
- `in_app_notifications_enabled boolean default true`
- `created_at timestamptz`
- `updated_at timestamptz`

### 5.2 `connected_accounts`

Akun Instagram/TikTok yang terhubung.

Field minimum:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `platform text check (platform in ('instagram','tiktok'))`
- `platform_account_id text not null`
- `username text`
- `display_name text`
- `avatar_url text`
- `access_token_encrypted text not null`
- `refresh_token_encrypted text`
- `token_expires_at timestamptz`
- `status text check (status in ('active','expired','reauth_required','disconnected'))`
- `scopes text[]`
- `metadata jsonb default '{}'::jsonb`
- `connected_at timestamptz`
- `updated_at timestamptz`

Unique: `(user_id, platform, platform_account_id)`.

### 5.3 `media_assets`

Metadata asset media.

Field minimum:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `storage_bucket text not null`
- `storage_path text not null`
- `original_name text`
- `media_type text check (media_type in ('image','video'))`
- `mime_type text`
- `file_size bigint`
- `width integer`
- `height integer`
- `duration_seconds numeric`
- `tags text[] default '{}'`
- `source text check (source in ('upload','ai'))`
- `status text check (status in ('uploading','processing','ready','failed','deleted'))`
- `metadata jsonb default '{}'::jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

Canonical asset reference adalah `storage_bucket + storage_path`, bukan URL publik permanen.

### 5.4 `posts`

Parent object untuk satu content item.

Field minimum:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `title text`
- `status text check (status in ('draft','scheduled','processing','published','partial_failed','failed','cancelled'))`
- `created_at timestamptz`
- `updated_at timestamptz`

### 5.5 `post_platforms`

Target platform independen.

Field minimum:

- `id uuid primary key`
- `post_id uuid not null references posts(id) on delete cascade`
- `connected_account_id uuid not null references connected_accounts(id)`
- `platform text check (platform in ('instagram','tiktok'))`
- `caption text`
- `hashtags text[]`
- `status text check (status in ('draft','queued','processing','published','failed','cancelled'))`
- `scheduled_at timestamptz`
- `published_at timestamptz`
- `platform_post_id text`
- `platform_publish_id text`
- `failure_code text`
- `failure_message text`
- `commercial_disclosure boolean default false`
- `privacy_level text`
- `platform_metadata jsonb default '{}'::jsonb`
- `idempotency_key text not null`
- `created_at timestamptz`
- `updated_at timestamptz`

Unique: `(connected_account_id, idempotency_key)`.

### 5.6 `post_media`

Relasi many-to-many untuk media post.

Field minimum:

- `id uuid primary key`
- `post_id uuid not null references posts(id) on delete cascade`
- `media_asset_id uuid not null references media_assets(id)`
- `position integer not null`

Unique: `(post_id, position)`.

### 5.7 `schedule_queue`

Operational queue per target platform.

Field minimum:

- `id uuid primary key`
- `post_platform_id uuid not null unique references post_platforms(id) on delete cascade`
- `scheduled_at timestamptz not null`
- `next_attempt_at timestamptz not null`
- `status text check (status in ('pending','processing','succeeded','failed','cancelled'))`
- `attempt_count integer default 0`
- `locked_at timestamptz`
- `locked_by text`
- `last_error text`
- `created_at timestamptz`
- `updated_at timestamptz`

### 5.8 `publish_attempts`

Log technical setiap operasi external API.

Field minimum:

- `id uuid primary key`
- `schedule_queue_id uuid references schedule_queue(id) on delete cascade`
- `attempt_number integer`
- `operation text`
- `attempted_at timestamptz`
- `result text`
- `http_status integer`
- `error_code text`
- `error_message text`
- `response_json jsonb`
- `duration_ms integer`
- `request_id text`

**Security:** response harus disanitasi sebelum disimpan. Jangan simpan token/secret.

### 5.9 `post_metrics`

Snapshot analytics per target platform.

Field minimum:

- `id uuid primary key`
- `post_platform_id uuid not null references post_platforms(id) on delete cascade`
- `likes bigint`
- `comments bigint`
- `shares bigint`
- `saves bigint`
- `views bigint`
- `reach bigint`
- `impressions bigint`
- `extra_metrics jsonb default '{}'::jsonb`
- `fetched_at timestamptz not null`

Index: `(post_platform_id, fetched_at desc)`.

### 5.10 `trending_topics`

Manual trending input.

Field minimum:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `keyword text not null`
- `source text`
- `source_url text`
- `captured_at timestamptz`
- `expires_at timestamptz`
- `created_at timestamptz`

### 5.11 `brand_styles`

Style guide untuk AI/content creation.

Field minimum:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `name text not null`
- `style_guide jsonb not null default '{}'::jsonb`
- `is_default boolean default false`
- `created_at timestamptz`
- `updated_at timestamptz`

### 5.12 `ai_api_keys`

BYOK keys.

Field minimum:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `provider text not null`
- `label text`
- `key_ciphertext text not null`
- `key_last4 text`
- `created_at timestamptz`
- `updated_at timestamptz`

Jangan simpan raw API key.

### 5.13 `webhooks`

Incoming webhook configurations.

Field minimum:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `name text not null`
- `event_type text not null`
- `endpoint_token_hash text not null`
- `signing_secret_ciphertext text not null`
- `active boolean default true`
- `last_received_at timestamptz`
- `created_at timestamptz`
- `updated_at timestamptz`

### 5.14 `api_keys`

Authentication key untuk REST API.

Field minimum:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `name text not null`
- `key_prefix text not null`
- `key_hash text not null`
- `last_used_at timestamptz`
- `expires_at timestamptz`
- `revoked_at timestamptz`
- `created_at timestamptz`

Raw key hanya ditampilkan sekali saat creation.

### 5.15 `notifications`

In-app notification.

Field minimum:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `title text not null`
- `message text not null`
- `type text not null`
- `channel text check (channel in ('in_app','email'))`
- `read_at timestamptz`
- `created_at timestamptz`

---

## 6. Row Level Security

RLS harus aktif pada semua tabel user-owned.

### Rule umum

User hanya boleh:

- `select` data miliknya;
- `insert` dengan `user_id = auth.uid()`;
- `update/delete` data miliknya.

Untuk tabel yang ownership-nya melalui relasi, policy harus memeriksa parent ownership.

Contoh konsep policy:

```sql
using (user_id = auth.uid())
with check (user_id = auth.uid())
```

Worker menggunakan service role untuk pekerjaan lintas user. Business logic worker tetap wajib memeriksa relasi/ownership agar bug aplikasi tidak berubah menjadi cross-account publish.

---

## 7. Queue Architecture

### Prinsip

Queue menggunakan Postgres sebagai source of truth pada MVP.

Tidak perlu Redis/BullMQ untuk MVP awal karena volume target kecil dan queue state sudah berada dekat dengan data post.

### Claim flow

1. Worker mencari queue item `pending` dengan `next_attempt_at <= now()`.
2. PostgreSQL function melakukan `FOR UPDATE SKIP LOCKED`.
3. Job diubah menjadi `processing` dan diberi `locked_by` + `locked_at` dalam transaksi yang sama.
4. Worker memproses job.
5. Worker menulis `publish_attempts`.
6. Worker mengubah status queue menjadi `succeeded`, `failed`, atau menjadwalkan next attempt.

### Stale job

Jika `processing` lebih lama dari lease threshold tanpa heartbeat/update:

- job dianggap stale;
- lock dibersihkan;
- job kembali `pending` jika masih retryable;
- atau `failed` jika batas attempt telah tercapai.

### Polling interval

Worker polling interval configurable, misalnya 2–5 detik. Jangan hardcode di banyak file.

---

## 8. Retry Policy

### Retryable

- 429
- 5xx
- network error
- timeout
- temporary provider availability error

### Non-retryable

- 400 validation
- 401/invalid token
- 403 missing scope/permission
- account restricted
- unsupported media
- invalid privacy setting
- permanent provider error

### Backoff

Default policy:

```text
attempt 1 -> immediate
attempt 2 -> +1 minute + jitter
attempt 3 -> +5 minutes + jitter
```

`max attempts = 3 total`, configurable.

Setiap retry harus menghasilkan `publish_attempts` row.

---

## 9. Idempotency & External Publish State

### Internal

`post_platform.idempotency_key` unik per target.

### External

Jika provider mengembalikan container ID/publish ID, simpan sebelum melakukan langkah berikutnya.

### Timeout after request

Jangan membuat request publish kedua hanya karena response pertama timeout.

Gunakan state machine:

```text
queued
  -> processing
  -> external_initialized
  -> external_processing
  -> published
```

State provider-specific disimpan di `platform_metadata` atau kolom ID yang relevan.

Bila state eksternal benar-benar tidak dapat diverifikasi, tampilkan `unknown_publish_state` dan hentikan auto retry untuk mencegah duplicate publish.

---

## 10. Worker Design

Entry point:

```text
worker/index.ts
```

Worker bertanggung jawab atas:

- queue claim;
- Instagram publish;
- TikTok publish;
- status polling;
- token refresh;
- analytics refresh;
- email notification failure;
- stale queue recovery.

### Worker lifecycle

```text
start
  -> validate env
  -> create service client
  -> enter polling loop
  -> handle SIGTERM/SIGINT
  -> finish current safe operation
  -> release/restore leased jobs
  -> exit
```

Worker tidak boleh import:

- `next/server`
- `next/headers`
- `next/cache`
- UI component
- browser-only API

---

## 11. Supabase Storage Architecture

Bucket media sebaiknya private.

### Upload flow

1. Browser meminta permission/path upload ke server.
2. Server memvalidasi user dan filename.
3. Server membuat signed upload authorization.
4. Browser upload langsung ke Storage.
5. Browser memberi tahu server upload selesai.
6. Server menyimpan metadata `media_assets` dengan status `ready` atau `processing`.

### Large files

Video lebih besar dari ukuran kecil biasa harus menggunakan resumable/TUS upload. Jangan membuat Next.js Route Handler menerima multipart video besar sebagai proxy.

### Path convention

```text
media/{user_id}/{year}/{month}/{uuid}-{safe_filename}
```

Jangan menggunakan nama file user sebagai satu-satunya unique identifier.

---

## 12. Platform Integration

## 12.1 Instagram

`lib/platforms/instagram/`

Pisahkan:

- OAuth client
- token refresh
- media container creation
- container status
- publish
- quota/rate-limit handling
- insights

### Prinsip

- Gunakan API version dari configuration.
- Scope hanya yang diperlukan.
- Simpan provider response yang sudah disanitasi.
- Jangan hardcode API version di banyak file.
- Quota/rate-limit tidak boleh diasumsikan selalu sama selamanya; konfigurasi harus mudah diubah.

### Publish strategy

Semua operasi publish dijalankan worker.

---

## 12.2 TikTok

`lib/platforms/tiktok/`

Pisahkan:

- OAuth
- token refresh
- creator info
- direct video publish
- photo publish
- upload transfer
- publish status
- webhook verification
- analytics
- rate-limit handling

### Dynamic creator info

Sebelum direct post:

1. query creator info;
2. baca privacy options;
3. baca `max_video_post_duration_sec`;
4. validasi pilihan user;
5. baru initialize publish.

### Endpoint-specific limits

Implement rate limiter per endpoint/token, bukan satu angka global untuk seluruh API.

Nilai dokumentasi yang perlu dijadikan configuration saat implementasi saat ini termasuk:

- creator info: 20 request/menit per user access token;
- video initialize: 6 request/menit per user access token;
- photo/content initialize: 6 request/menit per user access token;
- publish status: 30 request/menit per user access token.

Nilai tersebut harus diverifikasi kembali terhadap dokumentasi platform sebelum production release karena platform dapat mengubah limit.

### Unaudited app

System harus mampu menangani kondisi client belum diaudit, termasuk restriction private dan active-user/posting cap yang berlaku pada platform.

---

## 13. API Layer

### Web/internal routes

```text
app/
├── auth/callback/route.ts
├── api/
│   ├── accounts/
│   │   ├── instagram/connect/route.ts
│   │   ├── instagram/callback/route.ts
│   │   ├── tiktok/connect/route.ts
│   │   └── tiktok/callback/route.ts
│   ├── media/route.ts
│   ├── posts/route.ts
│   ├── posts/[id]/publish/route.ts
│   ├── posts/[id]/schedule/route.ts
│   ├── posts/[id]/cancel/route.ts
│   ├── analytics/route.ts
│   ├── ai/route.ts
│   ├── webhooks/[token]/route.ts
│   └── v1/
│       ├── posts/route.ts
│       ├── posts/[id]/route.ts
│       └── connected-accounts/route.ts
```

### Rule penting

Route posting hanya:

- autentikasi;
- validasi;
- membuat/mengubah DB record;
- enqueue.

Route posting tidak melakukan external publish synchronous.

---

## 14. Project Structure

```text
postpilot/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── reset-password/page.tsx
│   ├── auth/
│   │   └── callback/route.ts
│   ├── (dashboard)/
│   │   ├── page.tsx
│   │   ├── posts/
│   │   │   ├── page.tsx
│   │   │   └── new/page.tsx
│   │   ├── schedule/page.tsx
│   │   ├── media/page.tsx
│   │   ├── ai/page.tsx
│   │   ├── trending/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── automation/page.tsx
│   │   ├── accounts/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   └── ...
│   ├── layout.tsx
│   └── page.tsx
├── components/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── service.ts
│   ├── db/
│   │   ├── repositories/
│   │   └── types.ts
│   ├── crypto/
│   │   └── index.ts
│   ├── platforms/
│   │   ├── instagram/
│   │   └── tiktok/
│   ├── queue/
│   │   ├── claim.ts
│   │   ├── processor.ts
│   │   ├── retry.ts
│   │   └── recovery.ts
│   ├── validators/
│   │   ├── common.ts
│   │   ├── instagram.ts
│   │   └── tiktok.ts
│   ├── ai/
│   │   ├── provider.ts
│   │   ├── openai.ts
│   │   └── google.ts
│   ├── notifications/
│   └── utils/
├── worker/
│   └── index.ts
├── supabase/
│   ├── migrations/
│   │   ├── 0001_initial_schema.sql
│   │   ├── 0002_indexes_rls.sql
│   │   └── 0003_queue_functions.sql
│   └── seed.sql
├── public/
├── docs/
├── .env.local
├── AGENTS.md
├── package.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

---

## 15. Shared Code Rules

### Pure modules

Module berikut tidak boleh bergantung pada Next.js:

- `lib/crypto`
- `lib/platforms`
- `lib/queue`
- `lib/validators`
- `lib/ai`
- `lib/db` repository logic

### Framework-bound modules

Boleh memakai Next.js:

- `app/**`
- `lib/supabase/server.ts`
- UI components yang memang membutuhkan Next.js APIs

Worker hanya import pure modules + service client.

---

## 16. Security Model

### Encryption

Gunakan AES-256-GCM dengan format ciphertext versioned, misalnya:

```text
v1:<iv>:<auth_tag>:<ciphertext>
```

Encryption key:

```text
APP_ENCRYPTION_KEY
```

Harus 32 bytes dan tidak boleh masuk Git.

### Key rotation

Implement `version` pada ciphertext agar key rotation dapat dilakukan di masa depan.

### API key

Generate random high-entropy key.

Simpan:

- prefix;
- hash;
- metadata.

Tampilkan raw key hanya satu kali.

### Logs

Tidak boleh log:

- Authorization header;
- OAuth code;
- access token;
- refresh token;
- AI key;
- API key;
- webhook secret.

---

## 17. Environment Variables

Contoh:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=

APP_ENCRYPTION_KEY=

INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=
INSTAGRAM_REDIRECT_URI=

TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_REDIRECT_URI=

MEDIA_BUCKET=media

RESEND_API_KEY=
EMAIL_FROM=

OPENAI_MODEL_TEXT=
OPENAI_MODEL_IMAGE=
GOOGLE_MODEL_TEXT=
GOOGLE_MODEL_VIDEO=
```

Semua platform/AI model ID harus configurable.

### Environment separation

- Browser hanya menerima variable `NEXT_PUBLIC_*`.
- Web Service memiliki service-only secrets yang diperlukan.
- Worker memiliki service-only secrets yang diperlukan.
- `.env.local` tidak boleh di-commit.

---

## 18. Deployment

### Render Web Service

Start command:

```bash
npm run build && npm run start
```

### Render Background Worker

Start command:

```bash
npm run worker
```

### Worker

Background Worker cocok untuk proses queue yang berjalan terus-menerus dan tidak menerima traffic HTTP langsung. Konfigurasi worker harus mencakup graceful shutdown dan recovery lease.

### Database

Production dan development menggunakan Supabase project.

Migration deployment:

```bash
supabase db push --linked
```

Local Supabase container bukan dependency wajib untuk developer laptop.

---

## 19. Development Workflow

1. Buat/ubah PRD bila ada perubahan scope.
2. Update Tech Spec jika arsitektur berubah.
3. Kerjakan satu task dari `3-TASKS.md`.
4. Jalankan typecheck.
5. Jalankan lint.
6. Jalankan test yang relevan.
7. Manual test UI/API bila task menyentuh flow pengguna.
8. Commit setelah task benar-benar selesai.

### Definition of Done setiap task

- Implementasi selesai.
- Tidak ada TODO kritis yang sengaja ditinggal.
- TypeScript bersih.
- Lint bersih.
- Error handling ada.
- Security boundary tidak dilanggar.
- Tidak menambahkan dependency tanpa alasan.
- Dokumentasi task diperbarui bila behavior berubah.

---

## 20. Testing Strategy

### Unit

- validators;
- crypto roundtrip;
- retry classification;
- status transition;
- API key hashing;
- webhook signature verification.

### Integration

- repository queries;
- RLS ownership;
- queue claim/recovery;
- Storage metadata lifecycle;
- OAuth callback handlers.

### End-to-end

- register/login;
- connect platform;
- upload media;
- create post;
- publish now;
- schedule;
- retry;
- cancel;
- analytics.

### Platform sandbox/test accounts

Gunakan akun developer/tester sesuai aturan platform. Jangan mengandalkan production publishing pada tahap awal.

---

## 21. Current Platform Notes

### Supabase

Supabase merekomendasikan `@supabase/ssr` untuk session berbasis cookie pada framework SSR seperti Next.js. Supabase Storage merekomendasikan resumable upload untuk file besar, terutama di atas ukuran kecil biasa, dan menyediakan signed upload URL.

### TikTok

API Content Posting saat ini mewajibkan creator information untuk direct-post UX, menyediakan privacy options dari response creator, dan memberikan batas request per endpoint. Client yang belum diaudit memiliki restriction private viewing. Detail tersebut harus diverifikasi lagi saat T-00/T-09 sebelum production.

### Instagram

OAuth scope, token lifetime, API version, publishing workflow, quota, dan app review harus diverifikasi terhadap dokumentasi Meta yang aktif ketika integration dikerjakan. Jangan menyebarkan angka quota/version lama ke seluruh codebase.

---

## 22. Acceptance Architecture Checklist

- [ ] Tidak ada ORM.
- [ ] Tidak ada custom auth layer selain Supabase Auth.
- [ ] Tidak ada platform token plaintext.
- [ ] RLS aktif.
- [ ] Worker terpisah dari web.
- [ ] Publish eksternal hanya dari worker.
- [ ] Queue claim atomic.
- [ ] Stale job recovery tersedia.
- [ ] Retry hanya untuk transient error.
- [ ] Idempotency protection ada.
- [ ] Large upload direct/resumable.
- [ ] Platform rules configurable/dynamic.
- [ ] Worker dapat berjalan tanpa import `next/*`.
- [ ] Service-role key hanya server/worker.
