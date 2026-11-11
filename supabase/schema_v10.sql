-- =============================================================================
-- Yalhacar — Supabase schema v10 (additive)
-- =============================================================================
--
-- Run this in the Supabase Dashboard → SQL Editor AFTER schema.sql, seed.sql,
-- schema_v2.sql through schema_v9.sql have already been applied.
--
-- Adds `hero_slides` — the homepage hero's static/promotional slides (image +
-- bilingual eyebrow/title/subtitle), managed from /admin/content. Separate
-- from the hero's other slides, which are generated live from featured cars
-- and need no admin table of their own (edit the car in Inventory instead).
-- Same RLS shape as every other admin-managed table here: public can read
-- active rows, nothing else — writes go through the service-role client.
-- =============================================================================

create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  eyebrow_en text not null default '',
  eyebrow_ar text not null default '',
  title_en text not null default '',
  title_ar text not null default '',
  subtitle_en text not null default '',
  subtitle_ar text not null default '',
  image_url text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.hero_slides enable row level security;

create policy "Public can read active hero slides" on public.hero_slides
  for select to anon, authenticated using (is_active = true);
