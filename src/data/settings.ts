import { HEX_COLOR } from "@/lib/hexColor";
import { supabase } from "@/lib/supabase/browser";

export type SiteSettings = {
  phone: string;
  brandColor: string;
  brandColor2: string;
  emailCorporate: string;
  emailInfo: string;
  emailSales: string;
  emailSupport: string;
};

/** Used if `site_settings` has no row yet, or a stored value fails validation. */
const DEFAULT_SETTINGS: SiteSettings = {
  phone: "+966 577068091",
  brandColor: "#f4511d",
  brandColor2: "#f68a5c",
  emailCorporate: "corporate@yalhacar.com",
  emailInfo: "info@yalhacar.com",
  emailSales: "sales@yalhacar.com",
  emailSupport: "support@yalhacar.com",
};

/**
 * Public read of site-wide settings (phone number, the two brand colors
 * that override `--color-brass` / `--color-brass-2`, and the four
 * department contact emails). Called from the root route loader on every
 * page, so it must stay on the plain anon client — same reasoning as
 * `listCars` in `@/data/cars`.
 *
 * Colors are re-validated here (not just trusted from the DB check
 * constraint) because they get injected as raw CSS text in the root route's
 * `head()` — an invalid value must never reach that string.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .select(
      "phone, brand_color, brand_color_2, email_corporate, email_info, email_sales, email_support",
    )
    .eq("id", "default")
    .maybeSingle();
  if (error || !data) return DEFAULT_SETTINGS;
  return {
    phone: data.phone,
    brandColor: HEX_COLOR.test(data.brand_color) ? data.brand_color : DEFAULT_SETTINGS.brandColor,
    brandColor2: HEX_COLOR.test(data.brand_color_2)
      ? data.brand_color_2
      : DEFAULT_SETTINGS.brandColor2,
    emailCorporate: data.email_corporate ?? DEFAULT_SETTINGS.emailCorporate,
    emailInfo: data.email_info ?? DEFAULT_SETTINGS.emailInfo,
    emailSales: data.email_sales ?? DEFAULT_SETTINGS.emailSales,
    emailSupport: data.email_support ?? DEFAULT_SETTINGS.emailSupport,
  };
}
