import { supabase } from "@/lib/supabase/browser";

/**
 * Reservations are written and read only through Postgres RPCs (never a
 * direct table insert/select) so a car can only move available -> reserved
 * atomically, and a shopper can only ever look up their own order (order
 * number + phone must both match). See `supabase/schema_v2.sql` for the
 * `create_reservation` / `lookup_reservation` functions.
 */
export type ReservationStatus = "pending" | "confirmed" | "cancelled" | "expired";

export type PaymentMethod =
  "cash_on_delivery" | "bank_transfer" | "card_demo" | "tabby" | "tamara" | "moyasar" | "amwal";
export type DeliveryType = "delivery" | "pickup";

export type Reservation = {
  id: string;
  order_number: string;
  car_id: string;
  name: string;
  phone: string;
  email: string | null;
  amount: number;
  payment_method: PaymentMethod;
  delivery_type: DeliveryType;
  address: Record<string, unknown> | null;
  status: ReservationStatus;
  provider_ref: string | null;
  paid_at: string | null;
  created_at: string;
  expires_at: string;
};

export type NewReservation = {
  carId: string;
  name: string;
  phone: string;
  email?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  deliveryType: DeliveryType;
  address?: Record<string, unknown>;
};

export class CarUnavailableError extends Error {
  constructor() {
    super("car_unavailable");
    this.name = "CarUnavailableError";
  }
}

export async function createReservation(input: NewReservation): Promise<Reservation> {
  const { data, error } = await supabase.rpc("create_reservation", {
    p_car_id: input.carId,
    p_name: input.name,
    p_phone: input.phone,
    p_email: input.email ?? null,
    p_amount: input.amount,
    p_payment_method: input.paymentMethod,
    p_delivery_type: input.deliveryType,
    p_address: input.address ?? null,
  });
  if (error) {
    if (error.message.includes("car_unavailable")) throw new CarUnavailableError();
    throw new Error(error.message);
  }
  return data as Reservation;
}

export async function lookupReservation(
  orderNumber: string,
  phone: string,
): Promise<Reservation | null> {
  const { data, error } = await supabase.rpc("lookup_reservation", {
    p_order_number: orderNumber.trim().toUpperCase(),
    p_phone: phone.trim(),
  });
  if (error) throw new Error(error.message);
  // A `security definer` SQL function returning a single composite row comes
  // back through PostgREST as an all-null object (not JSON null) when the
  // underlying `select ... limit 1` matches nothing — so check a required
  // field, not just truthiness.
  const row = data as Reservation | null;
  return row?.id ? row : null;
}

/**
 * The rest of these are called from server-only code (`src/lib/payments/*`)
 * after a payment gateway redirect/webhook — never from the browser. They
 * still go through the anon-key client because the RPCs themselves are
 * `security definer` (same reasoning as create_reservation/lookup_reservation
 * above), so no service-role key is needed anywhere in this app.
 */
export async function setReservationProviderRef(
  orderNumber: string,
  phone: string,
  providerRef: string,
): Promise<void> {
  const { error } = await supabase.rpc("set_reservation_provider_ref", {
    p_order_number: orderNumber,
    p_phone: phone,
    p_provider_ref: providerRef,
  });
  if (error) throw new Error(error.message);
}

/**
 * Marks a reservation paid. Callers MUST have already verified the payment
 * with the gateway themselves (e.g. re-fetching a Moyasar invoice by id, or
 * checking an Amwal webhook signature) — this function trusts whatever
 * `provider`/`providerRef` it's given.
 */
export async function confirmReservationPaid(
  orderNumber: string,
  provider: PaymentMethod,
  providerRef: string,
): Promise<Reservation> {
  const { data, error } = await supabase.rpc("confirm_reservation_paid", {
    p_order_number: orderNumber,
    p_provider: provider,
    p_provider_ref: providerRef,
  });
  if (error) throw new Error(error.message);
  return data as Reservation;
}

export async function failReservationPayment(
  orderNumber: string,
  provider: PaymentMethod,
): Promise<void> {
  const { error } = await supabase.rpc("fail_reservation_payment", {
    p_order_number: orderNumber,
    p_provider: provider,
  });
  if (error) throw new Error(error.message);
}

// Admin listing/status-changes for reservations require the authenticated
// (cookie) session, not the anon browser client — see
// src/lib/admin/reservations.ts (listReservationsFn / updateReservationStatusFn).
