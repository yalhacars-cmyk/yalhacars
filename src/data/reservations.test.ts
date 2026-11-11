import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type FakeSupabase } from "@/test/fakeSupabase";

// `supabase` is read lazily through a getter so each test can install its own fake.
const holder = vi.hoisted(() => ({ client: undefined as unknown }));
vi.mock("@/lib/supabase/browser", () => ({
  get supabase() {
    return holder.client;
  },
}));

import {
  CarUnavailableError,
  confirmReservationPaid,
  createReservation,
  failReservationPayment,
  lookupReservation,
  setReservationProviderRef,
  type Reservation,
} from "./reservations";

const row = { id: "res-1", order_number: "ABC123", status: "pending" } as Reservation;

let client: FakeSupabase;
function useClient(rpc: Parameters<typeof fakeSupabase>[0] = {}) {
  client = fakeSupabase(rpc);
  holder.client = client;
}
const lastRpc = () => client.rpc.mock.calls.at(-1) as [string, Record<string, unknown>];

beforeEach(() => useClient());

describe("createReservation", () => {
  const base = {
    carId: "car-1",
    name: "Sara",
    phone: "0500000000",
    amount: 5000,
    paymentMethod: "moyasar",
    deliveryType: "delivery",
  } as const;

  it("maps the input onto the RPC's parameters and returns the created row", async () => {
    useClient({ rpc: { create_reservation: { data: row } } });
    const result = await createReservation({
      ...base,
      email: "sara@example.com",
      address: { city: "Riyadh" },
    });
    expect(result).toBe(row);
    expect(lastRpc()).toEqual([
      "create_reservation",
      {
        p_car_id: "car-1",
        p_name: "Sara",
        p_phone: "0500000000",
        p_email: "sara@example.com",
        p_amount: 5000,
        p_payment_method: "moyasar",
        p_delivery_type: "delivery",
        p_address: { city: "Riyadh" },
      },
    ]);
  });

  it("sends null (not undefined) for the optional email and address", async () => {
    useClient({ rpc: { create_reservation: { data: row } } });
    await createReservation(base);
    expect(lastRpc()[1]).toMatchObject({ p_email: null, p_address: null });
  });

  it("throws CarUnavailableError when the car was already taken", async () => {
    useClient({ rpc: { create_reservation: { error: { message: "P0001: car_unavailable" } } } });
    const error = await createReservation(base).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CarUnavailableError);
    expect(error).toMatchObject({ name: "CarUnavailableError", message: "car_unavailable" });
  });

  it("throws a plain Error carrying the message for any other failure", async () => {
    useClient({ rpc: { create_reservation: { error: { message: "connection reset" } } } });
    const error = await createReservation(base).catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(CarUnavailableError);
    expect(error).toMatchObject({ message: "connection reset" });
  });
});

describe("lookupReservation", () => {
  it("normalises the order number and phone before querying", async () => {
    useClient({ rpc: { lookup_reservation: { data: row } } });
    await lookupReservation("  abc123 ", " 0500000000 ");
    expect(lastRpc()).toEqual([
      "lookup_reservation",
      { p_order_number: "ABC123", p_phone: "0500000000" },
    ]);
  });

  it("returns the reservation when one matches", async () => {
    useClient({ rpc: { lookup_reservation: { data: row } } });
    await expect(lookupReservation("ABC123", "0500000000")).resolves.toBe(row);
  });

  it("returns null for JSON null", async () => {
    useClient({ rpc: { lookup_reservation: { data: null } } });
    await expect(lookupReservation("ABC123", "0500000000")).resolves.toBeNull();
  });

  it("returns null for the all-null composite row PostgREST sends when nothing matched", async () => {
    useClient({
      rpc: { lookup_reservation: { data: { id: null, order_number: null, status: null } } },
    });
    await expect(lookupReservation("ABC123", "0500000000")).resolves.toBeNull();
  });

  it("throws on an RPC error", async () => {
    useClient({ rpc: { lookup_reservation: { error: { message: "rpc failed" } } } });
    await expect(lookupReservation("ABC123", "0500000000")).rejects.toThrow("rpc failed");
  });
});

describe("payment-gateway callbacks", () => {
  it("setReservationProviderRef passes the order, phone and provider reference", async () => {
    await setReservationProviderRef("ABC123", "0500000000", "inv_9");
    expect(lastRpc()).toEqual([
      "set_reservation_provider_ref",
      { p_order_number: "ABC123", p_phone: "0500000000", p_provider_ref: "inv_9" },
    ]);
  });

  it("confirmReservationPaid returns the updated reservation", async () => {
    useClient({ rpc: { confirm_reservation_paid: { data: { ...row, status: "confirmed" } } } });
    const result = await confirmReservationPaid("ABC123", "moyasar", "inv_9");
    expect(result.status).toBe("confirmed");
    expect(lastRpc()).toEqual([
      "confirm_reservation_paid",
      { p_order_number: "ABC123", p_provider: "moyasar", p_provider_ref: "inv_9" },
    ]);
  });

  it("failReservationPayment passes the order and provider", async () => {
    await failReservationPayment("ABC123", "amwal");
    expect(lastRpc()).toEqual([
      "fail_reservation_payment",
      { p_order_number: "ABC123", p_provider: "amwal" },
    ]);
  });

  it.each([
    [
      "setReservationProviderRef",
      "set_reservation_provider_ref",
      () => setReservationProviderRef("A", "1", "r"),
    ],
    [
      "confirmReservationPaid",
      "confirm_reservation_paid",
      () => confirmReservationPaid("A", "moyasar", "r"),
    ],
    [
      "failReservationPayment",
      "fail_reservation_payment",
      () => failReservationPayment("A", "moyasar"),
    ],
  ])(
    "%s throws when the RPC fails, so a payment is never silently lost",
    async (_name, rpc, call) => {
      useClient({ rpc: { [rpc]: { error: { message: "db down" } } } });
      await expect(call()).rejects.toThrow("db down");
    },
  );
});
