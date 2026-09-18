-- PostPilot 0005 — private bucket media + storage policies.
-- Path: {user_id}/{yyyy}/{mm}/{uuid}-{file}. Pemilik = folder pertama.
-- Browser upload langsung (signed URL / TUS) tanpa service-role key.

insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

-- Upload: user hanya ke folder miliknya.
create policy media_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Baca: hanya milik sendiri (preview via signed URL server-side).
create policy media_owner_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update (overwrite/TUS): hanya milik sendiri.
create policy media_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Hapus: hanya milik sendiri.
create policy media_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
