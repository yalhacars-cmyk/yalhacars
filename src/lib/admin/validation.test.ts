import { beforeEach, describe, expect, it, vi } from "vitest";
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

import { updateVehicleYearRangeFn } from "./catalog";
import { updateSiteSettingsFn } from "./settings";

const ID = "22222222-2222-4222-8222-222222222222";
let session: FakeSupabase;
let admin: FakeSupabase;

beforeEach(() => {
  vi.clearAllMocks();
  session = fakeSupabase();
  admin = fakeSupabase();
  requireAdmin.mockResolvedValue(session);
  getSupabaseAdminClient.mockReturnValue(admin);
});

describe("updateVehicleYearRangeFn", () => {
  it("saves a valid range", async () => {
    await updateVehicleYearRangeFn({ data: { id: ID, min_year: 2000, max_year: 2027 } });
    expect(admin.argsOf("vehicle_year_range", "update")).toEqual([
      [{ min_year: 2000, max_year: 2027 }],
    ]);
    expect(admin.argsOf("vehicle_year_range", "eq")).toEqual([["id", ID]]);
  });

  it("accepts a single-year range", async () => {
    await expect(
      updateVehicleYearRangeFn({ data: { id: ID, min_year: 2024, max_year: 2024 } }),
    ).resolves.toBeUndefined();
  });

  it("rejects an inverted range (min after max), which would empty the seller's year dropdown", async () => {
    await expect(
      updateVehicleYearRangeFn({ data: { id: ID, min_year: 2030, max_year: 2000 } }),
    ).rejects.toThrow();
    expect(admin.tablesTouched()).toEqual([]);
  });

  it.each([
    ["non-uuid id", { id: "1", min_year: 2000, max_year: 2020 }],
    ["fractional year", { id: ID, min_year: 2000.5, max_year: 2020 }],
    ["missing max", { id: ID, min_year: 2000 }],
  ])("rejects %s", async (_name, data) => {
    const invalid = data as Parameters<typeof updateVehicleYearRangeFn>[0]["data"];
    await expect(updateVehicleYearRangeFn({ data: invalid })).rejects.toThrow();
  });

  it("surfaces a database error", async () => {
    admin = fakeSupabase({ tables: { vehicle_year_range: { error: { message: "boom" } } } });
    getSupabaseAdminClient.mockReturnValue(admin);
    await expect(
      updateVehicleYearRangeFn({ data: { id: ID, min_year: 2000, max_year: 2020 } }),
    ).rejects.toThrow("boom");
  });
});

describe("updateSiteSettingsFn", () => {
  const valid = {
    phone: "+966 11 000 0000",
    brandColor: "#f4511d",
    brandColor2: "#111",
    emailCorporate: "corp@example.com",
    emailInfo: "info@example.com",
    emailSales: "sales@example.com",
    emailSupport: "support@example.com",
  };

  it("maps camelCase input onto the snake_case columns of the default row", async () => {
    await updateSiteSettingsFn({ data: valid });
    expect(session.argsOf("site_settings", "eq")).toEqual([["id", "default"]]);
    expect(session.argsOf("site_settings", "update")[0]?.[0]).toMatchObject({
      phone: valid.phone,
      brand_color: "#f4511d",
      brand_color_2: "#111",
      email_corporate: valid.emailCorporate,
      email_info: valid.emailInfo,
      email_sales: valid.emailSales,
      email_support: valid.emailSupport,
    });
  });

  it.each(["#fff", "#FFFF", "#f4511d", "#F4511D", "#f4511dcc"])(
    "accepts the valid hex color %s",
    async (color) => {
      await expect(
        updateSiteSettingsFn({ data: { ...valid, brandColor: color } }),
      ).resolves.toBeDefined();
    },
  );

  it.each([
    "#12", // too short
    "#12345", // 5 digits is not a CSS color
    "#1234567", // 7 digits is not a CSS color
    "#123456789", // too long
    "#ggg",
    "f4511d", // missing #
    "red",
    "#fff; background:url(x)", // CSS injection attempt
    "",
  ])("rejects the invalid hex color %j", async (color) => {
    await expect(
      updateSiteSettingsFn({ data: { ...valid, brandColor2: color } }),
    ).rejects.toThrow();
    expect(session.tablesTouched()).toEqual([]);
  });

  it.each(["emailCorporate", "emailInfo", "emailSales", "emailSupport"])(
    "rejects an invalid %s",
    async (field) => {
      await expect(
        updateSiteSettingsFn({ data: { ...valid, [field]: "not-an-email" } }),
      ).rejects.toThrow();
    },
  );

  it("rejects an empty phone number", async () => {
    await expect(updateSiteSettingsFn({ data: { ...valid, phone: "" } })).rejects.toThrow();
  });

  it("surfaces a database error", async () => {
    session = fakeSupabase({ tables: { site_settings: { error: { message: "denied" } } } });
    requireAdmin.mockResolvedValue(session);
    await expect(updateSiteSettingsFn({ data: valid })).rejects.toThrow("denied");
  });
});
