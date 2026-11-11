-- =============================================================================
-- Yalhacar — Supabase schema v7 (additive)
-- =============================================================================
--
-- Run this in the Supabase Dashboard → SQL Editor AFTER schema.sql, seed.sql,
-- schema_v2.sql through schema_v6.sql have already been applied.
--
-- Adds `finance_flyers` (promotional text + image, managed from
-- /admin/content) and a storage bucket for its images and for the
-- already-existing `onboarding_slides` / `splash_wallpapers` tables, neither
-- of which had a bucket yet. Same RLS shape as those two tables: public can
-- read active rows, nothing else — admin reads/writes go through the
-- service-role client (see getSupabaseAdminClient's doc comment), same as
-- every other admin-managed table in this shared project.
-- =============================================================================

create table if not exists public.finance_flyers (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  image_url text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.finance_flyers enable row level security;

create policy "Public can read active finance flyers" on public.finance_flyers
  for select to anon, authenticated using (is_active = true);

-- ---------------------------------------------------------------------------
-- storage: app-content bucket, for onboarding_slides / splash_wallpapers /
-- finance_flyers images. Public so the mobile app (and this admin panel) can
-- read images by URL directly; writes only ever go through the service-role
-- client, so no insert/update/delete policy is needed here.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('app-content', 'app-content', true)
on conflict (id) do nothing;

create policy "Public can read app content images"
  on storage.objects for select
  using (bucket_id = 'app-content');
