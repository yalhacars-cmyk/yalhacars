import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { OrderStatus } from "@/components/OrderStatus";
import { lookupReservation, type Reservation } from "@/data/reservations";
import { useT } from "@/lib/i18n/context";
import { verifyAmwalPayment, verifyMoyasarPayment } from "@/lib/payments/edgeFunctions";

export const Route = createFileRoute("/orders/$orderNumber")({
  validateSearch: z.object({
    phone: z.string().optional(),
    // Set right after a payment attempt, so this page knows to actively
    // verify/confirm instead of just showing whatever status the
    // reservation already has.
    paid: z.enum(["moyasar", "amwal"]).optional(),
    // Moyasar appends this to callback_url itself once payment completes.
    id: z.string().optional(),
  }),
  head: () => ({ meta: [{ title: "Your order — Yalhacar" }] }),
  component: OrderConfirmationPage,
});

const AMWAL_POLL_ATTEMPTS = 10;
const AMWAL_POLL_INTERVAL_MS = 3000;

function OrderConfirmationPage() {
  const { orderNumber } = Route.useParams();
  const search = Route.useSearch();
  const t = useT();

  const [phoneInput, setPhoneInput] = useState("");
  const [reservation, setReservation] = useState<Reservation | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const pollCancelled = useRef(false);

  const lookup = async (phone: string) => {
    setError(null);
    try {
      const result = await lookupReservation(orderNumber, phone);
      setReservation(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  };

  useEffect(() => {
    pollCancelled.current = false;
    return () => {
      pollCancelled.current = true;
    };
  }, [orderNumber]);

  useEffect(() => {
    if (!search.phone) return;
    (async () => {
      const result = await lookup(search.phone!);
      if (!result || result.status !== "pending") return;

      if (search.paid === "moyasar" && result.payment_method === "moyasar" && search.id) {
        setConfirming(true);
        try {
          await verifyMoyasarPayment({
            paymentId: search.id,
            orderNumber,
            expectedAmount: Math.round(result.amount * 100),
            expectedCurrency: "SAR",
          });
          if (!pollCancelled.current) await lookup(search.phone!);
        } finally {
          if (!pollCancelled.current) setConfirming(false);
        }
      } else if (search.paid === "amwal" && result.payment_method === "amwal") {
        // create-amwal-checkout stores the payment link id as provider_ref
        // right after creating it — poll verify-amwal-payment (which also
        // confirms the reservation on a "Paid" status) until it lands.
        setConfirming(true);
        let current = result;
        for (let i = 0; i < AMWAL_POLL_ATTEMPTS && !pollCancelled.current; i++) {
          if (current.provider_ref) {
            try {
              await verifyAmwalPayment({
                paymentLinkId: current.provider_ref,
                orderNumber,
                expectedAmount: current.amount,
              });
            } catch {
              // transient — keep polling
            }
          }
          const polled = await lookup(search.phone!);
          if (!polled || polled.status !== "pending") break;
          current = polled;
          if (i < AMWAL_POLL_ATTEMPTS - 1) {
            await new Promise((r) => setTimeout(r, AMWAL_POLL_INTERVAL_MS));
          }
        }
        if (!pollCancelled.current) setConfirming(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber, search.phone, search.paid, search.id]);

  if (search.phone && reservation === undefined) {
    return (
      <div className="bg-paper">
        <div className="mx-auto max-w-[600px] px-5 py-20 text-center sm:px-8">
          <p className="text-sm text-muted-foreground">…</p>
        </div>
      </div>
    );
  }

  if (reservation) {
    return (
      <div className="bg-paper">
        <div className="mx-auto max-w-[1360px] px-5 py-10 sm:px-8 sm:py-14">
          {confirming ? (
            <div className="mx-auto mb-4 max-w-[720px] rounded-control bg-brass/10 px-4 py-3 text-center text-sm text-brass-2">
              {t.checkout.confirmingPayment}
            </div>
          ) : null}
          <OrderStatus reservation={reservation} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-paper">
      <div className="mx-auto max-w-[480px] px-5 py-20 sm:px-8">
        <div className="mb-2 text-[11px] tracking-[0.2em] text-brass uppercase">
          {t.orderStatus.orderNumberLabel}
        </div>
        <div className="num mb-6 font-display text-2xl font-semibold">{orderNumber}</div>
        <p className="mb-4 text-sm text-muted-foreground">{t.trackOrder.subtitle}</p>
        <div className="flex gap-2">
          <input
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder={t.trackOrder.contactPlaceholder}
            className="w-full rounded-control bg-sand px-3 py-2.5 text-sm text-sand-fg outline-none ring-1 ring-hairline"
          />
          <button
            type="button"
            onClick={() => lookup(phoneInput)}
            className="shrink-0 rounded-control bg-brass px-4 py-2.5 text-sm font-medium text-white"
          >
            {t.trackOrder.submitButton}
          </button>
        </div>
        {reservation === null || error ? (
          <div className="mt-6 rounded-control bg-sand p-5 text-sm text-sand-fg/70 ring-1 ring-hairline">
            {error ?? t.trackOrder.notFoundBody}
          </div>
        ) : null}
      </div>
    </div>
  );
}
