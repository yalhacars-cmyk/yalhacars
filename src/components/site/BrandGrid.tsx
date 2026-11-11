import { Link } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { Marquee } from "@/components/site/Marquee";
import type { BodyTypeOption, BrandLogo } from "@/data/siteContent";
import { useLocale, useT } from "@/lib/i18n/context";
import { formatSar, tr } from "@/lib/i18n/dictionary";

const budgets = [50000, 70000, 100000, 150000, 200000, 300000];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[11px] font-medium tracking-[0.14em] text-ink/40 uppercase">
      {children}
    </div>
  );
}

/** Shared landscape card shape for all three strips — bigger and wider than tall. */
const CARD_CLASS =
  "relative flex h-36 w-64 shrink-0 overflow-hidden rounded-panel ring-1 ring-hairline transition-transform hover:-translate-y-0.5";

export function BrandGrid({
  brands,
  bodyTypes,
}: {
  brands: BrandLogo[];
  bodyTypes: BodyTypeOption[];
}) {
  const t = useT();
  const { locale } = useLocale();

  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-[1360px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 text-[11px] tracking-[0.2em] text-brass uppercase">
              {t.brandGrid.eyebrow}
            </div>
            <h2 className="text-balance font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {t.brandGrid.heading}
            </h2>
          </div>
          <Link
            to="/buy"
            className="hidden text-sm font-medium text-ink/60 transition-colors hover:text-ink sm:inline"
          >
            {t.brandGrid.viewAll}
          </Link>
        </div>

        <div className="space-y-8">
          {brands.length > 0 ? (
            <div>
              <SectionLabel>{t.brandGrid.tabBrand}</SectionLabel>
              <Marquee
                items={brands}
                keyFn={(brand, i) => `${brand.id}-${i}`}
                renderItem={(brand) => (
                  <Link
                    to="/buy"
                    search={brand.text ? { make: brand.text } : {}}
                    className={`${CARD_CLASS} items-end bg-white`}
                  >
                    <img
                      src={brand.imageUrl}
                      alt={brand.text || ""}
                      loading="lazy"
                      className="absolute inset-0 size-full object-contain p-6"
                    />
                    {brand.text ? (
                      <div className="relative z-10 w-full bg-gradient-to-t from-ink/80 via-ink/0 to-transparent px-4 pb-3 pt-8">
                        <span className="text-sm font-medium text-white drop-shadow-sm">
                          {brand.text}
                        </span>
                      </div>
                    ) : null}
                  </Link>
                )}
              />
            </div>
          ) : null}

          {bodyTypes.length > 0 ? (
            <div>
              <SectionLabel>{t.brandGrid.tabBodyType}</SectionLabel>
              <Marquee
                items={bodyTypes}
                keyFn={(bt, i) => `${bt.id}-${i}`}
                renderItem={(bt) => (
                  <Link
                    to="/buy"
                    search={bt.value ? { bodyType: bt.value } : {}}
                    className={`${CARD_CLASS} items-end bg-sand`}
                  >
                    <img
                      src={bt.imageUrl}
                      alt={bt.value || ""}
                      loading="lazy"
                      className="absolute inset-0 size-full object-cover"
                    />
                    {bt.value ? (
                      <div className="relative z-10 w-full bg-gradient-to-t from-ink/80 via-ink/10 to-transparent px-4 pb-3 pt-10">
                        <span className="text-sm font-medium text-white drop-shadow-sm">
                          {tr(bt.value, locale)}
                        </span>
                      </div>
                    ) : null}
                  </Link>
                )}
              />
            </div>
          ) : null}

          <div>
            <SectionLabel>{t.brandGrid.tabBudget}</SectionLabel>
            <Marquee
              items={budgets}
              keyFn={(amount, i) => `${amount}-${i}`}
              renderItem={(amount) => (
                <Link
                  to="/buy"
                  search={{ maxPrice: amount }}
                  className={`${CARD_CLASS} items-center justify-center gap-3 bg-gradient-to-br from-brass to-brass-2 px-6`}
                >
                  <Wallet className="size-7 shrink-0 text-white/90" />
                  <span className="num font-display text-xl font-semibold text-white">
                    {formatSar(amount, locale)}
                  </span>
                </Link>
              )}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
