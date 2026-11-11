import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * App content tables: `onboarding_slides`, `splash_wallpapers`, and
 * `finance_partners` (already existed on the live DB before this app's
 * code touched them), `finance_flyers` / `brands` (added by
 * supabase/schema_v7.sql and schema_v8.sql), `hero_slides` (added by
 * schema_v10.sql — the homepage hero's static/promotional slides; the
 * hero's other slides come live from featured cars, no table needed), and
 * `home_hero_content` / `home_trust_items` (added directly in Supabase, not
 * by a schema file here — the mobile app's home screen content; see the
 * dedicated doc comment further down). Same story as every other table in
 * this file's siblings — RLS only grants public SELECT of active rows, so
 * admin reads/writes go through the service-role client.
 */

export type OnboardingSlide = {
  id: string;
  slide_key: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
};
export type SplashWallpaper = {
  id: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
};
export type FinanceFlyer = {
  id: string;
  text: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
};
export type FinancePartner = {
  id: string;
  name: string;
  logo_url: string | null;
  logo_url_ar: string | null;
  sort_order: number;
  is_active: boolean;
};
export type Brand = {
  id: string;
  text: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
};
export type HeroSlide = {
  id: string;
  eyebrow_en: string;
  eyebrow_ar: string;
  title_en: string;
  title_ar: string;
  subtitle_en: string;
  subtitle_ar: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
};

// --- onboarding_slides ------------------------------------------------

export const listOnboardingSlidesFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { data, error } = await getSupabaseAdminClient()
    .from("onboarding_slides")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as OnboardingSlide[];
});

export const createOnboardingSlideFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      slide_key: z.string(),
      image_url: z.string().min(1),
      sort_order: z.number().int().default(0),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient().from("onboarding_slides").insert(data);
    if (error) throw new Error(error.message);
  });

export const updateOnboardingSlideFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      slide_key: z.string().optional(),
      image_url: z.string().min(1).optional(),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { id, ...patch } = data;
    const { error } = await getSupabaseAdminClient()
      .from("onboarding_slides")
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
  });

export const deleteOnboardingSlideFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient()
      .from("onboarding_slides")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  });

// --- splash_wallpapers ------------------------------------------------

export const listSplashWallpapersFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { data, error } = await getSupabaseAdminClient()
    .from("splash_wallpapers")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as SplashWallpaper[];
});

export const createSplashWallpaperFn = createServerFn({ method: "POST" })
  .validator(z.object({ image_url: z.string().min(1), sort_order: z.number().int().default(0) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient().from("splash_wallpapers").insert(data);
    if (error) throw new Error(error.message);
  });

export const updateSplashWallpaperFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      image_url: z.string().min(1).optional(),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { id, ...patch } = data;
    const { error } = await getSupabaseAdminClient()
      .from("splash_wallpapers")
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
  });

export const deleteSplashWallpaperFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient()
      .from("splash_wallpapers")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  });

// --- finance_flyers ------------------------------------------------

export const listFinanceFlyersFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { data, error } = await getSupabaseAdminClient()
    .from("finance_flyers")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as FinanceFlyer[];
});

export const createFinanceFlyerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      text: z.string(),
      image_url: z.string().min(1),
      sort_order: z.number().int().default(0),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient().from("finance_flyers").insert(data);
    if (error) throw new Error(error.message);
  });

export const updateFinanceFlyerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      text: z.string().optional(),
      image_url: z.string().min(1).optional(),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { id, ...patch } = data;
    const { error } = await getSupabaseAdminClient()
      .from("finance_flyers")
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
  });

export const deleteFinanceFlyerFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient()
      .from("finance_flyers")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  });

// --- finance_partners ------------------------------------------------

export const listFinancePartnersFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { data, error } = await getSupabaseAdminClient()
    .from("finance_partners")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as FinancePartner[];
});

export const createFinancePartnerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string(),
      logo_url: z.string().min(1).nullable().optional(),
      logo_url_ar: z.string().min(1).nullable().optional(),
      sort_order: z.number().int().default(0),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient().from("finance_partners").insert(data);
    if (error) throw new Error(error.message);
  });

export const updateFinancePartnerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      name: z.string().optional(),
      logo_url: z.string().min(1).nullable().optional(),
      logo_url_ar: z.string().min(1).nullable().optional(),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { id, ...patch } = data;
    const { error } = await getSupabaseAdminClient()
      .from("finance_partners")
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
  });

export const deleteFinancePartnerFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient()
      .from("finance_partners")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  });

// --- brands ------------------------------------------------

