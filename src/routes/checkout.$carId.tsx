import { CarPhoto } from "@/components/CarPhoto";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import {
  Banknote,
  Building2,
  Check,
  CreditCard,
  Info,
  Landmark,
  MapPin,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { MoyasarPayForm } from "@/components/MoyasarPayForm";
import { CITIES, getCar, isAvailable } from "@/data/cars";
import { FINANCE_PARTNERS, partnerLogo } from "@/data/financePartners";
import {
  CarUnavailableError,
  createReservation,
  type DeliveryType,
  type PaymentMethod,
  type Reservation,
} from "@/data/reservations";
import { useLocale, useT } from "@/lib/i18n/context";
import { formatNumber, formatSar } from "@/lib/i18n/dictionary";
import { paymentMethodLabel } from "@/lib/paymentMethod";
import { createAmwalCheckout } from "@/lib/payments/edgeFunctions";
import { cn } from "@/lib/utils";

const tabby = FINANCE_PARTNERS.find((p) => p.name.en === "Tabby")!;
const tamara = FINANCE_PARTNERS.find((p) => p.name.en === "Tamara")!;

export const Route = createFileRoute("/checkout/$carId")({
  loader: async ({ params }) => {
    const car = await getCar(params.carId);
    if (!car) throw notFound();
    return car;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `Checkout — ${loaderData.title} | Yalhacar` : "Checkout — Yalhacar" },
    ],
  }),
  component: CheckoutPage,
});

const RESERVATION_PCT = 0.05;
const RESERVATION_MIN = 1000;

function reservationAmount(price: number) {
  return Math.max(RESERVATION_MIN, Math.round((price * RESERVATION_PCT) / 100) * 100);
}

