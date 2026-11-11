-- =============================================================================
-- Yalhacar — Supabase schema v5 (additive)
-- =============================================================================
--
-- Run this in the Supabase Dashboard → SQL Editor AFTER schema.sql, seed.sql,
-- schema_v2.sql, schema_v3.sql and schema_v4.sql have already been applied.
--
-- Adds a single-row `site_settings` table for the handful of values editable
-- from the admin panel without a redeploy — starting with the header/footer
-- contact phone number. Public (anon) can read it since it's rendered on
-- every public page; only a signed-in admin can change it.
-- =============================================================================

create table if not exists public.site_settings (
  id text primary key default 'default',
  phone text not null default '+966 577068091',
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, phone)
values ('default', '+966 577068091')
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

create policy "Public can read site settings" on public.site_settings
  for select to anon, authenticated using (true);

create policy "Authenticated can update site settings" on public.site_settings
  for update to authenticated using (true) with check (true);
