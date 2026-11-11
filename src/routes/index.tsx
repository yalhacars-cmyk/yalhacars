import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandGrid } from "@/components/site/BrandGrid";
import { Faq } from "@/components/site/Faq";
import { FeaturedCarousel } from "@/components/site/FeaturedCarousel";
import { HeroSlider, type HeroSlide } from "@/components/site/HeroSlider";
import { HowItWorks } from "@/components/site/HowItWorks";
import { TrustStrip } from "@/components/site/TrustStrip";
import { listCars } from "@/data/cars";
import { getBodyTypes, getBrands, getHeroSlides } from "@/data/siteContent";
import { useLocale, useT } from "@/lib/i18n/context";
import { formatSar, tr } from "@/lib/i18n/dictionary";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [cars, brands, bodyTypes, heroSlidesContent] = await Promise.all([
      listCars(),
      getBrands(),
      getBodyTypes(),
      getHeroSlides(),
    ]);
    return { cars, brands, bodyTypes, heroSlidesContent };
  },
  head: () => ({
    meta: [
      { title: "Yalhacar — Buy, Sell & Finance Cars in Saudi Arabia" },
      {
        name: "description",
        content:
          "Certified, 200-point inspected cars with transparent SAR pricing, finance offers from multiple partners, trade-in and doorstep delivery across Saudi Arabia.",
      },
      { property: "og:title", content: "Yalhacar — Cars built on proof, not promises" },
      {
        property: "og:description",
        content:
          "Inspected inventory, transparent SAR pricing and finance from multiple partners — buy, sell and finance in one place.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { cars, brands, bodyTypes, heroSlidesContent } = Route.useLoaderData();
  const t = useT();
  const { locale } = useLocale();

  const intents = [
    { ...t.home.intents[0]!, to: "/buy" as const },
    { ...t.home.intents[1]!, to: "/sell" as const },
    { ...t.home.intents[2]!, to: "/finance" as const },
    { ...t.home.intents[3]!, to: "/dealers" as const },
  ];

  // Admin-managed slides (see /admin/content → Hero) come first, falling
  // back to the one hardcoded intro slide only when none have been
  // configured yet, so the hero is never blank on a fresh setup.
  // Banner slides only use real inventory: cars that have a photo and a price.
  const heroCars = cars.filter((car) => car.image && car.price > 0).slice(0, 6);

  const introSlides: HeroSlide[] =
    heroSlidesContent.length > 0
      ? heroSlidesContent.map((s) => ({
          kind: "intro",
          image: s.imageUrl,
          alt: locale === "ar" ? s.titleAr : s.titleEn,
          eyebrow: locale === "ar" ? s.eyebrowAr : s.eyebrowEn,
          title: locale === "ar" ? s.titleAr : s.titleEn,
          subtitle: locale === "ar" ? s.subtitleAr : s.subtitleEn,
        }))
      : heroCars[0]?.image
        ? [
            {
              kind: "intro",
              image: heroCars[0].image,
              alt: heroCars[0].title,
              eyebrow: t.hero.introEyebrow,
              title: t.hero.introTitle,
              subtitle: t.hero.introSubtitle,
            },
          ]
        : [];

  const heroSlides: HeroSlide[] = [
    ...introSlides,
    ...heroCars.map((car): HeroSlide => ({
      kind: "car",
      carId: car.id,
      image: car.image,
      alt: car.title,
      eyebrow: `${tr(car.condition, locale)} · ${tr(car.city, locale)}`,
      title: car.title,
      subtitle:
        car.monthly > 0
          ? `${formatSar(car.price, locale)} · ${
              locale === "ar" ? "تبدأ من" : "from"
            } ${formatSar(car.monthly, locale)}/${locale === "ar" ? "شهر" : "mo"}`
          : formatSar(car.price, locale),
    })),
  ];

  return (
    <>
      <HeroSlider slides={heroSlides} />

      <section className="bg-panel text-panel-fg">
        <div className="mx-auto max-w-[1360px] px-5 py-8 sm:px-8 sm:py-10">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {intents.map((intent) => (
              <Link
                key={intent.to}
                to={intent.to}
                className="group relative overflow-hidden rounded-[14px] bg-panel-2 p-4 ring-1 ring-panel-fg/10 sm:p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-display text-lg font-medium">{intent.title}</div>
                    <div className="mt-0.5 text-sm text-mist">{intent.sub}</div>
                  </div>
                  <span className="text-panel-accent transition-transform rtl:-scale-x-100 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                    →
                  </span>
                </div>
                <div className="mt-4 flex gap-2 text-[11px] text-panel-fg/50">
                  {intent.chips.map((chip) => (
                    <span key={chip} className="rounded-full px-2 py-0.5 ring-1 ring-panel-fg/10">
                      {chip}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 rounded-[16px] bg-paper p-4 text-ink ring-1 ring-brass/20 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-3 rounded-control bg-sand px-4 py-3.5 text-sand-fg">
                <span className="text-sm text-sand-fg/70">{t.home.searchLabel}</span>
                <input
                  className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-sand-fg/50"
                  placeholder={t.home.searchPlaceholder}
                  aria-label={t.home.searchButton}
                />
              </div>
              <Link
                to="/buy"
                className="shrink-0 rounded-control bg-panel px-6 py-3.5 text-center font-display text-sm font-medium text-panel-fg"
              >
                {t.home.searchButton}
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {t.home.filterChips.map((chip) => (
                <span key={chip} className="rounded-full bg-sand px-2.5 py-1 text-sand-fg/85">
                  {chip}
                </span>
              ))}
              <span className="rounded-full bg-brass/15 px-2.5 py-1 font-medium text-brass">
                {t.home.aiSearch}
              </span>
            </div>
          </div>
        </div>
      </section>

      <BrandGrid brands={brands} bodyTypes={bodyTypes} />

      <TrustStrip />

      <HowItWorks />

      <section className="bg-paper">
        <div className="mx-auto max-w-[1360px] px-5 py-10 sm:px-8 sm:py-14">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <div className="mb-2 text-[11px] tracking-[0.2em] text-brass uppercase">
                {t.home.featuredEyebrow}
              </div>
              <h2 className="text-balance font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                {t.home.featuredHeading}
              </h2>
            </div>
            <Link
              to="/buy"
              className="hidden text-sm font-medium text-ink/60 transition-colors hover:text-ink sm:inline"
            >
              {t.home.viewAllInventory}
            </Link>
          </div>

          <FeaturedCarousel cars={cars} />
        </div>
      </section>

      <Faq />
    </>
  );
}
