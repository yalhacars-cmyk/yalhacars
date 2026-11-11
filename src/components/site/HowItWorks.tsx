import { CreditCard, MousePointerClick, Search, Truck } from "lucide-react";
import { useT } from "@/lib/i18n/context";

const icons = [Search, MousePointerClick, CreditCard, Truck];

export function HowItWorks() {
  const t = useT();

  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-[1360px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8 text-center">
          <div className="mb-2 text-[11px] tracking-[0.2em] text-brass uppercase">
            {t.howItWorks.eyebrow}
          </div>
          <h2 className="text-balance font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {t.howItWorks.heading}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.howItWorks.steps.map((step, i) => {
            const Icon = icons[i];
            return (
              <div
                key={step.title}
                className="rounded-panel bg-sand p-6 text-center text-sand-fg ring-1 ring-hairline"
              >
                <div className="mx-auto grid size-14 place-items-center rounded-full bg-paper ring-1 ring-hairline">
                  {Icon ? <Icon className="size-6 text-brass" /> : null}
                </div>
                <div className="mt-4 font-display text-base font-semibold">{step.title}</div>
                <div className="mt-2 text-sm leading-relaxed text-sand-fg/70">{step.body}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
