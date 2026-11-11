import { Link } from "@tanstack/react-router";
import { Check, Circle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getCar, type Car } from "@/data/cars";
import type { Reservation } from "@/data/reservations";
import { useLocale, useT } from "@/lib/i18n/context";
import { formatSar } from "@/lib/i18n/dictionary";
import { paymentMethodLabel } from "@/lib/paymentMethod";
import { cn } from "@/lib/utils";

export function OrderStatus({ reservation }: { reservation: Reservation }) {
  const t = useT();
  const { locale } = useLocale();
  const [car, setCar] = useState<Car | null>(null);

  useEffect(() => {
    getCar(reservation.car_id).then((c) => setCar(c ?? null));
  }, [reservation.car_id]);

  const statusLabel =
    reservation.status === "pending"
      ? t.orderStatus.statusPending
      : reservation.status === "confirmed"
        ? t.orderStatus.statusConfirmed
        : reservation.status === "cancelled"
          ? t.orderStatus.statusCancelled
          : t.orderStatus.statusExpired;

  const timelineSteps = [
    t.orderStatus.timelineReserved,
    t.orderStatus.timelineDocuments,
    t.orderStatus.timelinePayment,
    t.orderStatus.timelineTransfer,
    t.orderStatus.timelinePreparation,
    t.orderStatus.timelineDelivery,
  ];
  // Reserved is always real/complete. Confirmed unlocks the next two
  // illustrative steps (documents + payment) — everything past that is shown
  // as upcoming, since we don't track that level of operational detail yet.
  const completedCount = reservation.status === "confirmed" ? 3 : 1;

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="rounded-panel bg-sand p-6 text-sand-fg ring-1 ring-hairline sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] tracking-[0.14em] text-sand-fg/55 uppercase">
              {t.orderStatus.orderNumberLabel}
            </div>
            <div className="num font-display text-xl font-semibold">{reservation.order_number}</div>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em]",
              reservation.status === "confirmed" && "bg-brass text-white",
              reservation.status === "pending" && "bg-panel-2 text-panel-fg",
              (reservation.status === "cancelled" || reservation.status === "expired") &&
                "bg-destructive/20 text-destructive",
            )}
          >
            {statusLabel}
          </span>
        </div>

        {reservation.status === "cancelled" || reservation.status === "expired" ? (
          <div className="mt-5 flex items-center gap-2 rounded-control bg-paper p-3 text-sm text-ink/70 ring-1 ring-hairline">
            <XCircle className="size-4 shrink-0 text-destructive" /> {t.orderStatus.cancelledNotice}
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {timelineSteps.map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full",
                    i < completedCount
                      ? "bg-brass text-white"
                      : "bg-paper text-sand-fg/30 ring-1 ring-hairline",
                  )}
                >
                  {i < completedCount ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Circle className="size-2.5" />
                  )}
                </span>
                <span
                  className={cn("text-sm", i < completedCount ? "text-sand-fg" : "text-sand-fg/40")}
                >
                  {step}
                </span>
              </div>
            ))}
            {reservation.status === "pending" ? (
              <p className="pt-1 text-xs text-sand-fg/50">{t.orderStatus.pendingNotice}</p>
            ) : null}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-2 border-t border-hairline pt-4 text-sm sm:grid-cols-2">
          {car ? <Row label={t.orderStatus.vehicleLabel} value={car.title} /> : null}
          <Row label={t.orderStatus.amountLabel} value={formatSar(reservation.amount, locale)} />
          <Row
            label={t.orderStatus.paymentLabel}
            value={paymentMethodLabel(reservation.payment_method, t)}
          />
          <Row
            label={t.orderStatus.deliveryLabel}
            value={
              reservation.delivery_type === "delivery" ? t.checkout.delivery : t.checkout.pickup
            }
          />
        </div>
      </div>

      <div className="mt-4 text-center">
        <Link to="/" className="text-sm text-ink/50 hover:text-ink">
          {t.orderStatus.backHome}
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink/50">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
