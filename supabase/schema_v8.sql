-- =============================================================================
-- Yalhacar — Supabase schema v8 (additive)
-- =============================================================================
--
-- Run this in the Supabase Dashboard → SQL Editor AFTER schema.sql, seed.sql,
-- schema_v2.sql through schema_v7.sql have already been applied.
--
-- Adds `brands` (text + image, managed from /admin/content), the last of the
-- tables requested for admin editing. `finance_partners` and `body_types`
-- already existed on the live DB — no migration needed for those, just the
-- admin CRUD in this app (src/lib/admin/appContent.ts, src/lib/admin/catalog.ts).
-- Same RLS shape as every other admin-managed table here: public can read
-- active rows, nothing else — writes go through the service-role client.
-- =============================================================================

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  image_url text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.brands enable row level security;

create policy "Public can read active brands" on public.brands
  for select to anon, authenticated using (is_active = true);
