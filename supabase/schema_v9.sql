-- =============================================================================
-- Yalhacar — Supabase schema v9 (additive)
-- =============================================================================
--
-- Run this in the Supabase Dashboard → SQL Editor AFTER schema.sql, seed.sql,
-- schema_v2.sql through schema_v8.sql have already been applied.
--
-- Adds the four department contact emails to `site_settings`, editable from
-- /admin/settings alongside the phone number and brand colors. Same table,
-- same RLS already in place (public read, authenticated update) — no new
-- policies needed.
-- =============================================================================

alter table public.site_settings
  add column if not exists email_corporate text not null default 'corporate@yalhacar.com',
  add column if not exists email_info text not null default 'info@yalhacar.com',
  add column if not exists email_sales text not null default 'sales@yalhacar.com',
  add column if not exists email_support text not null default 'support@yalhacar.com';
