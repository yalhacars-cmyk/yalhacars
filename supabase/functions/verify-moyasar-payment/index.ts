// Confirms a Moyasar payment server-side before the app treats an order as
// paid. Moyasar's Payment Form (moyasar.js) charges the card directly from
// the browser using the publishable key, so this function — which alone
// holds the secret key — is the only trustworthy source of truth for
// whether the money actually moved. See https://docs.moyasar.com/get-your-api-keys
// and https://docs.moyasar.com/api/payments/01-create.
//
// On a verified payment (or a definitively failed one) this also applies the
// result to the reservation via the `confirm_reservation_paid` /
// `fail_reservation_payment` RPCs, using the service-role key Supabase
// injects into every Edge Function automatically. Those RPCs are granted to
// `service_role` only (see supabase/schema_v3.sql) specifically so that this
// verification step can't be skipped by calling them straight from a
// browser.
//
// Deploy: supabase functions deploy verify-moyasar-payment
// Configure: supabase secrets set MOYASAR_SECRET_KEY=sk_live_...

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

const MOYASAR_SECRET_KEY = Deno.env.get("MOYASAR_SECRET_KEY") ?? "";
const MOYASAR_BASE_URL = Deno.env.get("MOYASAR_BASE_URL") ?? "https://api.moyasar.com";

const PAID_STATUSES = new Set(["paid", "authorized", "captured"]);
const TERMINAL_FAILURE_STATUSES = new Set(["failed", "voided"]);

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!MOYASAR_SECRET_KEY) {
    return jsonResponse({ verified: false, error: "Moyasar secret key is not configured" }, 500);
  }

  let body: {
    paymentId?: string;
    orderNumber?: string;
    expectedAmount?: number;
    expectedCurrency?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ verified: false, error: "Invalid JSON body" }, 400);
  }

  const { paymentId, orderNumber, expectedAmount, expectedCurrency = "SAR" } = body;
  if (!paymentId || !orderNumber || typeof expectedAmount !== "number") {
    return jsonResponse(
      { verified: false, error: "paymentId, orderNumber and expectedAmount are required" },
      400,
    );
  }

  try {
    const res = await fetch(`${MOYASAR_BASE_URL}/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Basic ${btoa(`${MOYASAR_SECRET_KEY}:`)}` },
    });

    if (!res.ok) {
      return jsonResponse({ verified: false, error: `Moyasar lookup failed (${res.status})` }, 502);
    }

    const payment = await res.json();
    const verified =
      PAID_STATUSES.has(payment.status) &&
      payment.amount === expectedAmount &&
      payment.currency === expectedCurrency;

    if (verified) {
      const { error } = await supabaseAdmin.rpc("confirm_reservation_paid", {
        p_order_number: orderNumber,
        p_provider: "moyasar",
        p_provider_ref: payment.id,
      });
      if (error) {
        return jsonResponse({ verified: false, status: payment.status, error: error.message }, 500);
      }
    } else if (TERMINAL_FAILURE_STATUSES.has(payment.status)) {
      await supabaseAdmin.rpc("fail_reservation_payment", {
        p_order_number: orderNumber,
        p_provider: "moyasar",
      });
    }

    return jsonResponse({ verified, status: payment.status, id: payment.id });
  } catch (error) {
    return jsonResponse({ verified: false, error: String(error) }, 500);
  }
});
