-- =============================================================================
-- Yalhacar — Supabase schema v6 (additive)
-- =============================================================================
--
-- Run this in the Supabase Dashboard → SQL Editor AFTER schema.sql, seed.sql,
-- schema_v2.sql, schema_v3.sql, schema_v4.sql and schema_v5.sql have already
-- been applied.
--
-- Adds the site's two brand colors to `site_settings`, editable from
-- /admin/settings. These map to the `--color-brass` / `--color-brass-2` CSS
-- variables (@theme in src/styles.css), which stay constant across the
-- light/dark theme (unlike surface colors such as background/panel, which
-- flip per theme and are intentionally NOT exposed here — changing them from
-- admin could break contrast in one theme without the admin seeing it).
-- =============================================================================

alter table public.site_settings
  add column if not exists brand_color text not null default '#f4511d'
    check (brand_color ~* '^#[0-9a-f]{3,8}$'),
  add column if not exists brand_color_2 text not null default '#f68a5c'
    check (brand_color_2 ~* '^#[0-9a-f]{3,8}$');
