import { supabase } from "@/lib/supabase/browser";

export type FinancePartnerLogo = {
  id: string;
  name: string;
  logoUrl: string | null;
  logoUrlAr: string | null;
};

/**
 * Public read of `finance_partners` (admin-editable at /admin/content) — the
 * live logo strip on the site, distinct from the static, rate/term-bearing
 * `FINANCE_PARTNERS` in `@/data/financePartners` used by the /finance page
 * and checkout's Tabby/Tamara split-pay options. RLS already restricts anon
 * reads to `is_active = true`. Fetched once in the root loader (no locale
 * context there yet), so both logo URLs come back and the component picks
 * the right one via `useLocale()`.
 */
export async function getFinancePartnerLogos(): Promise<FinancePartnerLogo[]> {
  const { data, error } = await supabase
    .from("finance_partners")
    .select("id, name, logo_url, logo_url_ar")
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data
    .map((p) => ({
      id: p.id as string,
      name: p.name as string,
      logoUrl: p.logo_url as string | null,
      logoUrlAr: p.logo_url_ar as string | null,
    }))
    .filter((p) => p.logoUrl || p.logoUrlAr);
}

export type HeroSlideContent = {
  id: string;
  eyebrowEn: string;
  eyebrowAr: string;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  imageUrl: string;
};

/**
 * Public read of `hero_slides` (admin-editable at /admin/content) — the
 * homepage hero's static/promotional slides. Both locales come back so the
 * caller (index.tsx, which does have locale context) picks the right one,
 * same reasoning as getFinancePartnerLogos above.
 */
export async function getHeroSlides(): Promise<HeroSlideContent[]> {
  const { data, error } = await supabase
    .from("hero_slides")
    .select("id, eyebrow_en, eyebrow_ar, title_en, title_ar, subtitle_en, subtitle_ar, image_url")
    // created_at as a tiebreaker — see the matching comment on listHeroSlidesFn.
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((s) => ({
    id: s.id as string,
    eyebrowEn: s.eyebrow_en as string,
    eyebrowAr: s.eyebrow_ar as string,
    titleEn: s.title_en as string,
    titleAr: s.title_ar as string,
    subtitleEn: s.subtitle_en as string,
    subtitleAr: s.subtitle_ar as string,
    imageUrl: s.image_url as string,
  }));
}

export type BodyTypeOption = { id: string; value: string; imageUrl: string };

/** Public read of `body_types` (admin-editable at /admin/catalog) — the homepage's Body Type strip. */
export async function getBodyTypes(): Promise<BodyTypeOption[]> {
  const { data, error } = await supabase
    .from("body_types")
    .select("id, value, image_url")
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data.map((b) => ({
    id: b.id as string,
    value: b.value as string,
    imageUrl: b.image_url as string,
  }));
}

export type BrandLogo = { id: string; text: string; imageUrl: string };

/** Public read of `brands` (admin-editable at /admin/content) — the homepage's Brand strip. */
export async function getBrands(): Promise<BrandLogo[]> {
  const { data, error } = await supabase
    .from("brands")
    .select("id, text, image_url")
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data.map((b) => ({
    id: b.id as string,
    text: b.text as string,
    imageUrl: b.image_url as string,
  }));
}

/** Public read of `car_makes` (admin-editable at /admin/catalog) — the sell form's Make dropdown. */
export async function getCarMakes(): Promise<string[]> {
  const { data, error } = await supabase
    .from("car_makes")
    .select("name")
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data.map((m) => m.name as string);
}

/** Public read of `car_models` (admin-editable at /admin/catalog), grouped by
 * make — feeds the sell form's Model dropdown once a Make is chosen. */
export async function getCarModels(): Promise<Record<string, string[]>> {
  const { data, error } = await supabase
    .from("car_models")
    .select("make, model")
    .order("make", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error || !data) return {};
  const grouped: Record<string, string[]> = {};
  for (const row of data as { make: string; model: string }[]) {
    (grouped[row.make] ??= []).push(row.model);
  }
  return grouped;
}

export type VehicleYearRange = { minYear: number; maxYear: number };

/** Public read of the `vehicle_year_range` singleton (admin-editable at
 * /admin/catalog) — feeds the sell form's Year dropdown bounds. */
export async function getVehicleYearRange(): Promise<VehicleYearRange | null> {
  const { data, error } = await supabase
    .from("vehicle_year_range")
    .select("min_year, max_year")
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return { minYear: data.min_year as number, maxYear: data.max_year as number };
}

/** field_key → ordered list of values, e.g. { gear_type: ["Automatic", "Manual"], ... }. */
export type VehicleOptions = Record<string, string[]>;

/**
 * Public read of `vehicle_option_lists` (admin-editable at /admin/catalog)
 * grouped by field_key — feeds the sell form's gear/roof/interior-type and
 * color dropdowns, the same lists the seller-submission app's own form uses.
 */
export async function getVehicleOptions(): Promise<VehicleOptions> {
  const { data, error } = await supabase
    .from("vehicle_option_lists")
    .select("field_key, value")
    .order("sort_order", { ascending: true });
  if (error || !data) return {};
  const grouped: VehicleOptions = {};
  for (const row of data as { field_key: string; value: string }[]) {
    (grouped[row.field_key] ??= []).push(row.value);
  }
  return grouped;
}
