import { createFileRoute, Link } from "@tanstack/react-router";
import { PackageSearch, SearchX } from "lucide-react";
import { useState } from "react";
import { OrderStatus } from "@/components/OrderStatus";
import { lookupReservation, type Reservation } from "@/data/reservations";
import { useT } from "@/lib/i18n/context";

export const Route = createFileRoute("/track-order")({
  head: () => ({
    meta: [
      { title: "Track Your Order — Yalhacar" },
      { name: "description", content: "Track the status of your Yalhacar order." },
    ],
  }),
  component: TrackOrderPage,
});

function TrackOrderPage() {
  const t = useT();
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await lookupReservation(orderNumber, phone);
      setReservation(result);
    } finally {
      setSearched(true);
      setLoading(false);
    }
  };

  if (reservation) {
    return (
      <div className="bg-paper">
        <div className="mx-auto max-w-[1360px] px-5 py-10 sm:px-8 sm:py-14">
          <OrderStatus reservation={reservation} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-paper">
      <div className="mx-auto max-w-[640px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-brass text-white">
            <PackageSearch className="size-6" />
          </div>
          <div className="mb-2 text-[11px] tracking-[0.2em] text-brass uppercase">
            {t.trackOrder.eyebrow}
          </div>
          <h1 className="text-balance font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {t.trackOrder.heading}
          </h1>
          <p className="mt-2 text-sm text-ink/55">{t.trackOrder.subtitle}</p>
        </div>

        <form
          className="space-y-4 rounded-panel bg-sand p-6 text-sand-fg ring-1 ring-hairline sm:p-8"
          onSubmit={onSubmit}
        >
          <label className="block">
            <span className="mb-1.5 block text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
              {t.trackOrder.orderNumberLabel}
            </span>
            <input
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder={t.trackOrder.orderNumberPlaceholder}
              className="w-full rounded-control bg-paper px-3 py-2.5 text-sm outline-none ring-1 ring-hairline placeholder:text-ink/30"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] tracking-[0.1em] text-sand-fg/55 uppercase">
              {t.trackOrder.contactLabel}
            </span>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.trackOrder.contactPlaceholder}
              className="w-full rounded-control bg-paper px-3 py-2.5 text-sm outline-none ring-1 ring-hairline placeholder:text-ink/30"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-control bg-panel px-4 py-3.5 text-center font-display text-sm font-medium text-panel-fg disabled:opacity-60"
          >
            {t.trackOrder.submitButton}
          </button>
        </form>

        {searched && !reservation ? (
          <div className="mt-6 rounded-panel bg-panel p-6 text-center text-panel-fg">
            <SearchX className="mx-auto size-8 text-panel-accent" />
            <div className="mt-3 font-display text-base font-medium">
              {t.trackOrder.notFoundTitle}
            </div>
            <p className="mt-1.5 text-sm text-mist">{t.trackOrder.notFoundBody}</p>
            <Link
              to="/contact"
              className="mt-4 inline-block text-sm font-medium text-panel-accent hover:underline"
            >
              {t.trackOrder.contactSupport}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
