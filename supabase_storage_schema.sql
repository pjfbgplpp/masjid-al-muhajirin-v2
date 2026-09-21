-- ==============================================================================
-- SKEMA STORAGE SUPABASE UNTUK MEDIA DISPLAY (LOGO & SLIDE)
-- Jalankan perintah SQL ini di menu "SQL Editor" pada dashboard project Supabase Anda.
-- Tabel "displays" TIDAK disentuh oleh skrip ini — hanya menambah bucket + kebijakan baru.
-- ==============================================================================

-- 1. Buat bucket public untuk media display (logo & poster slide)
insert into storage.buckets (id, name, public)
values ('display-media', 'display-media', true)
on conflict (id) do nothing;

-- 2. Kebijakan akses — terbuka untuk anon, konsisten dengan kebijakan tabel "displays"
--    (baca: siapa saja; tulis: siapa saja yang pegang anon key, sama seperti pola CRUD "displays")
drop policy if exists "Public read display-media" on storage.objects;
create policy "Public read display-media"
  on storage.objects for select
  using (bucket_id = 'display-media');

drop policy if exists "Public upload display-media" on storage.objects;
create policy "Public upload display-media"
  on storage.objects for insert
  with check (bucket_id = 'display-media');

drop policy if exists "Public update display-media" on storage.objects;
create policy "Public update display-media"
  on storage.objects for update
  using (bucket_id = 'display-media');

drop policy if exists "Public delete display-media" on storage.objects;
create policy "Public delete display-media"
  on storage.objects for delete
  using (bucket_id = 'display-media');
