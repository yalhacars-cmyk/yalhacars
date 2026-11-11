import { CarPhoto } from "@/components/CarPhoto";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Activity,
  BatteryCharging,
  Calendar as CalendarIcon,
  Car as CarIcon,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Cog,
  Compass,
  Fuel,
  Gauge,
  HeartPulse,
  Info,
  MapPin,
  MessageCircle,
  Phone,
  Plug,
  Scale,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useMemo, useState, type ComponentType } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BookingDialog } from "@/components/BookingDialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { listCars, getCar, isAvailable, carAvailability } from "@/data/cars";
import { useLocale, useT } from "@/lib/i18n/context";
import { formatNumber, formatSar, tr } from "@/lib/i18n/dictionary";

export const Route = createFileRoute("/cars/$carId")({
  loader: async ({ params }) => {
    const [car, all] = await Promise.all([getCar(params.carId), listCars()]);
    if (!car) throw notFound();
    const related = all.filter((c) => c.id !== car.id).slice(0, 3);
    return { car, related };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          {
            title: `${loaderData.car.title} — ${formatSar(loaderData.car.price)} | Yalhacar`,
          },
          {
            name: "description",
            content: `${loaderData.car.year} ${loaderData.car.make} ${loaderData.car.model} in ${loaderData.car.city}. ${loaderData.car.mileageKm.toLocaleString("en-US")} km, ${loaderData.car.condition.toLowerCase()}, inspection score ${loaderData.car.inspectionScore}/100.`,
          },
        ]
      : [],
  }),
  component: CarDetailPage,
});

const APR = 3.99;
const TITLE_TRANSFER_FEE = 750;
const TRANSPORTATION_FEE = 200;
const ADMIN_FEE = 200;

const specIcons: Record<string, ComponentType<{ className?: string }>> = {
  Transmission: Settings2,
  Seats: Users,
  Engine: Cog,
  "Fuel type": Fuel,
  "Fuel economy": Gauge,
  Cylinders: Circle,
  Drivetrain: Compass,
  Power: Activity,
  Torque: Activity,
  Body: CarIcon,
  Warranty: ShieldCheck,
  Battery: BatteryCharging,
  Range: MapPin,
  Charging: Plug,
  "Battery health": HeartPulse,
};

const specOrder = [
  "Transmission",
  "Seats",
  "Engine",
  "Fuel type",
  "Fuel economy",
  "Cylinders",
  "Drivetrain",
];