function CheckoutPage() {
  const car = Route.useLoaderData();
  const t = useT();
  const { locale } = useLocale();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [deliveryType, setDeliveryType] = useState<DeliveryType>("delivery");
  const [city, setCity] = useState(car.city);
  const [addressLine, setAddressLine] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("moyasar");
  const [reservation, setReservation] = useState<Reservation | null>(null);

  const amount = reservationAmount(car.price);
  const steps = t.checkout.steps;

  if (!isAvailable(car)) {
    return (
      <div className="bg-paper">
        <div className="mx-auto max-w-[600px] px-5 py-20 text-center sm:px-8">
          <h1 className="font-display text-2xl font-semibold">{t.checkout.unavailableTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t.checkout.unavailableBody}</p>
          <Link
            to="/buy"
            className="mt-6 inline-block rounded-control bg-brass px-5 py-3 font-display text-sm font-medium text-white"
          >
            {t.checkout.browseCars}
          </Link>
        </div>
      </div>
    );
  }

  const step2Valid = name.trim() && phone.trim();
  const step3Valid = deliveryType === "pickup" || (city.trim() && addressLine.trim());

  const goToOrderStatus = (orderNumber: string, paid?: "amwal") =>
    navigate({
      to: "/orders/$orderNumber",
      params: { orderNumber },
      search: { phone: phone.trim(), ...(paid ? { paid } : {}) },
    });

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Reused across retries: once the car is locked to this reservation,
      // clicking submit again shouldn't try to create a second one (that
      // would fail — the car is no longer `available`).
      const current =
        reservation ??
        (await createReservation({
          carId: car.id,
          name: name.trim(),
          phone: phone.trim(),
          ...(email.trim() ? { email: email.trim() } : {}),
          amount,
          paymentMethod,
          deliveryType,
          ...(deliveryType === "delivery"
            ? { address: { city: city.trim(), line: addressLine.trim() } }
            : {}),
        }));
      if (!reservation) setReservation(current);

      if (paymentMethod === "moyasar") {
        // Rendered below in place of this button once `reservation` is set
        // — Moyasar's own card form takes over from there.
        return;
      }
      if (paymentMethod === "amwal") {
        const callbackUrl = `${window.location.origin}/orders/${current.order_number}?phone=${encodeURIComponent(phone.trim())}&paid=amwal`;
        const { url } = await createAmwalCheckout({
          amount: current.amount,
          title: `Yalhacar reservation ${current.order_number}`,
          orderId: current.order_number,
          orderNumber: current.order_number,
          phone: phone.trim(),
          customerFirstName: name.trim().split(/\s+/)[0] ?? "",
          customerPhone: phone.trim(),
          ...(email.trim() ? { customerEmail: email.trim() } : {}),
          language: locale,
          callbackUrl,
        });
        // Same-tab: Amwal's payment page redirects back to `callbackUrl`
        // once payment completes, as long as it's opened as a plain
        // navigation (not window.open/an iframe — those get a postMessage
        // instead, per Amwal's own page code).
        window.location.href = url;
        return;
      }
      goToOrderStatus(current.order_number);
    } catch (err) {
      if (err instanceof CarUnavailableError) {
        setError(t.checkout.justReserved);
        setTimeout(() => navigate({ to: "/buy" }), 2500);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-paper">
      <div className="mx-auto max-w-[1100px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-6">
          <div className="mb-2 text-[11px] tracking-[0.2em] text-brass uppercase">
            {t.checkout.eyebrow}
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {t.checkout.heading}
          </h1>
        </div>

        <div className="mb-8 flex items-center gap-2">
          {steps.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                  i + 1 <= step
                    ? "bg-brass text-white"
                    : "bg-sand text-sand-fg/50 ring-1 ring-hairline",
                )}
              >
                {i + 1 < step ? <Check className="size-3.5" /> : formatNumber(i + 1, locale)}
              </div>
              <span
                className={cn(
                  "hidden text-xs sm:inline",
                  i + 1 === step ? "text-ink" : "text-ink/40",
                )}
              >
                {label}
              </span>
              {i < steps.length - 1 ? <div className="h-px flex-1 bg-line" /> : null}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-panel bg-sand p-6 text-sand-fg ring-1 ring-hairline sm:p-8">
            {step === 1 ? (
              <div>
                <h2 className="font-display text-lg font-semibold">{t.checkout.step1Heading}</h2>
                <div className="mt-4 flex gap-4 rounded-control bg-paper p-4 ring-1 ring-hairline">
                  <CarPhoto
                    src={car.image}
                    alt={car.title}
                    className="size-24 shrink-0 rounded-control"
                  />
                  <div>
                    <div className="font-display text-base font-medium text-ink">{car.title}</div>
                    <div className="mt-1 text-xs text-ink/50">
                      {formatNumber(car.year, locale)} · {formatNumber(car.mileageKm, locale)} km ·{" "}
                      {car.city}
                    </div>
                    <div className="num mt-2 font-display text-lg font-semibold text-ink">
                      {formatSar(car.price, locale)}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <h2 className="font-display text-lg font-semibold">{t.checkout.step2Heading}</h2>
                <div className="mt-4 grid grid-cols-1 gap-3">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.checkout.nameLabel}
                    className="w-full rounded-control bg-paper px-3 py-2.5 text-sm text-ink outline-none ring-1 ring-hairline"
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t.checkout.phoneLabel}
                      className="w-full rounded-control bg-paper px-3 py-2.5 text-sm text-ink outline-none ring-1 ring-hairline"
                    />
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.checkout.emailLabel}
                      type="email"
                      className="w-full rounded-control bg-paper px-3 py-2.5 text-sm text-ink outline-none ring-1 ring-hairline"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div>
                <h2 className="font-display text-lg font-semibold">{t.checkout.step3Heading}</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryType("delivery")}
                    className={cn(
                      "flex items-center gap-2 rounded-control p-3 text-sm ring-1",
                      deliveryType === "delivery"
                        ? "bg-brass text-white ring-brass"
                        : "bg-paper text-ink/70 ring-hairline",
                    )}
                  >
                    <Truck className="size-4" /> {t.checkout.delivery}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryType("pickup")}
                    className={cn(
                      "flex items-center gap-2 rounded-control p-3 text-sm ring-1",
                      deliveryType === "pickup"
                        ? "bg-brass text-white ring-brass"
                        : "bg-paper text-ink/70 ring-hairline",
                    )}
                  >
                    <MapPin className="size-4" /> {t.checkout.pickup}
                  </button>
                </div>

                {deliveryType === "delivery" ? (
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-control bg-paper px-3 py-2.5 text-sm text-ink outline-none ring-1 ring-hairline"
                    >
                      {CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <input
                      value={addressLine}
                      onChange={(e) => setAddressLine(e.target.value)}
                      placeholder={t.checkout.addressLabel}
                      className="w-full rounded-control bg-paper px-3 py-2.5 text-sm text-ink outline-none ring-1 ring-hairline"
                    />
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-sand-fg/60">{t.checkout.pickupNotice}</p>
                )}

                <h3 className="mt-6 font-display text-sm font-semibold">
                  {t.checkout.paymentHeading}
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <PaymentOption
                    icon={Banknote}
                    active={paymentMethod === "cash_on_delivery"}
                    label={t.checkout.cashOnDelivery}
                    onClick={() => setPaymentMethod("cash_on_delivery")}
                  />
                  <PaymentOption
                    icon={Building2}
                    active={paymentMethod === "bank_transfer"}
                    label={t.checkout.bankTransfer}
                    onClick={() => setPaymentMethod("bank_transfer")}
                  />
                  <PaymentOption
                    icon={CreditCard}
                    active={paymentMethod === "moyasar"}
                    label={t.checkout.moyasar}
                    onClick={() => setPaymentMethod("moyasar")}
                  />
                  <PaymentOption
                    icon={Landmark}
                    active={paymentMethod === "amwal"}
                    label={t.checkout.amwal}
                    comingSoon
                    onClick={() => setPaymentMethod("amwal")}
                  />
                  <PaymentOption
                    logo={partnerLogo(tabby, locale)}
                    active={paymentMethod === "tabby"}
                    label="Tabby"
                    comingSoon
                    onClick={() => setPaymentMethod("tabby")}
                  />
                  <PaymentOption
                    logo={partnerLogo(tamara, locale)}
                    active={paymentMethod === "tamara"}
                    label="Tamara"
                    comingSoon
                    onClick={() => setPaymentMethod("tamara")}
                  />
                </div>
                <div className="mt-3 flex items-start gap-2 rounded-control bg-paper p-3 text-xs text-ink/50 ring-1 ring-hairline">
                  <Info className="size-4 shrink-0 text-brass" /> {t.checkout.demoNotice}
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div>
                <h2 className="font-display text-lg font-semibold">{t.checkout.step4Heading}</h2>
                <div className="mt-4 space-y-2 text-sm">
                  <ReviewRow label={t.checkout.nameLabel} value={name} />
                  <ReviewRow label={t.checkout.phoneLabel} value={phone} />
                  <ReviewRow
                    label={t.checkout.deliveryHeading}
                    value={
                      deliveryType === "delivery"
                        ? `${t.checkout.delivery} · ${city}`
                        : t.checkout.pickup
                    }
                  />
                  <ReviewRow
                    label={t.checkout.paymentHeading}
                    value={paymentMethodLabel(paymentMethod, t)}
                  />
                  <ReviewRow
                    label={t.checkout.reservationAmount}
                    value={formatSar(amount, locale)}
                    emphasis
                  />
                </div>
                <p className="mt-4 text-xs text-sand-fg/50">{t.checkout.termsNotice}</p>
                {error ? (
                  <div className="mt-4 rounded-control bg-destructive/15 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}
                {reservation && paymentMethod === "moyasar" ? (
                  <div className="mt-4">
                    <MoyasarPayForm
                      amountSar={reservation.amount}
                      description={`Yalhacar reservation ${reservation.order_number}`}
                      callbackUrl={`${window.location.origin}/orders/${reservation.order_number}?phone=${encodeURIComponent(phone.trim())}&paid=moyasar`}
                      publishableKey={import.meta.env["VITE_MOYASAR_PUBLISHABLE_KEY"]}
                      locale={locale}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {reservation && paymentMethod === "moyasar" ? null : (
              <div className="mt-8 flex items-center justify-between">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => s - 1)}
                    className="rounded-control bg-paper px-4 py-2.5 text-sm font-medium text-ink ring-1 ring-hairline"
                  >
                    {t.checkout.back}
                  </button>
                ) : (
                  <span />
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    disabled={(step === 2 && !step2Valid) || (step === 3 && !step3Valid)}
                    onClick={() => setStep((s) => s + 1)}
                    className="rounded-control bg-brass px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {t.checkout.continueButton}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={submit}
                    className="rounded-control bg-brass px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {submitting
                      ? paymentMethod === "amwal"
                        ? t.checkout.openingPaymentPage
                        : t.checkout.submitting
                      : t.checkout.confirmButton}
                  </button>
                )}
              </div>
            )}
          </div>

          <aside className="h-fit rounded-panel bg-panel p-6 text-panel-fg">
            <div className="text-[11px] tracking-[0.14em] text-panel-accent uppercase">
              {t.checkout.reservationAmount}
            </div>
            <div className="num mt-1 font-display text-2xl font-semibold">
              {formatSar(amount, locale)}
            </div>
            <p className="mt-2 text-xs text-mist">{t.checkout.reservationNote}</p>
          </aside>
        </div>
      </div>
    </div>
  );
}

