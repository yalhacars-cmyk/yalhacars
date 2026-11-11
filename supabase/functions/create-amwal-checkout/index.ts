// Creates a single-use Amwal Tech payment link server-side — this requires
// the merchant Secret Key, which must never ship inside the app — and hands
// the app back just the hosted checkout URL to open in a WebView.
//
// Amwal REST reference: https://docs.amwal.tech/api-reference/create-installment-link
// and https://docs.amwal.tech/custom-integration/web-view-integration.
//
// Also records the resulting payment_link_id onto the reservation
// (`set_reservation_provider_ref`, service_role only — see
// supabase/schema_v3.sql) so `verify-amwal-payment` and the order-status page
// both know which Amwal payment link this reservation is waiting on.
//
// Deploy: supabase functions deploy create-amwal-checkout
// Configure (from the Amwal Merchant Dashboard's Integration tab):
//   supabase secrets set AMWAL_SECRET_KEY=... AMWAL_PUBLIC_KEY=sandbox-amwal-... AMWAL_STORE_ID=...

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const AMWAL_BASE_URL = Deno.env.get("AMWAL_BASE_URL") ?? "https://backend.sa.amwal.tech";
const AMWAL_SECRET_KEY = Deno.env.get("AMWAL_SECRET_KEY") ?? "";
const AMWAL_PUBLIC_KEY = Deno.env.get("AMWAL_PUBLIC_KEY") ?? "";
const AMWAL_STORE_ID = Deno.env.get("AMWAL_STORE_ID") ?? "";

// Amwal Tech won't create a payment link below this amount.
const AMWAL_MINIMUM_SAR = 300;

/// Normalizes a Saudi mobile number to E.164 (+9665XXXXXXXX). Accepts
/// "+9665...", "9665...", "05..." and "5..." — returns undefined for
/// anything that doesn't look like a Saudi mobile number.
function normalizeSaudiPhone(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (/^\+9665\d{8}$/.test(trimmed)) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (/^9665\d{8}$/.test(digits)) return `+${digits}`;
  if (/^05\d{8}$/.test(digits)) return `+966${digits.slice(1)}`;
  if (/^5\d{8}$/.test(digits)) return `+966${digits}`;
  return undefined;
}

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!AMWAL_SECRET_KEY || !AMWAL_PUBLIC_KEY || !AMWAL_STORE_ID) {
    return jsonResponse({ error: "Amwal is not configured" }, 500);
  }

  let body: {
    amount?: number;
    title?: string;
    orderId?: string;
    customerFirstName?: string;
    customerPhone?: string;
    customerEmail?: string;
    language?: string;
    callbackUrl?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const {
    amount,
    title,
    orderId,
    customerFirstName,
    customerPhone,
    customerEmail,
    language = "en",
    callbackUrl,
  } = body;

  if (!amount || amount < AMWAL_MINIMUM_SAR) {
    return jsonResponse({ error: `amount must be at least ${AMWAL_MINIMUM_SAR} SAR` }, 400);
  }
  if (!title) {
    return jsonResponse({ error: "title is required" }, 400);
  }

  // Amwal's live API rejects requests missing `orderNumber` / `phone`
  // (confirmed empirically — the published docs call these `order_id` and
  // `client_phone_number` and mark them optional, which doesn't match).
  // `phone` also has to be a real number for the SMS OTP step to work, so
  // fall back to a placeholder Saudi number rather than fail the whole
  // checkout when the caller didn't collect one (e.g. the reservation flow).
  const orderNumber = orderId ?? `YAL-${Date.now()}`;
  const phone = normalizeSaudiPhone(customerPhone) ?? "+966500000000";

  try {
    const res = await fetch(`${AMWAL_BASE_URL}/payment_links/${AMWAL_STORE_ID}/create`, {
      method: "POST",
      headers: {
        Authorization: AMWAL_SECRET_KEY,
        "X-Amwal-Key": AMWAL_PUBLIC_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        title,
        singleUse: true,
        orderNumber,
        phone,
        firstName: customerFirstName,
        email: customerEmail,
        // Confirmed against a real sandbox link (echoed back as
        // `callback_url` in payment_link details): the payment page's own
        // bundle reads this off the link record and, when NOT opened as a
        // popup/iframe (no window.opener / window.top mismatch), does
        // `window.location.href = <that url>` after payment instead of
        // just showing its own success screen — that's what makes a
        // same-tab redirect-back flow possible.
        callback_url: callbackUrl,
        // Keep the documented snake_case names too, in case the backend
        // reads either convention depending on route/version.
        order_id: orderId,
        client_first_name: customerFirstName,
        client_phone_number: phone,
        client_email: customerEmail,
        language,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return jsonResponse(
        {
          error: data?.error ?? data?.message ?? `Amwal request failed (${res.status})`,
          amwalResponse: data,
        },
        502,
      );
    }

    // customerPhone (raw, as the caller sent it) is used here rather than
    // the Amwal-normalized `phone` above — it has to match the reservation
    // row's `phone` column exactly for this RPC's ownership check to pass.
    if (data.payment_link_id && customerPhone) {
      const { error } = await supabaseAdmin.rpc("set_reservation_provider_ref", {
        p_order_number: orderNumber,
        p_phone: customerPhone,
        p_provider_ref: data.payment_link_id,
      });
      if (error) {
        return jsonResponse(
          { error: `Failed to record payment link on reservation: ${error.message}` },
          500,
        );
      }
    }

    return jsonResponse({
      paymentLinkId: data.payment_link_id,
      url: data.url,
      environment: data.environment,
      orderNumber,
    });
  } catch (error) {
    return jsonResponse({ error: String(error) }, 500);
  }
});
