import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Rocket, Users, Wallet } from "lucide-react";
import { useT } from "@/lib/i18n/context";

export const Route = createFileRoute("/dealers")({
  head: () => ({
    meta: [
      { title: "Dealer Partnerships — Yalhacar" },
      {
        name: "description",
        content:
          "Partner with Yalhacar to list your inventory to thousands of buyers, close deals with integrated financing, and grow your dealership.",
      },
    ],
  }),
  component: DealersPage,
});

const icons = [Users, Wallet, Building2, Rocket];

function DealersPage() {
  const t = useT();

  return (
    <div className="bg-paper">
      <section className="relative overflow-hidden bg-panel text-panel-fg">
        <div className="diagonal pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-[1360px] px-5 py-10 sm:px-8 sm:py-14">
          <div className="mb-5 inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-panel-accent uppercase">
            <span className="size-1.5 rounded-full bg-brass" /> {t.dealers.eyebrow}
          </div>
          <h1 className="max-w-[38ch] text-balance font-display text-[34px] leading-[1.05] font-semibold tracking-tight sm:text-[48px]">
            {t.dealers.heading}
          </h1>
          <p className="mt-4 max-w-[60ch] text-pretty text-base leading-relaxed text-mist">
            {t.dealers.subtitle}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1360px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.dealers.benefits.map((benefit, i) => {
            const Icon = icons[i];
            return (
              <div
                key={benefit.title}
                className="rounded-panel bg-sand p-5 text-sand-fg ring-1 ring-hairline"
              >
                <div className="mb-3 grid size-10 place-items-center rounded-full bg-brass text-white">
                  {Icon ? <Icon className="size-5" /> : null}
                </div>
                <div className="font-display text-base font-medium">{benefit.title}</div>
                <div className="mt-1 text-sm text-sand-fg/70">{benefit.body}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-panel bg-panel p-6 text-panel-fg sm:p-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="font-display text-xl font-semibold">{t.dealers.ctaHeading}</div>
              <div className="mt-1 text-sm text-mist">{t.dealers.ctaBody}</div>
            </div>
            <Link
              to="/contact"
              className="shrink-0 rounded-control bg-brass px-5 py-3 text-center font-display text-sm font-medium text-white transition-colors hover:bg-brass-2"
            >
              {t.dealers.ctaButton}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
