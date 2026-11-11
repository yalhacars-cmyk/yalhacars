import { Marquee } from "@/components/site/Marquee";
import type { FinancePartnerLogo } from "@/data/siteContent";
import { useLocale } from "@/lib/i18n/context";

/**
 * Auto-sliding strip of admin-managed finance partner logos (/admin/content
 * → Finance Partners) — distinct from the static, rate/term-bearing partner
 * cards on /finance.
 */
export function FinancePartnersMarquee({ logos }: { logos: FinancePartnerLogo[] }) {
  const { locale } = useLocale();

  return (
    <Marquee
      items={logos}
      keyFn={(logo, i) => `${logo.id}-${i}`}
      renderItem={(logo) => (
        <span
          className="grid h-10 place-items-center rounded-control bg-white px-3 py-1.5"
          title={logo.name}
        >
          <img
            src={(locale === "ar" && logo.logoUrlAr) || logo.logoUrl || undefined}
            alt={logo.name}
            loading="lazy"
            className="h-full max-w-[88px] object-contain"
          />
        </span>
      )}
    />
  );
}
