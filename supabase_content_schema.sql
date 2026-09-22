-- ==============================================================================
-- SKEMA PEMISAHAN TABEL: slides, announcements, running_texts
-- Jalankan perintah SQL ini di menu "SQL Editor" pada dashboard project Supabase Anda.
-- Tabel "displays" TIDAK dihapus/diubah strukturnya — hanya ditambah 3 tabel anak
-- (dengan FK ke displays.id) + trigger yang menyentuh displays.updated_at.
-- ==============================================================================

-- 1. Tabel slides
create table if not exists public.slides (
  id text primary key,
  display_id text not null references public.displays(id) on delete cascade,
  title text not null default '',
  description text not null default '',
  arabic_text text,
  image_url text not null default '',
  duration_seconds integer not null default 8,
  is_active boolean not null default true,
  order_index integer not null default 0,
  category text not null default 'custom',
  badge_text text,
  title_font_size text,
  description_font_size text,
  arabic_font_size text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists idx_slides_display_id on public.slides (display_id);

-- 2. Tabel announcements
create table if not exists public.announcements (
  id text primary key,
  display_id text not null references public.displays(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  arabic_text text,
  date text,
  time text,
  speaker text,
  category text not null default 'kajian',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists idx_announcements_display_id on public.announcements (display_id);

-- 3. Tabel running_texts
create table if not exists public.running_texts (
  id text primary key,
  display_id text not null references public.displays(id) on delete cascade,
  text text not null default '',
  is_active boolean not null default true,
  order_index integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists idx_running_texts_display_id on public.running_texts (display_id);

-- 4. RLS — kebijakan terbuka, konsisten dengan tabel "displays" yang sudah ada
alter table public.slides enable row level security;
alter table public.announcements enable row level security;
alter table public.running_texts enable row level security;

drop policy if exists "Public slides read" on public.slides;
create policy "Public slides read" on public.slides for select using (true);
drop policy if exists "Public slides insert" on public.slides;
create policy "Public slides insert" on public.slides for insert with check (true);
drop policy if exists "Public slides update" on public.slides;
create policy "Public slides update" on public.slides for update using (true);
drop policy if exists "Public slides delete" on public.slides;
create policy "Public slides delete" on public.slides for delete using (true);

drop policy if exists "Public announcements read" on public.announcements;
create policy "Public announcements read" on public.announcements for select using (true);
drop policy if exists "Public announcements insert" on public.announcements;
create policy "Public announcements insert" on public.announcements for insert with check (true);
drop policy if exists "Public announcements update" on public.announcements;
create policy "Public announcements update" on public.announcements for update using (true);
drop policy if exists "Public announcements delete" on public.announcements;
create policy "Public announcements delete" on public.announcements for delete using (true);

drop policy if exists "Public running_texts read" on public.running_texts;
create policy "Public running_texts read" on public.running_texts for select using (true);
drop policy if exists "Public running_texts insert" on public.running_texts;
create policy "Public running_texts insert" on public.running_texts for insert with check (true);
drop policy if exists "Public running_texts update" on public.running_texts;
create policy "Public running_texts update" on public.running_texts for update using (true);
drop policy if exists "Public running_texts delete" on public.running_texts;
create policy "Public running_texts delete" on public.running_texts for delete using (true);

-- 5. Trigger: sentuh displays.updated_at saat tabel anak berubah.
--    Diperlukan karena differential sync (syncManager/api.ts) dan realtime
--    subscription di aplikasi hanya memantau displays.updated_at & tabel
--    "displays" saja — tanpa trigger ini, perubahan slide/pengumuman/running-text
--    tidak akan terdeteksi oleh TV display.
create or replace function public.touch_display_updated_at()
returns trigger
language plpgsql
as $$
begin
  update public.displays
  set updated_at = timezone('utc', now())
  where id = coalesce(new.display_id, old.display_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_slides_touch_display on public.slides;
create trigger trg_slides_touch_display
  after insert or update or delete on public.slides
  for each row execute function public.touch_display_updated_at();

drop trigger if exists trg_announcements_touch_display on public.announcements;
create trigger trg_announcements_touch_display
  after insert or update or delete on public.announcements
  for each row execute function public.touch_display_updated_at();

drop trigger if exists trg_running_texts_touch_display on public.running_texts;
create trigger trg_running_texts_touch_display
  after insert or update or delete on public.running_texts
  for each row execute function public.touch_display_updated_at();
