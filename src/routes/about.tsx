import { createFileRoute, Link } from "@tanstack/react-router";
import { useLocale, useT } from "@/lib/i18n/context";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — Yalhacar" },
      {
        name: "description",
        content:
          "Yalhacar is the car marketplace built on proof, not promises — inspected inventory, transparent pricing, and financing you can compare.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const t = useT();
  const { locale } = useLocale();

  return (
    <div className="bg-paper">
      <section className="relative overflow-hidden bg-panel text-panel-fg">
        <div className="diagonal pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-[1360px] px-5 py-10 sm:px-8 sm:py-14">
          <img
            src={locale === "ar" ? "/brand/logo-ar.webp" : "/brand/logo-en.webp"}
            alt={t.brand.name}
            width={640}
            height={442}
            className="mb-6 h-14 w-auto rounded-[10px] sm:h-16"
          />
          <div className="mb-5 inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-panel-accent uppercase">
            <span className="size-1.5 rounded-full bg-brass" /> {t.about.eyebrow}
          </div>
          <h1 className="max-w-[40ch] text-balance font-display text-[32px] leading-[1.05] font-semibold tracking-tight sm:text-[48px]">
            {t.about.heading}
          </h1>
          <p className="mt-4 max-w-[68ch] text-pretty text-base leading-relaxed text-mist">
            {t.about.intro}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1360px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {t.about.missionHeading}
            </h2>
            <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-ink/60">
              {t.about.missionBody}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-panel bg-panel p-6 text-panel-fg">
            {t.about.stats.map((stat) => (
              <div key={stat.label}>
                <div className="num font-display text-3xl font-semibold text-panel-accent">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-mist">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-panel bg-sand p-6 text-sand-fg ring-1 ring-hairline sm:flex-row sm:items-center sm:p-8">
          <div>
            <div className="font-display text-xl font-semibold">{t.about.ctaHeading}</div>
            <div className="mt-1 text-sm text-sand-fg/70">{t.about.ctaBody}</div>
          </div>
          <Link
            to="/buy"
            className="shrink-0 rounded-control bg-panel px-5 py-3 text-center font-display text-sm font-medium text-panel-fg transition-colors hover:bg-panel-2"
          >
            {t.about.ctaButton}
          </Link>
        </div>
      </section>
    </div>
  );
}