function PaymentOption({
  icon: Icon,
  logo,
  active,
  label,
  sublabel,
  comingSoon,
  onClick,
}: {
  icon?: typeof Banknote;
  logo?: string;
  active: boolean;
  label: string;
  sublabel?: string;
  comingSoon?: boolean;
  onClick: () => void;
}) {
  const { locale } = useLocale();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={comingSoon}
      aria-disabled={comingSoon}
      className={cn(
        "flex flex-col items-start gap-2 rounded-control p-3 text-sm ring-1 transition-colors",
        comingSoon && "cursor-not-allowed opacity-50",
        active
          ? "bg-brass text-white ring-brass"
          : "bg-paper text-ink/70 ring-hairline hover:bg-panel-2",
      )}
    >
      {logo ? (
        <span className="grid h-6 place-items-center rounded-[4px] bg-white px-1.5">
          <img src={logo} alt={label} className="h-4 w-auto object-contain" />
        </span>
      ) : Icon ? (
        <Icon className="size-4" />
      ) : null}
      <span>
        <span className="block font-medium">{label}</span>
        {comingSoon ? (
          <span className="block text-xs text-ink/45">
            {locale === "ar" ? "قريباً" : "Available soon"}
          </span>
        ) : sublabel ? (
          <span className={cn("block text-xs", active ? "text-white/75" : "text-ink/45")}>
            {sublabel}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function ReviewRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-hairline py-2">
      <span className="text-sand-fg/55">{label}</span>
      <span className={cn(emphasis && "font-display text-base font-semibold")}>{value}</span>
    </div>
  );
}
