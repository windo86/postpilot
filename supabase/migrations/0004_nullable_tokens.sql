-- PostPilot 0004 — connected_accounts: token nullable untuk disconnect aman.
-- Alasan: post_platforms references connected_accounts ON DELETE RESTRICT,
-- sehingga disconnect tidak bisa hard-delete bila akun sudah dipakai post.
-- Disconnect = revoke di provider (best-effort) + NULL-kan token + status
-- 'disconnected'. Reconnect mengisi token kembali via upsert.

alter table public.connected_accounts
  alter column access_token_encrypted drop not null;
