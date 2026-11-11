import { useEffect, useRef } from "react";
import { loadMoyasarForm } from "@/lib/payments/moyasarForm";

/**
 * Renders Moyasar's embeddable card form in place (see
 * src/lib/payments/moyasarForm.ts). The widget owns the whole payment flow
 * from here — including any 3D Secure step — and finishes by redirecting
 * the whole page to `callbackUrl`, which is why there's no onSuccess prop:
 * the order-status page at that URL is what verifies and confirms the
 * payment (see routes/orders.$orderNumber.tsx), never this component.
 */
export function MoyasarPayForm({
  amountSar,
  description,
  callbackUrl,
  publishableKey,
  locale,
}: {
  amountSar: number;
  description: string;
  callbackUrl: string;
  publishableKey: string | undefined;
  locale: "en" | "ar";
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!publishableKey) return;
    let cancelled = false;
    loadMoyasarForm().then(() => {
      if (cancelled || !containerRef.current || !window.Moyasar) return;
      window.Moyasar.init({
        element: containerRef.current,
        amount: Math.round(amountSar * 100),
        currency: "SAR",
        description,
        publishable_api_key: publishableKey,
        callback_url: callbackUrl,
        language: locale,
        methods: ["creditcard"],
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publishableKey]);

  if (!publishableKey) {
    return (
      <p className="rounded-control bg-destructive/15 px-3 py-2 text-sm text-destructive">
        Card payments aren&apos;t configured yet (missing VITE_MOYASAR_PUBLISHABLE_KEY).
      </p>
    );
  }

  return <div ref={containerRef} />;
}
