import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReservationStatus } from "@/data/reservations";
import { fakeSupabase, type FakeSupabase } from "@/test/fakeSupabase";

vi.mock(
  "@tanstack/react-start",
  async () => (await import("@/test/serverFnMock")).tanstackStartMock,
);

const { requireAdmin, getSupabaseAdminClient } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
}));
vi.mock("@/lib/admin/require-admin", () => ({ requireAdmin }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient }));

import { updateReservationStatusFn } from "./reservations";

const RESERVATION_ID = "11111111-1111-4111-8111-111111111111";
// `status` is deliberately a plain string so the invalid-status test can send one;
// the cast only satisfies the compiler, the schema still validates it at runtime.
const input = (status: string) => ({
  id: RESERVATION_ID,
  carId: "car-42",
  status: status as ReservationStatus,
});

let session: FakeSupabase; // what requireAdmin() hands back (the cookie/anon client)
let admin: FakeSupabase; // the service-role client

function setup(
  tables: {
    session?: Parameters<typeof fakeSupabase>[0];
    admin?: Parameters<typeof fakeSupabase>[0];
  } = {},
) {
  session = fakeSupabase(tables.session);
  admin = fakeSupabase(tables.admin);
  requireAdmin.mockResolvedValue(session);
  getSupabaseAdminClient.mockReturnValue(admin);
}

beforeEach(() => {
  vi.clearAllMocks();
  setup();
});

describe("updateReservationStatusFn", () => {
  it("updates the reservation's own status", async () => {
    await updateReservationStatusFn({ data: input("confirmed") });
    expect(session.argsOf("reservations", "update")).toEqual([[{ status: "confirmed" }]]);
    expect(session.argsOf("reservations", "eq")).toEqual([["id", RESERVATION_ID]]);
  });

  it("marks the car sold when a reservation is confirmed", async () => {
    await updateReservationStatusFn({ data: input("confirmed") });
    expect(admin.argsOf("cars", "update")).toEqual([[{ availability: "sold" }]]);
    expect(admin.argsOf("cars", "eq")).toEqual([["id", "car-42"]]);
  });

  it.each(["cancelled", "expired"])(
    "frees the car again when a reservation is %s",
    async (status) => {
      await updateReservationStatusFn({ data: input(status) });
      expect(admin.argsOf("cars", "update")).toEqual([[{ availability: "available" }]]);
    },
  );

  it("leaves the car alone while a reservation is still pending", async () => {
    await updateReservationStatusFn({ data: input("pending") });
    expect(admin.tablesTouched()).toEqual([]);
  });

  it("never writes the moderation `status` column on cars", async () => {
    // cars.status is pending/approved (seller-listing moderation). Writing
    // "sold"/"available" there hides the car from the public list for good.
    for (const status of ["confirmed", "cancelled", "expired", "pending"]) {
      await updateReservationStatusFn({ data: input(status) });
    }
    for (const [patch] of admin.argsOf("cars", "update")) {
      expect(patch).not.toHaveProperty("status");
    }
    expect(session.argsOf("cars", "update")).toEqual([]);
  });

  it("does not touch the car if the reservation update fails", async () => {
    setup({ session: { tables: { reservations: { error: { message: "rls denied" } } } } });
    await expect(updateReservationStatusFn({ data: input("confirmed") })).rejects.toThrow(
      "rls denied",
    );
    expect(admin.tablesTouched()).toEqual([]);
  });

  it("surfaces a failed car update instead of silently reporting success", async () => {
    setup({ admin: { tables: { cars: { error: { message: "cars write failed" } } } } });
    await expect(updateReservationStatusFn({ data: input("confirmed") })).rejects.toThrow(
      "cars write failed",
    );
  });

  it("writes nothing when the caller is not an admin", async () => {
    requireAdmin.mockRejectedValue(new Error("Not authenticated"));
    await expect(updateReservationStatusFn({ data: input("confirmed") })).rejects.toThrow(
      "Not authenticated",
    );
    expect(session.tablesTouched()).toEqual([]);
    expect(admin.tablesTouched()).toEqual([]);
  });

  it("rejects an invalid status or a non-uuid id before doing anything", async () => {
    await expect(updateReservationStatusFn({ data: input("refunded") })).rejects.toThrow();
    await expect(
      updateReservationStatusFn({ data: { ...input("confirmed"), id: "not-a-uuid" } }),
    ).rejects.toThrow();
    expect(requireAdmin).not.toHaveBeenCalled();
  });
});
