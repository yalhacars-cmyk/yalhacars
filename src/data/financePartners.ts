import type { Locale } from "@/lib/i18n/dictionary";

export const FINANCE_PARTNERS = [
  {
    name: { en: "Abdul Latif Jameel Finance", ar: "عبداللطيف جميل للتمويل" },
    logo: "/finance/abdul_latif_jameel.webp",
    rate: "3.49%",
    term: { en: "Up to 60 months", ar: "حتى 60 شهرًا" },
  },
  {
    name: { en: "Quara Finance", ar: "قوارة للتمويل" },
    logo: "/finance/quara.webp",
    logoAr: "/finance/quara_ar.webp",
    rate: "3.65%",
    term: { en: "Up to 60 months", ar: "حتى 60 شهرًا" },
  },
  {
    name: { en: "Raya Financing", ar: "راية للتمويل" },
    logo: "/finance/raya_financing.webp",
    rate: "3.79%",
    term: { en: "Up to 60 months", ar: "حتى 60 شهرًا" },
  },
  {
    name: { en: "Amwal", ar: "أموال" },
    logo: "/finance/amwal_logo.webp",
    rate: "3.99%",
    term: { en: "Up to 48 months", ar: "حتى 48 شهرًا" },
  },
  {
    name: { en: "Tabby", ar: "تابي" },
    logo: "/finance/tabby.webp",
    rate: "0% (split pay)",
    term: { en: "Up to 12 months", ar: "حتى 12 شهرًا" },
  },
  {
    name: { en: "Tamara", ar: "تمارا" },
    logo: "/finance/tamara.webp",
    logoAr: "/finance/tamara_ar.webp",
    rate: "0% (split pay)",
    term: { en: "Up to 12 months", ar: "حتى 12 شهرًا" },
  },
];

export type FinancePartner = (typeof FINANCE_PARTNERS)[number];

/** Most partners use the same logo in both languages — only a few ship an
 * Arabic-specific lockup (`logoAr`), so this falls back to `logo`. */
export function partnerLogo(partner: FinancePartner, locale: Locale): string {
  return (locale === "ar" && "logoAr" in partner ? partner.logoAr : undefined) ?? partner.logo;
}
