-- PostPilot 0003 — atomic queue claim + stale-job recovery (RPC).
-- Sumber: 2-TECH-SPEC.md §4, §7. Dijalankan setelah 0002.
--
-- Hanya worker (service-role) yang boleh mengeksekusi function ini:
-- execute di-revoke dari anon/authenticated agar web browser tidak bisa
-- claim job milik user lain. Worker memanggil via service client.

-- ---- claim_due_jobs ----
-- Mengambil maksimal p_limit job pending yang sudah due secara atomik:
-- SELECT ... FOR UPDATE SKIP LOCKED + UPDATE ke processing + lock dalam
-- SATU transaksi, sehingga dua worker tidak bisa double-claim.
-- attempt_count di-increment saat claim (1 claim = 1 attempt).
create or replace function public.claim_due_jobs(
  p_worker_id text,
  p_limit integer default 5
)
returns setof public.schedule_queue
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_worker_id is null or p_worker_id = '' then
    raise exception 'p_worker_id is required';
  end if;

  return query
  with due as (
    select sq.id
    from public.schedule_queue sq
    where sq.status = 'pending'
      and sq.next_attempt_at <= now()
    order by sq.next_attempt_at asc
    limit greatest(p_limit, 1)
    for update skip locked
  )
  update public.schedule_queue sq
  set
    status = 'processing',
    locked_at = now(),
    locked_by = p_worker_id,
    attempt_count = sq.attempt_count + 1,
    updated_at = now()
  from due
  where sq.id = due.id
  returning sq.*;
end;
$$;

-- ---- recover_stale_jobs ----
-- Mengembalikan job `processing` yang lock-nya kedaluwarsa (worker mati
-- di tengah jalan) ke `pending` bila masih retryable, atau `failed` bila
-- batas attempt tercapai. Mengembalikan jumlah job yang di-recover.
create or replace function public.recover_stale_jobs(
  p_lease_seconds integer default 300,
  p_max_attempts integer default 3
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recovered integer := 0;
begin
  with stale as (
    select sq.id
    from public.schedule_queue sq
    where sq.status = 'processing'
      and sq.locked_at is not null
      and sq.locked_at < now() - make_interval(secs => greatest(p_lease_seconds, 1))
    for update skip locked
  ),
  reset as (
    update public.schedule_queue sq
    set
      status = case
        when sq.attempt_count >= greatest(p_max_attempts, 1) then 'failed'::text
        else 'pending'::text
      end,
      locked_at = null,
      locked_by = null,
      last_error = coalesce(
        sq.last_error,
        'stale lock recovered by recover_stale_jobs'
      ),
      updated_at = now()
    from stale
    where sq.id = stale.id
    returning sq.id
  )
  select count(*) into v_recovered from reset;

  return v_recovered;
end;
$$;

-- Hanya service-role (worker) yang boleh execute.
revoke all on function public.claim_due_jobs(text, integer) from public, anon, authenticated;
revoke all on function public.recover_stale_jobs(integer, integer) from public, anon, authenticated;
grant execute on function public.claim_due_jobs(text, integer) to service_role;
grant execute on function public.recover_stale_jobs(integer, integer) to service_role;