function CarDetailPage() {
  const { car, related } = Route.useLoaderData();
  const [activeImage, setActiveImage] = useState(0);
  const t = useT();
  const { locale } = useLocale();

  const [balloonPct, setBalloonPct] = useState(30);
  const [downPct, setDownPct] = useState(0);
  const [years, setYears] = useState(5);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const available = isAvailable(car);
  const status = carAvailability(car);

  const discountPct =
    car.wasPrice && car.wasPrice > car.price
      ? ((car.wasPrice - car.price) / car.wasPrice) * 100
      : null;
  const discount = discountPct !== null ? `-${formatNumber(discountPct, locale, 1)}%` : null;

  const specRows = useMemo(() => {
    const synthesized = [
      {
        label: "Seats",
        value: `${formatNumber(car.seats, locale)} ${locale === "ar" ? "مقاعد" : "Seater"}`,
      },
      { label: "Fuel type", value: tr(car.fuel, locale) },
    ];
    const all = [...synthesized, ...car.specs];
    return [...all].sort((a, b) => {
      const ai = specOrder.indexOf(a.label);
      const bi = specOrder.indexOf(b.label);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [car, locale]);

  const transmissionValue = car.specs.find((s) => s.label === "Transmission")?.value ?? "";

  const downPaymentAmount = Math.round(car.price * (downPct / 100));
  const balloonAmount = Math.round(car.price * (balloonPct / 100));
  const monthly = useMemo(() => {
    const principal = car.price - downPaymentAmount;
    const r = APR / 100 / 12;
    const n = years * 12;
    const factor = Math.pow(1 + r, n);
    const m = (principal * r * factor - balloonAmount * r) / (factor - 1);
    return Math.max(0, Math.round(m));
  }, [car.price, downPaymentAmount, balloonAmount, years]);

  const feesTotal = TITLE_TRANSFER_FEE + TRANSPORTATION_FEE + ADMIN_FEE;
  const grandTotal = car.price + feesTotal;

  const overviewRows: [string, string][] = [
    [t.carDetail.brand, car.make],
    [t.carDetail.model, car.model],
    [t.carDetail.condition, tr(car.condition, locale)],
    [t.carDetail.year, String(car.year)],
    [t.carDetail.carType, tr(car.bodyType, locale)],
    [t.carDetail.exteriorColor, tr(car.exteriorColor, locale)],
    [t.carDetail.interiorColor, tr(car.interiorColor, locale)],
    [t.carDetail.option, tr(car.option, locale)],
    [t.carDetail.carOrigin, tr(car.carOrigin, locale)],
  ];

  return (
    <div className="bg-paper">
      <div className="mx-auto max-w-[1360px] px-5 py-6 sm:px-8">
        <nav className="flex items-center gap-2 text-xs text-ink/40">
          <Link to="/" className="hover:text-ink">
            {t.carDetail.home}
          </Link>
          <span>/</span>
          <Link to="/buy" className="hover:text-ink">
            {t.carDetail.buy}
          </Link>
          <span>/</span>
          <span className="text-ink/60">{car.title}</span>
        </nav>
      </div>

      <div className="mx-auto max-w-[1360px] px-5 pb-14 sm:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="relative overflow-hidden rounded-panel bg-sand ring-1 ring-hairline">
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="block w-full cursor-zoom-in"
                aria-label={t.carDetail.viewFullscreen}
              >
                <CarPhoto
                  src={car.gallery[activeImage]!}
                  alt={car.title}
                  className="aspect-[16/10] w-full"
                />
              </button>
              <div className="absolute end-3 bottom-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                {activeImage + 1}/{car.gallery.length}
              </div>
              {!available ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
                  <span className="rounded-full bg-black px-4 py-2 font-display text-sm font-semibold uppercase tracking-[0.14em] text-white ring-1 ring-white/20">
                    {status === "sold" ? t.carDetail.statusSold : t.carDetail.statusReserved}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {car.gallery.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={
                    "shrink-0 overflow-hidden rounded-control ring-1 " +
                    (i === activeImage ? "ring-2 ring-brass" : "ring-hairline")
                  }
                >
                  <CarPhoto
                    src={src}
                    alt={`${car.title} view ${i + 1}`}
                    className="aspect-[4/3] w-20"
                  />
                </button>
              ))}
            </div>

            <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
              <DialogContent className="max-w-[95vw] border-none bg-transparent p-0 shadow-none sm:max-w-[95vw]">
                <DialogTitle className="sr-only">{car.title}</DialogTitle>
                <div className="relative">
                  <img
                    src={car.gallery[activeImage]}
                    alt={car.title}
                    className="max-h-[85vh] w-full rounded-panel object-contain"
                  />
                  {car.gallery.length > 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveImage((i) => (i - 1 + car.gallery.length) % car.gallery.length)
                        }
                        aria-label={t.hero.prevSlide}
                        className="absolute start-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/70 text-white backdrop-blur"
                      >
                        <ChevronLeft className="size-5 rtl:rotate-180" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveImage((i) => (i + 1) % car.gallery.length)}
                        aria-label={t.hero.nextSlide}
                        className="absolute end-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/70 text-white backdrop-blur"
                      >
                        <ChevronRight className="size-5 rtl:rotate-180" />
                      </button>
                    </>
                  ) : null}
                  <div className="absolute inset-x-0 bottom-3 flex justify-center">
                    <span className="rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
                      {activeImage + 1}/{car.gallery.length}
                    </span>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <section className="mt-10">
              <h2 className="font-display text-xl font-semibold tracking-tight">
                {t.carDetail.overview}
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {overviewRows.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between border-b border-line py-2 text-sm"
                  >
                    <span className="text-ink/50">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="font-display text-xl font-semibold tracking-tight">
                {t.carDetail.specifications}
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {specRows.map((spec) => {
                  const Icon = specIcons[spec.label] ?? Cog;
                  return (
                    <div
                      key={spec.label}
                      className="flex items-center gap-3 rounded-control bg-sand p-3 text-sand-fg ring-1 ring-hairline"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brass text-white">
                        <Icon className="size-4" />
                      </span>
                      <div>
                        <div className="text-[11px] text-sand-fg/55">{tr(spec.label, locale)}</div>
                        <div className="text-sm font-medium">{spec.value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="font-display text-xl font-semibold tracking-tight">
                {t.carDetail.inspectionReport}
              </h2>
              <p className="mt-2 max-w-[64ch] text-sm text-ink/55">{t.carDetail.inspectionIntro}</p>

              <div className="mt-4 rounded-panel bg-sand text-sand-fg ring-1 ring-hairline">
                <Accordion type="multiple" defaultValue={["cat-0"]} className="px-3 sm:px-4">
                  {t.carDetail.inspectionCategories.map((category, i) => (
                    <AccordionItem
                      key={category.name}
                      value={`cat-${i}`}
                      className="border-hairline"
                    >
                      <AccordionTrigger className="gap-3 font-display text-sm font-medium text-sand-fg hover:no-underline">
                        <span className="flex flex-1 items-center gap-2.5">
                          <CheckCircle2 className="size-4 shrink-0 text-sand-accent" />
                          {category.name}
                        </span>
                        <span className="shrink-0 text-xs font-normal text-sand-fg/55">
                          {category.items.length} {t.carDetail.inspectionItemsChecked}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-2 ps-6">
                          {category.items.map((item) => (
                            <li
                              key={item}
                              className="flex items-center gap-2 text-sm text-sand-fg/75"
                            >
                              <Check className="size-3.5 shrink-0 text-sand-accent/80" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              <div className="mt-6 flex items-center justify-between rounded-panel bg-panel p-6 text-panel-fg">
                <div>
                  <div className="text-[11px] tracking-[0.2em] text-panel-accent uppercase">
                    {t.carDetail.inspectionReport}
                  </div>
                  <div className="mt-1 font-display text-2xl font-semibold">
                    {formatNumber(car.inspectionScore, locale)}/{formatNumber(100, locale)}
                  </div>
                </div>
                <div className="text-right text-sm text-mist">
                  <div>{car.inspectionCenter}</div>
                  <div>{car.inspectedOn}</div>
                </div>
              </div>
            </section>

            <section className="mt-10">
              <h2 className="font-display text-xl font-semibold tracking-tight">
                {t.carDetail.features}
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {car.highlights.map((h) => (
                  <span
                    key={h}
                    className="rounded-full bg-sand px-3 py-1.5 text-sm text-sand-fg/85 ring-1 ring-hairline"
                  >
                    {tr(h, locale)}
                  </span>
                ))}
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-panel bg-sand p-6 text-sand-fg ring-1 ring-hairline lg:sticky lg:top-6">
            <div className="mb-1 text-[11px] tracking-[0.2em] text-sand-accent uppercase">
              {t.carDetail.idLabel} {car.stock}
            </div>
            <h1 className="text-balance font-display text-2xl font-semibold tracking-tight">
              {car.title}
            </h1>
            <div className="mt-1 text-sm text-sand-fg/65">
              {[car.trim, car.mileageKm > 0 ? `${formatNumber(car.mileageKm, locale)} KM` : null, car.gear_type ? (locale === "ar" ? (car.gear_type === "Manual" ? "يدوي" : "أوتوماتيك") : car.gear_type) : null, tr(car.city, locale)].filter(Boolean).join(" · ")}
            </div>
            {car.neighborhood || car.posted_at || car.source_url ? (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-sand-fg/55">
                {car.neighborhood ? (
                  <span>
                    {locale === "ar" ? "الحي: " : "Neighborhood: "}
                    {car.neighborhood}
                  </span>
                ) : null}
                {car.posted_at ? <span>{postedAgo(car.posted_at, locale)}</span> : null}
                {car.source_url ? (
                  <a
                    href={car.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    {locale === "ar" ? "الإعلان الأصلي" : "Original listing"}
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 ring-1 ring-hairline">
                <CalendarIcon className="size-3.5 text-brass" /> {formatNumber(car.year, locale)}
              </span>
              {transmissionValue ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 ring-1 ring-hairline">
                  <Settings2 className="size-3.5 text-brass" /> {transmissionValue}
                </span>
              ) : null}
            </div>

            <div className="mt-5 flex items-end gap-3">
              {car.wasPrice ? (
                <div className="num text-sm text-sand-fg/55 line-through">
                  {formatSar(car.wasPrice, locale)}
                </div>
              ) : null}
              {discount ? (
                <span className="rounded-full bg-brass px-2 py-0.5 text-[10px] font-medium text-white">
                  {discount}
                </span>
              ) : null}
            </div>
            <div className="text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
              {t.carDetail.cashPrice}
            </div>
            <div className="num font-display text-3xl font-semibold">
              {car.price > 0
                ? formatSar(car.price, locale)
                : locale === "ar"
                  ? "اتصل لمعرفة السعر"
                  : "Contact for price"}
            </div>
            {car.price > 0 && car.monthly > 0 ? (
              <div className="num mt-1 text-sm text-sand-accent">
                {t.carDetail.installmentFrom} {formatSar(car.monthly, locale)}
                {t.carDetail.perMonth}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-1.5">
              {car.badges.map((b) => (
                <span
                  key={b}
                  className="rounded-full bg-hairline px-2.5 py-1 text-[11px] font-medium text-sand-fg/80"
                >
                  ✓ {tr(b, locale)}
                </span>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              {available ? (
                <Link
                  to="/checkout/$carId"
                  params={{ carId: car.id }}
                  className="rounded-control bg-brass px-4 py-3 text-center font-display text-sm font-medium text-white transition-colors hover:bg-brass-2"
                >
                  {t.carDetail.reserveNow}
                </Link>
              ) : (
                <div className="rounded-control bg-panel px-4 py-3 text-center font-display text-sm font-medium text-panel-fg/60">
                  {status === "sold" ? t.carDetail.statusSold : t.carDetail.statusReserved}
                </div>
              )}

              {available ? (
                <BookingDialog
                  leadType="test_drive"
                  carId={car.id}
                  title={t.carDetail.bookTestDriveTitle}
                  description={t.carDetail.bookTestDriveBody}
                  trigger={
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-2 rounded-control bg-paper px-4 py-3 text-center font-display text-sm font-medium text-ink ring-1 ring-hairline-2 transition-colors hover:bg-panel-2"
                    >
                      <CalendarClock className="size-4 text-brass" /> {t.carDetail.bookTestDrive}
                    </button>
                  }
                />
              ) : null}

              <Link
                to="/contact"
                className="flex items-start gap-3 rounded-control bg-paper p-3.5 ring-1 ring-hairline-2 transition-colors hover:bg-panel-2"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brass text-white">
                  <MessageCircle className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{t.carDetail.whatsappTitle}</span>
                  <span className="mt-0.5 block text-xs text-ink/50">
                    {t.carDetail.whatsappBody}
                  </span>
                </span>
              </Link>
              <Link
                to="/contact"
                className="flex items-start gap-3 rounded-control bg-paper p-3.5 ring-1 ring-hairline-2 transition-colors hover:bg-panel-2"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brass text-white">
                  <Phone className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{t.carDetail.callTitle}</span>
                  <span className="mt-0.5 block text-xs text-ink/50">{t.carDetail.callBody}</span>
                </span>
              </Link>
              <Link
                to="/compare"
                search={{ car: car.id }}
                className="flex items-center justify-center gap-2 rounded-control bg-panel px-4 py-3 text-center font-display text-sm font-medium text-panel-fg"
              >
                <Scale className="size-4" /> {t.carDetail.addToCompare}
              </Link>
            </div>

            <div className="mt-5 flex items-center gap-3 border-t border-hairline pt-4 text-xs text-sand-fg/50">
              {car.dealer_store_logo_url ? (
                <img
                  src={car.dealer_store_logo_url}
                  alt={car.dealer_store_name ?? ""}
                  className="size-8 shrink-0 rounded-control object-contain ring-1 ring-hairline"
                />
              ) : null}
              <span>
                {t.carDetail.soldBy}{" "}
                <span className="font-medium text-sand-fg/85">
                  {car.dealer_store_name || tr(car.sellerType, locale)}
                </span>{" "}
                · {t.carDetail.includesVat}
              </span>
            </div>
          </aside>
        </div>

        <section className="mt-14 rounded-panel bg-sand p-6 text-sand-fg ring-1 ring-hairline sm:p-8">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {t.carDetail.loanCalculator}
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-6">
              <label className="block">
                <span className="mb-1.5 flex justify-between text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
                  <span>{t.carDetail.balloonPayment}</span>
                  <span className="num text-sand-fg/75 normal-case">
                    {formatNumber(balloonPct, locale)}% = {formatSar(balloonAmount, locale)}
                  </span>
                </span>
                <input
                  type="range"
                  min={30}
                  max={40}
                  step={5}
                  value={balloonPct}
                  onChange={(e) => setBalloonPct(Number(e.target.value))}
                  className="w-full accent-brass"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 flex justify-between text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
                  <span>{t.carDetail.downPaymentPct}</span>
                  <span className="num text-sand-fg/75 normal-case">
                    {formatNumber(downPct, locale)}% = {formatSar(downPaymentAmount, locale)}
                  </span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={40}
                  step={10}
                  value={downPct}
                  onChange={(e) => setDownPct(Number(e.target.value))}
                  className="w-full accent-brass"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 flex justify-between text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
                  <span>{t.carDetail.loanDuration}</span>
                  <span className="num text-sand-fg/75 normal-case">
                    {formatNumber(years, locale)} {t.carDetail.years}
                  </span>
                </span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="w-full accent-brass"
                />
              </label>

              <div className="flex items-start gap-2 rounded-control bg-paper p-3 text-xs text-ink/50 ring-1 ring-hairline">
                <Info className="size-4 shrink-0 text-brass" />
                {t.carDetail.calculatorNotice}
              </div>
            </div>

            <div>
              <div className="rounded-panel bg-panel p-6 text-panel-fg">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] tracking-[0.14em] text-panel-accent uppercase">
                      {t.carDetail.monthlyInstallment}
                    </div>
                    <div className="num mt-1 font-display text-2xl font-semibold">
                      {formatSar(monthly, locale)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] tracking-[0.14em] text-panel-accent uppercase">
                      {t.carDetail.balloonPaymentAmount}
                    </div>
                    <div className="num mt-1 font-display text-2xl font-semibold">
                      {formatSar(balloonAmount, locale)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-panel bg-paper p-5 ring-1 ring-hairline">
                <div className="mb-3 text-[11px] tracking-[0.14em] text-ink/40 uppercase">
                  {t.carDetail.breakdownHeading}
                </div>
                <BreakdownRow label={t.carDetail.carPrice} value={formatSar(car.price, locale)} />
                <BreakdownRow
                  label={t.carDetail.titleTransferFees}
                  value={formatSar(TITLE_TRANSFER_FEE, locale)}
                />
                <BreakdownRow
                  label={t.carDetail.transportationFees}
                  value={formatSar(TRANSPORTATION_FEE, locale)}
                />
                <BreakdownRow
                  label={t.carDetail.adminHandlingFees}
                  value={formatSar(ADMIN_FEE, locale)}
                />
                <BreakdownRow
                  label={t.carDetail.total}
                  value={formatSar(grandTotal, locale)}
                  emphasis
                />
                <BreakdownRow
                  label={t.carDetail.downPayment}
                  value={formatSar(downPaymentAmount, locale)}
                />
                <BreakdownRow
                  label={t.carDetail.loanDuration}
                  value={`${formatNumber(years, locale)} ${t.carDetail.years}`}
                  last
                />
              </div>
            </div>
          </div>
        </section>

        {related.length ? (
          <section className="mt-14">
            <h2 className="font-display text-xl font-semibold tracking-tight">
              {t.carDetail.similarVehicles}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((c) => (
                <Link
                  key={c.id}
                  to="/cars/$carId"
                  params={{ carId: c.id }}
                  className="overflow-hidden rounded-card bg-sand text-sand-fg ring-1 ring-hairline transition-transform hover:-translate-y-1"
                >
                  <CarPhoto src={c.image} alt={c.title} loading="lazy" className="aspect-[4/3] w-full" />
                  <div className="p-3">
                    <div className="font-display text-sm font-medium">{c.title}</div>
                    <div className="num mt-1 text-sm font-semibold">
                      {formatSar(c.price, locale)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  emphasis,
  last,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={
        "num flex items-center justify-between py-2 text-sm " +
        (last ? "" : "border-b border-line") +
        (emphasis ? " font-semibold" : " text-ink/70")
      }
    >
      <span className={emphasis ? "font-semibold text-ink" : ""}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function postedAgo(iso: string, locale: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  const [n, en, ar] =
    mins < 60
      ? [mins, "m", "دقيقة"]
      : mins < 1440
        ? [Math.floor(mins / 60), "h", "ساعة"]
        : [Math.floor(mins / 1440), "d", "يوم"];
  return locale === "ar" ? `نُشر منذ ${n} ${ar}` : `Posted ${n}${en} ago`;
}
