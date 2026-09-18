-- PostPilot 0006 — idempotency keys untuk Automation API (T-17).
-- POST /api/v1/posts dengan header Idempotency-Key yang sama tidak
-- membuat post kedua. Hash di-scope per user.

create table public.api_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  key_hash text not null unique,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index api_idempotency_user_idx on public.api_idempotency_keys (user_id);

alter table public.api_idempotency_keys enable row level security;

create policy api_idempotency_keys_owner on public.api_idempotency_keys
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
