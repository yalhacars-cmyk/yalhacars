/**
 * Thin client for the three Supabase Edge Functions in supabase/functions/
 * that do the actual gateway integration (they alone hold the Moyasar/Amwal
 * secret keys). Plain fetch rather than supabase-js's `functions.invoke` so
 * a non-2xx response's own `{ error }` body is easy to surface — invoke()
 * otherwise buries it behind a generic FunctionsHttpError.
 */

const FUNCTIONS_URL = `${import.meta.env["VITE_SUPABASE_URL"]}/functions/v1`;
const ANON_KEY = import.meta.env["VITE_SUPABASE_ANON_KEY"];

async function invokeFn<T>(name: string, body: unknown): Promise<T> {
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error ?? `${name} failed (${res.status})`);
  }
  return json as T;
}

export function verifyMoyasarPayment(input: {
  paymentId: string;
  orderNumber: string;
  expectedAmount: number;
  expectedCurrency?: string;
}): Promise<{ verified: boolean; status?: string; id?: string; error?: string }> {
  return invokeFn("verify-moyasar-payment", input);
}

export function createAmwalCheckout(input: {
  amount: number;
  title: string;
  orderId: string;
  orderNumber: string;
  phone: string;
  customerFirstName?: string;
  customerPhone?: string;
  customerEmail?: string;
  language?: string;
  /** Amwal redirects the browser back here after payment, confirmed against
   *  a real sandbox link — same-tab flow, as long as the payment page is
   *  opened as a plain navigation (not window.open / an iframe). */
  callbackUrl?: string;
}): Promise<{ paymentLinkId: string; url: string; environment?: string }> {
  return invokeFn("create-amwal-checkout", input);
}

export function verifyAmwalPayment(input: {
  paymentLinkId: string;
  orderNumber: string;
  expectedAmount?: number;
}): Promise<{ verified: boolean; status?: string; error?: string }> {
  return invokeFn("verify-amwal-payment", input);
}
