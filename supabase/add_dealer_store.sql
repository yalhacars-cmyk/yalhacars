-- =============================================================================
-- Yalhacar — add_dealer_store.sql (additive)
-- =============================================================================
--
-- Run this AFTER supabase/add_dealer_account_type.sql. Companion to the
-- mobile app's own dealer-store work. Live-DB check before writing this:
-- `cars.dealer_store_name` / `cars.dealer_store_logo_url` and the
-- `dealer-store-logos` bucket + its per-user-folder policy already exist
-- (applied directly, not through this repo) — this file only adds what's
-- still missing: the two `profiles` columns and the self-verification
-- trigger. Every statement is written to be safe to (re-)run regardless.
--
-- A dealer's Store Name + Store Logo are entered once on their profile
-- (`profiles.store_name` / `store_logo_url`) and, once `dealer_verified`,
-- get copied onto every new listing they submit (`cars.dealer_store_name` /
-- `dealer_store_logo_url`) — a deliberate snapshot, not a live join, so a
-- listing keeps the store branding it was submitted under even if the
-- dealer later renames their store.
-- =============================================================================

alter table public.profiles
  add column if not exists store_name text,
  add column if not exists store_logo_url text;

alter table public.cars
  add column if not exists dealer_store_name text,
  add column if not exists dealer_store_logo_url text;

insert into storage.buckets (id, name, public)
values ('dealer-store-logos', 'dealer-store-logos', true)
on conflict (id) do nothing;

drop policy if exists "Public can read dealer store logos" on storage.objects;
create policy "Public can read dealer store logos"
  on storage.objects for select
  using (bucket_id = 'dealer-store-logos');

drop policy if exists "Users manage their own store logo" on storage.objects;
create policy "Users manage their own store logo"
  on storage.objects for all
  using (bucket_id = 'dealer-store-logos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'dealer-store-logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- A dealer's own profile save (RLS: "Users manage their own profile",
-- auth.uid() = user_id — see add_dealer_account_type.sql) is otherwise free
-- to write any column on their own row, `dealer_verified` included, since
-- RLS only checks *which row*, never *which column*. Neither app's client
-- code ever sends that field, but nothing stops a user from calling the
-- REST API directly and self-verifying. This trigger closes that at the
-- database level, for both clients at once: any UPDATE that changes
-- dealer_verified is silently reverted unless the writer is the
-- service-role connection this admin panel's getSupabaseAdminClient() uses.
-- ---------------------------------------------------------------------------

create or replace function public.prevent_self_dealer_verification()
returns trigger
language plpgsql
security definer set search_path = public as $$
begin
  if new.dealer_verified is distinct from old.dealer_verified and auth.role() <> 'service_role' then
    new.dealer_verified := old.dealer_verified;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_self_dealer_verification on public.profiles;
create trigger trg_prevent_self_dealer_verification
  before update on public.profiles
  for each row execute function public.prevent_self_dealer_verification();
