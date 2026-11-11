-- =============================================================================
-- Yalhacar — add_dealer_account_type.sql (additive)
-- =============================================================================
--
-- Run this in the Supabase Dashboard → SQL Editor AFTER schema.sql through
-- schema_v9.sql have already been applied. Companion to the mobile app's own
-- dealer-account-type change (same migration name/shape, applied there
-- first) — adds the 5 dealer columns to `profiles` and the private
-- `dealer-documents` storage bucket this admin panel and the app both read
-- from. `dealer_verified` is deliberately never written by either app's own
-- code — only this admin panel (requireAdmin()-gated, service-role client)
-- ever sets it, same pattern as `cars.status`.
-- =============================================================================

alter table public.profiles
  add column if not exists account_type text not null default 'individual'
    check (account_type in ('individual', 'dealer')),
  add column if not exists business_name text,
  add column if not exists cr_number text,
  add column if not exists cr_document_path text,
  add column if not exists dealer_verified boolean not null default false;

-- ---------------------------------------------------------------------------
-- storage: dealer-documents bucket — private, same per-user-folder RLS shape
-- as the existing national-id-documents bucket (a user can only read/write
-- under their own `<user_id>/...` path; admin reads go through the
-- service-role client, which bypasses RLS entirely).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('dealer-documents', 'dealer-documents', false)
on conflict (id) do nothing;

create policy "Users manage their own dealer documents"
  on storage.objects for all
  using (bucket_id = 'dealer-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'dealer-documents' and (storage.foldername(name))[1] = auth.uid()::text);
