import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/require-admin";
import { HEX_COLOR } from "@/lib/hexColor";

const hexColor = z.string().regex(HEX_COLOR, "Must be a hex color like #f4511d");
const email = z.string().email("Must be a valid email address");

/** Admin-only write for `site_settings`. Mirrors src/lib/admin/cars.ts. */
export const updateSiteSettingsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      phone: z.string().min(1),
      brandColor: hexColor,
      brandColor2: hexColor,
      emailCorporate: email,
      emailInfo: email,
      emailSales: email,
      emailSupport: email,
    }),
  )
  .handler(async ({ data }) => {
    const supabase = await requireAdmin();
    const { error } = await supabase
      .from("site_settings")
      .update({
        phone: data.phone,
        brand_color: data.brandColor,
        brand_color_2: data.brandColor2,
        email_corporate: data.emailCorporate,
        email_info: data.emailInfo,
        email_sales: data.emailSales,
        email_support: data.emailSupport,
        updated_at: new Date().toISOString(),
      })
      .eq("id", "default");
    if (error) throw new Error(error.message);
    return data;
  });
