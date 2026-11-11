-- =============================================================================
-- Axelmann Auto — Supabase schema
-- =============================================================================
--
-- Setup, once per Supabase project:
--
--   1. Open the Supabase Dashboard → SQL Editor and run THIS file (schema.sql).
--   2. Then run `supabase/seed.sql` in the same SQL Editor to load the 5 demo
--      cars. Skip it if you would rather start with an empty inventory.
--   3. Create the admin account by hand: Dashboard → Authentication → Users →
--      "Add user" → enter an email + password (and tick "Auto Confirm User").
--      This app deliberately ships NO public sign-up UI — the only way in is
--      /admin/login with a user an operator created in the dashboard.
--   4. Copy the project URL and the anon (public) key from Dashboard →
--      Project Settings → API into your local `.env`:
--        VITE_SUPABASE_URL=...
--        VITE_SUPABASE_ANON_KEY=...
--      Only the anon key is ever used — client and server alike. Writes are
--      gated by RLS + an authenticated session, so no service-role key is
--      needed (or wanted) anywhere in this codebase.
--
-- NOTE ON COLUMN NAMING: the columns are intentionally camelCase and therefore
-- double-quoted everywhere. That is unusual for Postgres (which would normally
-- fold them to lowercase) but it lets rows deserialize straight into the
-- TypeScript `Car` type in src/data/cars.ts with zero mapping layer. The
-- tradeoff: every hand-written SQL statement must quote these identifiers.
-- =============================================================================

create table if not exists public.cars (
  id text primary key,
  "stock" text not null,
  "title" text not null,
  "make" text not null,
  "model" text not null,
  "trim" text not null,
  "year" integer not null,
  "condition" text not null check ("condition" in ('New','Used','Certified')),
  "mileageKm" integer not null,
  "city" text not null,
  "seats" integer not null,
  "fuel" text not null,
  "bodyType" text not null,
  "exteriorColor" text not null,
  "interiorColor" text not null,
  "option" text not null,
  "carOrigin" text not null,
  "price" integer not null,
  "wasPrice" integer,
  "monthly" integer not null,
  "sellerType" text not null check ("sellerType" in ('Platform Certified','Authorized Dealer','Independent Dealer','Private Seller')),
  "badges" text[] not null default '{}',
  "image" text not null,
  "gallery" text[] not null default '{}',
  "inspectionScore" integer not null,
  "inspectedOn" text not null,
  "inspectionCenter" text not null,
  "specs" jsonb not null default '[]',
  "highlights" text[] not null default '{}',
  "tags" text[] not null default '{}',
  "createdAt" timestamptz not null default now()
);

alter table public.cars enable row level security;

-- Anonymous visitors may read the whole inventory; only a signed-in admin
-- (created via the dashboard, step 3 above) may write.
create policy "Public can read cars" on public.cars
  for select to anon, authenticated using (true);

create policy "Authenticated can insert cars" on public.cars
  for insert to authenticated with check (true);

create policy "Authenticated can update cars" on public.cars
  for update to authenticated using (true) with check (true);

create policy "Authenticated can delete cars" on public.cars
  for delete to authenticated using (true);

-- =============================================================================
-- Storage: car photo uploads (admin panel)
-- =============================================================================
-- Public bucket — car photos are shown on public listing pages, so anonymous
-- reads are fine. Only an authenticated admin session may upload/replace/delete
-- objects, same trust model as the `cars` table above.

insert into storage.buckets (id, name, public)
values ('car-images', 'car-images', true)
on conflict (id) do nothing;

create policy "Public can read car images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'car-images');

create policy "Authenticated can upload car images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'car-images');

create policy "Authenticated can update car images"
on storage.objects for update
to authenticated
using (bucket_id = 'car-images')
with check (bucket_id = 'car-images');

create policy "Authenticated can delete car images"
on storage.objects for delete
to authenticated
using (bucket_id = 'car-images');
