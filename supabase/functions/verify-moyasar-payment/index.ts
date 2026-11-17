// Confirms a Moyasar payment server-side, for BOTH the website (reservation
// deposits) and the mobile app (full purchase orders).
//
// Security model: the browser/phone only tells us WHICH payment and WHAT it
// was for (an order number, or a car id + delivery choice). It is never
// trusted about the AMOUNT. The expected amount is recomputed here from the
// car's real price in the database, compared with what Moyasar says was
// actually charged, and a payment id can only ever be used for one order.
// Only then is the reservation/order written, using the service-role key
// Supabase injects into every Edge Function.
//
// Deploy:    supabase functions deploy verify-moyasar-payment
// Configure: supabase secrets set MOYASAR_SECRET_KEY=sk_live_...

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const MOYASAR_SECRET_KEY = Deno.env.get("MOYASAR_SECRET_KEY") ?? "";
const MOYASAR_BASE_URL = Deno.env.get("MOYASAR_BASE_URL") ?? "https://api.moyasar.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const PAID_STATUSES = new Set(["paid", "authorized", "captured"]);
const TERMINAL_FAILURE_STATUSES = new Set(["failed", "voided"]);

// Must match the clients: website checkout.$carId.tsx and app checkout_screen.dart.
const RESERVATION_PCT = 0.05;
const RESERVATION_MIN_SAR = 1000;
const VAT_RATE = 0.15;
const DELIVERY_FEE_SAR = 500;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

function reservationDepositSar(price: number): number {
  return Math.max(RESERVATION_MIN_SAR, Math.round((price * RESERVATION_PCT) / 100) * 100);
}

type Body = {
  paymentId?: string;
  // website: reservation deposit
  orderNumber?: string;
  // app: full purchase order
  carId?: string;
  orderReference?: string;
  delivery?: "pickup" | "delivery";
  fullName?: string;
  phone?: string;
  email?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!MOYASAR_SECRET_KEY) return json({ verified: false, error: "Moyasar secret key is not configured" }, 500);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ verified: false, error: "Invalid JSON body" }, 400);
  }
  const { paymentId, orderNumber, carId } = body;
  if (!paymentId || (!orderNumber && !carId)) {
    return json({ verified: false, error: "paymentId and an orderNumber or carId are required" }, 400);
  }

  try {
    const res = await fetch(`${MOYASAR_BASE_URL}/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Basic ${btoa(`${MOYASAR_SECRET_KEY}:`)}` },
    });
    if (!res.ok) return json({ verified: false, error: `Moyasar lookup failed (${res.status})` }, 502);
    const payment = await res.json();
    const paid = PAID_STATUSES.has(payment.status) && payment.currency === "SAR";

    // ---------------------------------------------------------------- website
    if (orderNumber) {
      const { data: reservation } = await admin
        .from("reservations")
        .select("order_number, car_id, amount, status, payment_method")
        .eq("order_number", orderNumber)
        .maybeSingle();
      if (!reservation) return json({ verified: false, error: "Reservation not found" }, 404);
      if (reservation.payment_method !== "moyasar") {
        return json({ verified: false, error: "Reservation is not a card payment" }, 400);
      }

      const { data: car } = await admin.from("cars").select("price").eq("id", reservation.car_id).maybeSingle();
      const price = Number(car?.price ?? 0);
      if (!(price > 0)) return json({ verified: false, error: "Car has no price" }, 400);
      const expectedSar = reservationDepositSar(price);

      if (reservation.amount !== expectedSar) {
        return json({ verified: false, error: "Reservation amount does not match the car price" }, 400);
      }
      if (paid && payment.amount !== expectedSar * 100) {
        return json({ verified: false, status: payment.status, error: "Paid amount does not match" }, 400);
      }

      if (paid) {
        const { data: reused } = await admin
          .from("reservations")
          .select("order_number")
          .eq("provider_ref", payment.id)
          .neq("order_number", orderNumber)
          .limit(1);
        if (reused && reused.length > 0) {
          return json({ verified: false, error: "This payment was already used for another order" }, 409);
        }
        const { error } = await admin.rpc("confirm_reservation_paid", {
          p_order_number: orderNumber,
          p_provider: "moyasar",
          p_provider_ref: payment.id,
        });
        if (error) return json({ verified: false, status: payment.status, error: error.message }, 500);
      } else if (TERMINAL_FAILURE_STATUSES.has(payment.status)) {
        await admin.rpc("fail_reservation_payment", { p_order_number: orderNumber, p_provider: "moyasar" });
      }
      return json({ verified: paid, status: payment.status, id: payment.id });
    }

    // -------------------------------------------------------------------- app
    // Identify the signed-in user from the JWT the app sends; never from the body.
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ verified: false, error: "Sign in to complete an order" }, 401);

    const { data: car } = await admin
      .from("cars")
      .select("id, stock, price, status")
      .eq("id", carId)
      .maybeSingle();
    if (!car || car.status !== "approved") return json({ verified: false, error: "Car not available" }, 404);
    const price = Number(car.price ?? 0);
    if (!(price > 0)) return json({ verified: false, error: "Car has no price" }, 400);

    const delivery = body.delivery === "delivery" ? "delivery" : "pickup";
    const vat = price * VAT_RATE;
    const fee = delivery === "delivery" ? DELIVERY_FEE_SAR : 0;
    const total = price + vat + fee;
    const expectedMinor = Math.round(total * 100);

    if (!paid) {
      return json({ verified: false, status: payment.status });
    }
    if (Math.abs(payment.amount - expectedMinor) > 1) {
      return json({ verified: false, status: payment.status, error: "Paid amount does not match" }, 400);
    }

    const orderRef = body.orderReference || `YAL-${car.stock}`;
    const row = {
      order_reference: orderRef,
      user_id: user.id,
      car_id: car.id,
      full_name: String(body.fullName ?? "").slice(0, 120),
      phone: String(body.phone ?? "").slice(0, 40),
      email: body.email ? String(body.email).slice(0, 160) : null,
      delivery_option: delivery,
      vehicle_price: price,
      vat_amount: vat,
      delivery_fee: fee,
      total_amount: total,
      status: "confirmed",
    };

    // One payment id may only ever back one order (needs orders.payment_ref -
    // see supabase/harden_orders.sql; tolerated if the migration isn't applied yet).
    let { error } = await admin.from("orders").insert({ ...row, payment_ref: payment.id });
    if (error && error.code === "42703") {
      ({ error } = await admin.from("orders").insert(row));
    }
    if (error) {
      if (error.code === "23505") {
        // Same order reference or payment id seen before: only OK if it is this
        // user's own order (idempotent retry), never someone else's.
        const { data: existing } = await admin
          .from("orders")
          .select("user_id")
          .eq("order_reference", orderRef)
          .maybeSingle();
        if (existing?.user_id === user.id) return json({ verified: true, status: payment.status, id: payment.id, orderReference: orderRef });
        return json({ verified: false, error: "This payment or order was already used" }, 409);
      }
      return json({ verified: false, status: payment.status, error: error.message }, 500);
    }
    return json({ verified: true, status: payment.status, id: payment.id, orderReference: orderRef });
  } catch (error) {
    return json({ verified: false, error: String(error) }, 500);
  }
});
