// Confirms an Amwal Tech payment link's status server-side. Amwal's own
// integration guide is explicit about this: "never trust the mobile client
// alone to mark an order as paid" — validate through the status API (or a
// webhook) instead. This is that status check.
//
// Amwal REST reference: https://docs.amwal.tech/api-reference/payment-link-details
//
// On a "Paid" status this also applies the result to the reservation via
// `confirm_reservation_paid` (service_role only — see supabase/schema_v3.sql),
// so calling this function is what actually confirms the order, not just a
// read. A definitively terminal non-paid status releases the car back to
// `available` via `fail_reservation_payment`.
//
// Deploy: supabase functions deploy verify-amwal-payment
// Configure: supabase secrets set AMWAL_SECRET_KEY=... AMWAL_PUBLIC_KEY=sandbox-amwal-...

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

// "Paid" and "Unpaid" (the not-yet-paid state) are confirmed against a real
// sandbox link. The rest are a best-effort guess at Amwal's actual
// terminal-failure strings — an unrecognized status is deliberately left
// `pending` rather than guessed at either way.
const TERMINAL_FAILURE_STATUSES = new Set(["Expired", "Cancelled", "Failed"]);

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!AMWAL_SECRET_KEY || !AMWAL_PUBLIC_KEY) {
    return jsonResponse({ verified: false, error: "Amwal is not configured" }, 500);
  }

  let body: { paymentLinkId?: string; orderNumber?: string; expectedAmount?: number };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ verified: false, error: "Invalid JSON body" }, 400);
  }

  const { paymentLinkId, orderNumber, expectedAmount } = body;
  if (!paymentLinkId) {
    return jsonResponse({ verified: false, error: "paymentLinkId is required" }, 400);
  }

  try {
    const res = await fetch(
      `${AMWAL_BASE_URL}/payment_links/${encodeURIComponent(paymentLinkId)}/details`,
      {
        method: "POST",
        headers: {
          Authorization: AMWAL_SECRET_KEY,
          "X-Amwal-Key": AMWAL_PUBLIC_KEY,
          "Content-Type": "application/json",
        },
        // Same field-naming caveat as create-amwal-checkout: the live API
        // has returned "paymentLinkId and orderNumber are required" for this
        // endpoint too even though the docs show an empty body, so send both
        // — the id is already in the URL, this just covers whichever the
        // handler actually reads.
        body: JSON.stringify({ paymentLinkId, orderNumber }),
      },
    );

    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      return jsonResponse(
        {
          verified: false,
          error: errBody?.error ?? errBody?.message ?? `Amwal lookup failed (${res.status})`,
        },
        502,
      );
    }

    const data = await res.json();
    const status: string = data?.payment_link?.status ?? "unknown";
    const linkAmount = data?.payment_link?.amount;

    const amountMatches =
      typeof expectedAmount !== "number" ||
      linkAmount === undefined ||
      linkAmount === expectedAmount;
    const verified = status === "Paid" && amountMatches;

    // Optional: only reservations/cars-backed callers (this web app, and
    // whatever else shares this Supabase project) pass orderNumber. A
    // caller that doesn't isn't asking us to touch any database row — it
    // still gets a correct verified/status back either way.
    if (orderNumber && verified) {
      const { error } = await supabaseAdmin.rpc("confirm_reservation_paid", {
        p_order_number: orderNumber,
        p_provider: "amwal",
        p_provider_ref: paymentLinkId,
      });
      if (error) {
        return jsonResponse({ verified: false, status, error: error.message }, 500);
      }
    } else if (orderNumber && TERMINAL_FAILURE_STATUSES.has(status)) {
      await supabaseAdmin.rpc("fail_reservation_payment", {
        p_order_number: orderNumber,
        p_provider: "amwal",
      });
    }

    return jsonResponse({ verified, status });
  } catch (error) {
    return jsonResponse({ verified: false, error: String(error) }, 500);
  }
});
