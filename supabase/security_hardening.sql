-- =============================================================================
-- Security hardening - run BEFORE internal testing. Safe to re-run.
--
-- Problem: the website's database trusted "any signed-in user = admin"
-- (policies named "Authenticated can ..."). The mobile app lets anyone sign
-- up on the same project, so any app user could read/modify every lead and
-- reservation (customer names, phones, emails), edit site settings and change
-- car images straight through the API, without ever opening /admin.
--
-- Fix: only users whose Supabase `app_metadata.role` is 'admin' count as
-- admins. `app_metadata` can only be written with the service role / from the
-- dashboard - a user cannot set it on themselves.
--
-- STEP 1 (once, before running this file) - make your admin account an admin.
-- Create the user first in Dashboard -> Authentication -> Users -> Add user
-- (email + password, "auto confirm"), then run:
--
--   update auth.users
--     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'
--     where email = 'YOUR_ADMIN_EMAIL';
--
-- STEP 2: run this whole file in Dashboard -> SQL Editor.
-- =============================================================================

-- Refuse to continue if nobody is an admin yet (would lock everyone out).
do $$
begin
  if not exists (select 1 from auth.users where raw_app_meta_data ->> 'role' = 'admin') then
    raise exception 'No admin user exists yet. Run STEP 1 at the top of this file first.';
  end if;
end $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------- cars
drop policy if exists "Authenticated can insert cars" on public.cars;
drop policy if exists "Authenticated can update cars" on public.cars;
drop policy if exists "Authenticated can delete cars" on public.cars;
drop policy if exists "Admins manage cars" on public.cars;
create policy "Admins manage cars" on public.cars
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- leads
drop policy if exists "Authenticated can read leads" on public.leads;
drop policy if exists "Authenticated can update leads" on public.leads;
drop policy if exists "Admins read leads" on public.leads;
drop policy if exists "Admins update leads" on public.leads;
create policy "Admins read leads" on public.leads
  for select to authenticated using (public.is_admin());
create policy "Admins update leads" on public.leads
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- reservations
drop policy if exists "Authenticated can read reservations" on public.reservations;
drop policy if exists "Authenticated can update reservations" on public.reservations;
drop policy if exists "Admins read reservations" on public.reservations;
drop policy if exists "Admins update reservations" on public.reservations;
create policy "Admins read reservations" on public.reservations
  for select to authenticated using (public.is_admin());
create policy "Admins update reservations" on public.reservations
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- site settings
drop policy if exists "Authenticated can update site settings" on public.site_settings;
drop policy if exists "Admins update site settings" on public.site_settings;
create policy "Admins update site settings" on public.site_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- car image storage
drop policy if exists "Authenticated can upload car images" on storage.objects;
drop policy if exists "Authenticated can update car images" on storage.objects;
drop policy if exists "Authenticated can delete car images" on storage.objects;
drop policy if exists "Admins upload car images" on storage.objects;
drop policy if exists "Admins update car images" on storage.objects;
drop policy if exists "Admins delete car images" on storage.objects;
create policy "Admins upload car images" on storage.objects
  for insert to authenticated with check (bucket_id = 'car-images' and public.is_admin());
create policy "Admins update car images" on storage.objects
  for update to authenticated using (bucket_id = 'car-images' and public.is_admin());
create policy "Admins delete car images" on storage.objects
  for delete to authenticated using (bucket_id = 'car-images' and public.is_admin());

-- ---------------------------------------------------------------- app orders
-- Orders are written only by the verify-moyasar-payment edge function (service
-- role) after it has checked the payment against the car's real price. Users
-- may read their own orders but never insert/update them from the phone.
alter table public.orders add column if not exists payment_ref text;
create unique index if not exists orders_payment_ref_key on public.orders (payment_ref) where payment_ref is not null;

drop policy if exists "Users manage their own orders" on public.orders;
drop policy if exists "Users read their own orders" on public.orders;
create policy "Users read their own orders" on public.orders
  for select to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------- finance applications
-- Users may submit and read their own applications but not edit them (so they
-- can't flip their own status to "approved").
drop policy if exists "Users manage their own finance applications" on public.finance_applications;
drop policy if exists "Users submit their own finance applications" on public.finance_applications;
drop policy if exists "Users read their own finance applications" on public.finance_applications;
create policy "Users submit their own finance applications" on public.finance_applications
  for insert to authenticated with check (auth.uid() = user_id and status = 'under_review');
create policy "Users read their own finance applications" on public.finance_applications
  for select to authenticated using (auth.uid() = user_id);