export const listBrandsFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { data, error } = await getSupabaseAdminClient()
    .from("brands")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Brand[];
});

export const createBrandFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      text: z.string(),
      image_url: z.string().min(1),
      sort_order: z.number().int().default(0),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient().from("brands").insert(data);
    if (error) throw new Error(error.message);
  });

export const updateBrandFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      text: z.string().optional(),
      image_url: z.string().min(1).optional(),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { id, ...patch } = data;
    const { error } = await getSupabaseAdminClient().from("brands").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
  });

export const deleteBrandFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient().from("brands").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
  });

// --- hero_slides ------------------------------------------------

export const listHeroSlidesFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { data, error } = await getSupabaseAdminClient()
    .from("hero_slides")
    .select("*")
    // created_at as a tiebreaker: two rows sharing a sort_order (e.g. from a
    // bulk upload) would otherwise sort inconsistently across refetches,
    // visibly swapping position each time a field is saved.
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as HeroSlide[];
});

export const createHeroSlideFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      image_url: z.string().min(1),
      sort_order: z.number().int().default(0),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient().from("hero_slides").insert(data);
    if (error) throw new Error(error.message);
  });

export const updateHeroSlideFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      eyebrow_en: z.string().optional(),
      eyebrow_ar: z.string().optional(),
      title_en: z.string().optional(),
      title_ar: z.string().optional(),
      subtitle_en: z.string().optional(),
      subtitle_ar: z.string().optional(),
      image_url: z.string().min(1).optional(),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { id, ...patch } = data;
    const { error } = await getSupabaseAdminClient().from("hero_slides").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
  });

export const deleteHeroSlideFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient().from("hero_slides").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
  });

// --- home_hero_content / home_trust_items ----------------------------------
//
// Consumed by the mobile app's home screen (a separate codebase on this same
// Supabase project — same relationship as car_makes/vehicle_option_lists in
// catalog.ts), not this website — the swipeable "Find your next car" hero
// cards and the three icon+text trust badges under its AI Assistant bar.
// Admin editing lives here anyway since this is the shared "app content"
// panel; nothing on the website itself reads these two tables.
//
// home_hero_content started as a singleton (fixed id "default") and was
// later widened with sort_order/is_active into a swipeable list — same
// shape as hero_slides, just without an image column. `id` has no DB-side
// default (unlike hero_slides' uuid default), so new rows generate their
// own id here.

export type HomeHeroContent = {
  id: string;
  title: string;
  title_ar: string;
  subtitle: string;
  subtitle_ar: string;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
};

export const listHomeHeroContentFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { data, error } = await getSupabaseAdminClient()
    .from("home_hero_content")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as HomeHeroContent[];
});

export const createHomeHeroContentFn = createServerFn({ method: "POST" })
  .validator(z.object({ sort_order: z.number().int().default(0) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient().from("home_hero_content").insert({
      id: crypto.randomUUID(),
      title: "",
      title_ar: "",
      subtitle: "",
      subtitle_ar: "",
      sort_order: data.sort_order,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  });

export const updateHomeHeroContentFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      title: z.string().optional(),
      title_ar: z.string().optional(),
      subtitle: z.string().optional(),
      subtitle_ar: z.string().optional(),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { id, ...patch } = data;
    const { error } = await getSupabaseAdminClient()
      .from("home_hero_content")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  });

export const deleteHomeHeroContentFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient()
      .from("home_hero_content")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  });

export type HomeTrustItem = {
  id: string;
  icon: string;
  /** Uploaded icon image — takes priority over `icon` (a Material Icons
   * name) when set; null falls back to the built-in icon. */
  icon_url: string | null;
  label: string;
  label_ar: string;
  sort_order: number;
  is_active: boolean;
};

export const listHomeTrustItemsFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { data, error } = await getSupabaseAdminClient()
    .from("home_trust_items")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as HomeTrustItem[];
});

export const createHomeTrustItemFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      icon: z.string().default(""),
      label: z.string().default(""),
      label_ar: z.string().default(""),
      sort_order: z.number().int().default(0),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient().from("home_trust_items").insert(data);
    if (error) throw new Error(error.message);
  });

export const updateHomeTrustItemFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      icon: z.string().optional(),
      icon_url: z.string().nullable().optional(),
      label: z.string().optional(),
      label_ar: z.string().optional(),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { id, ...patch } = data;
    const { error } = await getSupabaseAdminClient()
      .from("home_trust_items")
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
  });

export const deleteHomeTrustItemFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient()
      .from("home_trust_items")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  });
