-- PostPilot 0002 — index + Row Level Security.
-- Sumber: 2-TECH-SPEC.md §5–§6. Dijalankan setelah 0001.

-- ============ INDEX ============

-- Dashboard: post per user + status.
create index posts_user_status_idx on public.posts (user_id, status, updated_at desc);

-- Composer/accounts: target per post & per akun.
create index post_platforms_post_idx on public.post_platforms (post_id);
create index post_platforms_account_status_idx
  on public.post_platforms (connected_account_id, status);
create index post_platforms_status_scheduled_idx
  on public.post_platforms (status, scheduled_at);

-- Queue claim: pending + due (dipakai RPC claim_due_jobs).
create index schedule_queue_claim_idx
  on public.schedule_queue (status, next_attempt_at) where status = 'pending';
create index schedule_queue_stale_idx
  on public.schedule_queue (status, locked_at) where status = 'processing';

-- Debugging attempt per queue item.
create index publish_attempts_queue_idx
  on public.publish_attempts (schedule_queue_id, attempted_at desc);

-- Analytics: snapshot terbaru per target (§5.9).
create index post_metrics_platform_fetched_idx
  on public.post_metrics (post_platform_id, fetched_at desc);

-- Media library: list + search per user.
create index media_assets_user_created_idx
  on public.media_assets (user_id, created_at desc);

-- Accounts: koneksi per user.
create index connected_accounts_user_idx on public.connected_accounts (user_id);

-- Notifications: unread per user.
create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- Trending: search per user.
create index trending_topics_user_keyword_idx
  on public.trending_topics (user_id, keyword);

-- Automation: lookup key & endpoint.
create index api_keys_hash_idx on public.api_keys (key_hash);
create index webhooks_token_hash_idx on public.webhooks (endpoint_token_hash);

-- ============ RLS ============
-- Worker memakai service-role (bypass RLS) namun tetap wajib cek
-- relasi/ownership di business logic (Tech Spec §6).

alter table public.profiles enable row level security;
alter table public.connected_accounts enable row level security;
alter table public.media_assets enable row level security;
alter table public.posts enable row level security;
alter table public.post_platforms enable row level security;
alter table public.post_media enable row level security;
alter table public.schedule_queue enable row level security;
alter table public.publish_attempts enable row level security;
alter table public.post_metrics enable row level security;
alter table public.trending_topics enable row level security;
alter table public.brand_styles enable row level security;
alter table public.ai_api_keys enable row level security;
alter table public.webhooks enable row level security;
alter table public.api_keys enable row level security;
alter table public.notifications enable row level security;

-- ---- Ownership langsung (user_id) ----
-- Pola: select/insert/update/delete hanya milik sendiri.

create policy profiles_owner on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy connected_accounts_owner on public.connected_accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy media_assets_owner on public.media_assets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy posts_owner on public.posts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy trending_topics_owner on public.trending_topics
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy brand_styles_owner on public.brand_styles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy ai_api_keys_owner on public.ai_api_keys
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy webhooks_owner on public.webhooks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy api_keys_owner on public.api_keys
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_owner on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- Ownership via relasi ----
-- post_platforms: pemilik post induk.
create policy post_platforms_owner on public.post_platforms
  for all
  using (exists (
    select 1 from public.posts p
    where p.id = post_platforms.post_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.posts p
    where p.id = post_platforms.post_id and p.user_id = auth.uid()
  ));

-- post_media: pemilik post induk.
create policy post_media_owner on public.post_media
  for all
  using (exists (
    select 1 from public.posts p
    where p.id = post_media.post_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.posts p
    where p.id = post_media.post_id and p.user_id = auth.uid()
  ));

-- schedule_queue: pemilik post via post_platforms.
create policy schedule_queue_owner on public.schedule_queue
  for all
  using (exists (
    select 1 from public.post_platforms pp
    join public.posts p on p.id = pp.post_id
    where pp.id = schedule_queue.post_platform_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.post_platforms pp
    join public.posts p on p.id = pp.post_id
    where pp.id = schedule_queue.post_platform_id and p.user_id = auth.uid()
  ));

-- publish_attempts: pemilik queue item.
create policy publish_attempts_owner on public.publish_attempts
  for all
  using (exists (
    select 1 from public.schedule_queue sq
    join public.post_platforms pp on pp.id = sq.post_platform_id
    join public.posts p on p.id = pp.post_id
    where sq.id = publish_attempts.schedule_queue_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.schedule_queue sq
    join public.post_platforms pp on pp.id = sq.post_platform_id
    join public.posts p on p.id = pp.post_id
    where sq.id = publish_attempts.schedule_queue_id and p.user_id = auth.uid()
  ));

-- post_metrics: pemilik target platform.
create policy post_metrics_owner on public.post_metrics
  for all
  using (exists (
    select 1 from public.post_platforms pp
    join public.posts p on p.id = pp.post_id
    where pp.id = post_metrics.post_platform_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.post_platforms pp
    join public.posts p on p.id = pp.post_id
    where pp.id = post_metrics.post_platform_id and p.user_id = auth.uid()
  ));
