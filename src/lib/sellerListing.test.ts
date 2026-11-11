import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type FakeSupabase } from "@/test/fakeSupabase";

vi.mock(
  "@tanstack/react-start",
  async () => (await import("@/test/serverFnMock")).tanstackStartMock,
);

const { getSupabaseServerClient } = vi.hoisted(() => ({ getSupabaseServerClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient }));

import { submitCarListingFn } from "./sellerListing";

const USER = { id: "user-1", email: "seller@example.com" };
const validListing = {
  make: "Toyota",
  model: "Camry",
  year: 2021,
  mileageKm: 45_000,
  fuel: "Petrol",
};

let client: FakeSupabase;
type Tables = NonNullable<NonNullable<Parameters<typeof fakeSupabase>[0]>["tables"]>;
function signIn(tables: Tables = {}, user: typeof USER | null = USER) {
  client = fakeSupabase({ user, tables });
  getSupabaseServerClient.mockReturnValue(client);
}
const insertedRow = () => client.argsOf("cars", "insert")[0]?.[0] as Record<string, unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  signIn();
});

describe("submitCarListingFn — access", () => {
  it("refuses an anonymous visitor and writes nothing", async () => {
    signIn({}, null);
    await expect(submitCarListingFn({ data: validListing })).rejects.toThrow("Not signed in");
    expect(client.argsOf("cars", "insert")).toEqual([]);
  });
});

describe("submitCarListingFn — what gets written", () => {
  it("always creates a pending, available listing owned by the signed-in user", async () => {
    await submitCarListingFn({ data: validListing });
    expect(insertedRow()).toMatchObject({
      status: "pending",
      availability: "available",
      user_id: USER.id,
      sellerType: "Private Seller",
      dealer_store_name: null,
      dealer_store_logo_url: null,
    });
  });

  it("cannot be talked into self-approving or impersonating another user", async () => {
    // Fields the schema doesn't declare — cast past the compiler to prove they're stripped at runtime.
    const forged = {
      ...validListing,
      status: "approved",
      user_id: "someone-else",
      sellerType: "Platform Certified",
    } as typeof validListing;
    await submitCarListingFn({ data: forged });
    expect(insertedRow()).toMatchObject({
      status: "pending",
      user_id: USER.id,
      sellerType: "Private Seller",
    });
  });

  it("builds the title, id and stock number", async () => {
    const result = await submitCarListingFn({ data: validListing });
    expect(insertedRow()["title"]).toBe("2021 Toyota Camry");
    expect(insertedRow()["id"]).toMatch(/^listing-\d+$/);
    expect(insertedRow()["stock"]).toMatch(/^PND-\d+$/);
    expect(result).toEqual({ id: insertedRow()["id"] });
  });

  it("stores unset optional fields as null and photos as an array", async () => {
    await submitCarListingFn({ data: validListing });
    expect(insertedRow()).toMatchObject({ trim: null, city: null, price: null, photo_paths: [] });
  });

  it("passes the submitted photo paths through", async () => {
    await submitCarListingFn({ data: { ...validListing, photo_paths: ["a.jpg", "b.jpg"] } });
    expect(insertedRow()["photo_paths"]).toEqual(["a.jpg", "b.jpg"]);
  });

  it("surfaces a database error", async () => {
    signIn({ cars: { error: { message: "insert failed" } } });
    await expect(submitCarListingFn({ data: validListing })).rejects.toThrow("insert failed");
  });
});

describe("submitCarListingFn — dealer branding", () => {
  const approvedDealer = {
    profiles: { data: { account_type: "dealer" } },
    dealer_stores: {
      data: { store_name: "Al Noor Motors", logo_path: "u1/logo.png", status: "approved" },
    },
  };

  it("stamps the store name and logo for an approved dealer", async () => {
    signIn(approvedDealer);
    await submitCarListingFn({ data: validListing });
    expect(insertedRow()).toMatchObject({
      sellerType: "Independent Dealer",
      dealer_store_name: "Al Noor Motors",
      dealer_store_logo_url: "https://cdn.test/dealer-store-logos/u1/logo.png",
    });
  });

  it("does not stamp a dealer whose storefront is still pending review", async () => {
    signIn({
      ...approvedDealer,
      dealer_stores: {
        data: { store_name: "Al Noor Motors", logo_path: "u1/logo.png", status: "pending" },
      },
    });
    await submitCarListingFn({ data: validListing });
    expect(insertedRow()).toMatchObject({
      sellerType: "Private Seller",
      dealer_store_name: null,
      dealer_store_logo_url: null,
    });
  });

  it("does not stamp an approved store on a non-dealer account", async () => {
    signIn({ ...approvedDealer, profiles: { data: { account_type: "individual" } } });
    await submitCarListingFn({ data: validListing });
    expect(insertedRow()).toMatchObject({ sellerType: "Private Seller", dealer_store_name: null });
  });

  it("stamps the name with no logo URL when the store has no logo", async () => {
    signIn({
      ...approvedDealer,
      dealer_stores: {
        data: { store_name: "Al Noor Motors", logo_path: null, status: "approved" },
      },
    });
    await submitCarListingFn({ data: validListing });
    expect(insertedRow()).toMatchObject({
      dealer_store_name: "Al Noor Motors",
      dealer_store_logo_url: null,
    });
  });
});

describe("submitCarListingFn — validation", () => {
  const nextYear = new Date().getFullYear() + 1;
  const rejects = (patch: Record<string, unknown>) =>
    expect(submitCarListingFn({ data: { ...validListing, ...patch } })).rejects.toThrow();

  it.each([
    ["year before 1980", { year: 1979 }],
    ["year too far in the future", { year: nextYear + 1 }],
    ["fractional year", { year: 2020.5 }],
    ["negative mileage", { mileageKm: -1 }],
    ["fractional mileage", { mileageKm: 10.5 }],
    ["empty make", { make: "" }],
    ["empty model", { model: "" }],
    ["empty fuel", { fuel: "" }],
    ["zero price", { price: 0 }],
    ["string year", { year: "2021" }],
  ])("rejects %s", async (_name, patch) => {
    await rejects(patch);
    expect(client.argsOf("cars", "insert")).toEqual([]);
  });

  it("accepts next model year and zero mileage (a brand-new car)", async () => {
    await expect(
      submitCarListingFn({ data: { ...validListing, year: nextYear, mileageKm: 0 } }),
    ).resolves.toHaveProperty("id");
  });
});
