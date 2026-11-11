import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FINANCE_PARTNERS, partnerLogo } from "@/data/financePartners";
import { useLocale, useT } from "@/lib/i18n/context";
import { formatNumber, formatSar } from "@/lib/i18n/dictionary";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: "Car Finance in Saudi Arabia — Compare Offers | Yalhacar" },
      {
        name: "description",
        content:
          "Compare live car finance and lease offers from 14 partners in Saudi Arabia. Estimate your monthly payment and get pre-approved in minutes.",
      },
    ],
  }),
  component: FinancePage,
});

const partners = FINANCE_PARTNERS;

function FinancePage() {
  const t = useT();
  const { locale } = useLocale();
  const [price, setPrice] = useState(220000);
  const [downPayment, setDownPayment] = useState(44000);
  const [months, setMonths] = useState(60);
  const [rate, setRate] = useState(3.65);

  const monthly = useMemo(() => {
    const principal = Math.max(0, price - downPayment);
    const monthlyRate = rate / 100 / 12;
    if (monthlyRate === 0) return principal / months;
    const factor = Math.pow(1 + monthlyRate, months);
    return (principal * monthlyRate * factor) / (factor - 1);
  }, [price, downPayment, months, rate]);

  return (
    <div className="bg-paper">
      <section className="relative overflow-hidden bg-panel text-panel-fg">
        <div className="diagonal pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-[1360px] px-5 py-10 sm:px-8 sm:py-14">
          <div className="mb-5 inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-panel-accent uppercase">
            <span className="size-1.5 rounded-full bg-brass" /> {t.finance.eyebrow}
          </div>
          <h1 className="max-w-[36ch] text-balance font-display text-[36px] leading-[1.02] font-semibold tracking-tight sm:text-[48px]">
            {t.finance.titleStart}
            <span className="text-panel-accent">{t.finance.titleHighlight}</span>
            {t.finance.titleEnd}
          </h1>
          <p className="mt-4 max-w-[52ch] text-pretty text-base leading-relaxed text-mist">
            {t.finance.subtitle}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1360px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div
            id="calculator"
            className="scroll-mt-24 rounded-panel bg-sand p-6 text-sand-fg ring-1 ring-hairline sm:p-8"
          >
            <div className="mb-2 text-[11px] tracking-[0.2em] text-sand-accent uppercase">
              {t.finance.calcEyebrow}
            </div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {t.finance.calcHeading}
            </h2>

            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="mb-1.5 flex justify-between text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
                  <span>{t.finance.priceLabel}</span>
                  <span className="num text-sand-fg/75 normal-case">
                    {formatSar(price, locale)}
                  </span>
                </span>
                <input
                  type="range"
                  min={30000}
                  max={500000}
                  step={5000}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full accent-brass"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 flex justify-between text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
                  <span>{t.finance.downPaymentLabel}</span>
                  <span className="num text-sand-fg/75 normal-case">
                    {formatSar(downPayment, locale)}
                  </span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={price}
                  step={2000}
                  value={Math.min(downPayment, price)}
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                  className="w-full accent-brass"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 flex justify-between text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
                  <span>{t.finance.tenureLabel}</span>
                  <span className="num text-sand-fg/75 normal-case">
                    {formatNumber(months, locale)} {t.finance.months}
                  </span>
                </span>
                <input
                  type="range"
                  min={12}
                  max={72}
                  step={6}
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                  className="w-full accent-brass"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
                  {t.finance.partnerLabel}
                </span>
                <select
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="w-full rounded-control bg-paper px-3 py-2.5 text-sm outline-none ring-1 ring-hairline"
                >
                  {partners.map((p) => (
                    <option key={p.name.en} value={parseFloat(p.rate)}>
                      {p.name[locale]} · {p.rate} {t.finance.apr}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 rounded-panel bg-panel p-6 text-panel-fg">
              <div className="text-[11px] tracking-[0.2em] text-panel-accent uppercase">
                {t.finance.estimatedPayment}
              </div>
              <div className="num mt-2 font-display text-4xl font-semibold">
                {formatSar(Math.round(monthly), locale)}
                <span className="text-lg font-normal text-mist">
                  /{locale === "ar" ? "شهر" : "mo"}
                </span>
              </div>
              <p className="mt-3 text-sm text-mist">
                {t.finance.estimateBody
                  .replace(
                    "{amount}",
                    formatSar(Math.max(0, price - Math.min(downPayment, price)), locale),
                  )
                  .replace("{months}", formatNumber(months, locale))
                  .replace("{rate}", formatNumber(rate, locale, 2))}
              </p>
            </div>

            <Link
              to="/finance/apply"
              search={{ price, downPayment, months }}
              className="mt-4 block w-full rounded-control bg-brass px-4 py-3.5 text-center font-display text-sm font-medium text-white"
            >
              {t.finance.preApprove}
            </Link>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {t.finance.partnersHeading}
            </h2>
            <div className="mt-5 space-y-3">
              {partners.map((p) => (
                <div
                  key={p.name.en}
                  className="flex items-center gap-3 rounded-panel bg-sand p-4 text-sand-fg ring-1 ring-hairline"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-control bg-white p-1.5 ring-1 ring-hairline">
                    <img
                      src={partnerLogo(p, locale)}
                      alt={p.name[locale]}
                      loading="lazy"
                      className="size-full object-contain"
                    />
                  </span>
                  <div>
                    <div className="font-display text-sm font-medium">{p.name[locale]}</div>
                    <div className="mt-0.5 text-xs text-sand-fg/65">{p.term[locale]}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold tracking-tight">
                {t.finance.faqHeading}
              </h2>
              <div className="mt-4 space-y-4">
                {t.finance.faqs.map((f) => (
                  <div key={f.q} className="border-b border-line pb-4">
                    <div className="font-display text-sm font-medium">{f.q}</div>
                    <div className="mt-1 text-sm text-ink/55">{f.a}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 rounded-panel bg-panel p-5 text-panel-fg">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-display text-base font-medium">{t.finance.readyTitle}</div>
                  <div className="mt-0.5 text-sm text-mist">{t.finance.readyBody}</div>
                </div>
                <Link
                  to="/buy"
                  className="shrink-0 rounded-full bg-brass px-4 py-2 text-xs font-medium text-white"
                >
                  {t.finance.browseCars}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
