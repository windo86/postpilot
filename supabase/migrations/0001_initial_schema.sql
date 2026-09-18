-- PostPilot 0001 — initial schema (15 tabel aplikasi).
-- Sumber: 2-TECH-SPEC.md §5. Dijalankan via `supabase db push --linked` (T-02).
-- RLS + index + queue RPC menyusul di 0002 / 0003.

create extension if not exists "pgcrypto";

-- 5.1 profiles: profile & preference, 1:1 dengan auth.users.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text,
  email_notifications_enabled boolean not null default true,
  in_app_notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5.2 connected_accounts: koneksi Instagram/TikTok (OAuth platform, BUKAN login app).
create table public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('instagram', 'tiktok')),
  platform_account_id text not null,
  username text,
  display_name text,
  avatar_url text,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'expired', 'reauth_required', 'disconnected')),
  scopes text[],
  metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform, platform_account_id)
);

-- 5.3 media_assets: metadata Media Library. Referensi kanonis = bucket + path.
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  original_name text,
  media_type text check (media_type in ('image', 'video')),
  mime_type text,
  file_size bigint,
  width integer,
  height integer,
  duration_seconds numeric,
  tags text[] not null default '{}',
  source text not null default 'upload' check (source in ('upload', 'ai')),
  status text not null default 'uploading'
    check (status in ('uploading', 'processing', 'ready', 'failed', 'deleted')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

-- 5.4 posts: parent object satu content item.
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'processing', 'published', 'partial_failed', 'failed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5.5 post_platforms: target platform independen (lifecycle per platform).
create table public.post_platforms (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  connected_account_id uuid not null references public.connected_accounts (id) on delete restrict,
  platform text not null check (platform in ('instagram', 'tiktok')),
  caption text,
  hashtags text[],
  status text not null default 'draft'
    check (status in ('draft', 'queued', 'processing', 'published', 'failed', 'cancelled')),
  scheduled_at timestamptz,
  published_at timestamptz,
  platform_post_id text,
  platform_publish_id text,
  failure_code text,
  failure_message text,
  commercial_disclosure boolean not null default false,
  privacy_level text,
  platform_metadata jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connected_account_id, idempotency_key)
);

-- 5.6 post_media: relasi many-to-many post ↔ media (carousel).
create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  media_asset_id uuid not null references public.media_assets (id) on delete restrict,
  position integer not null,
  unique (post_id, position)
);

-- 5.7 schedule_queue: operational queue per target platform.
create table public.schedule_queue (
  id uuid primary key default gen_random_uuid(),
  post_platform_id uuid not null unique references public.post_platforms (id) on delete cascade,
  scheduled_at timestamptz not null,
  next_attempt_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'succeeded', 'failed', 'cancelled')),
  attempt_count integer not null default 0,
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5.8 publish_attempts: log teknis tiap operasi external API (response disanitasi!).
create table public.publish_attempts (
  id uuid primary key default gen_random_uuid(),
  schedule_queue_id uuid references public.schedule_queue (id) on delete cascade,
  attempt_number integer,
  operation text,
  attempted_at timestamptz not null default now(),
  result text,
  http_status integer,
  error_code text,
  error_message text,
  response_json jsonb,
  duration_ms integer,
  request_id text
);

-- 5.9 post_metrics: snapshot analytics per target platform.
create table public.post_metrics (
  id uuid primary key default gen_random_uuid(),
  post_platform_id uuid not null references public.post_platforms (id) on delete cascade,
  likes bigint,
  comments bigint,
  shares bigint,
  saves bigint,
  views bigint,
  reach bigint,
  impressions bigint,
  extra_metrics jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now()
);

-- 5.10 trending_topics: input manual trending.
create table public.trending_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  keyword text not null,
  source text,
  source_url text,
  captured_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- 5.11 brand_styles: style guide AI/content creation.
create table public.brand_styles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  style_guide jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5.12 ai_api_keys: BYOK. Raw key TIDAK PERNAH disimpan.
create table public.ai_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  label text,
  key_ciphertext text not null,
  key_last4 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5.13 webhooks: konfigurasi incoming webhook.
create table public.webhooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  event_type text not null,
  endpoint_token_hash text not null,
  signing_secret_ciphertext text not null,
  active boolean not null default true,
  last_received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5.14 api_keys: auth key REST API. Raw key hanya tampil sekali saat creation.
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- 5.15 notifications: in-app notification.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  channel text not null default 'in_app' check (channel in ('in_app', 'email')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
