import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type FakeSupabase } from "@/test/fakeSupabase";

const holder = vi.hoisted(() => ({ client: undefined as unknown }));
vi.mock("@/lib/supabase/browser", () => ({
  get supabase() {
    return holder.client;
  },
}));

import { createLead } from "./leads";

let client: FakeSupabase;
function useClient(opts: Parameters<typeof fakeSupabase>[0] = {}) {
  client = fakeSupabase(opts);
  holder.client = client;
}

beforeEach(() => useClient());

describe("createLead", () => {
  it("inserts every field into the leads table", async () => {
    await createLead({
      type: "test_drive",
      name: "Omar",
      phone: "0500000000",
      email: "omar@example.com",
      city: "Jeddah",
      carId: "car-7",
      payload: { slot: "10:00" },
    });
    expect(client.argsOf("leads", "insert")).toEqual([
      [
        {
          type: "test_drive",
          name: "Omar",
          phone: "0500000000",
          email: "omar@example.com",
          city: "Jeddah",
          car_id: "car-7",
          payload: { slot: "10:00" },
        },
      ],
    ]);
  });

  it("defaults the optional fields to null and the payload to {}", async () => {
    await createLead({ type: "general_contact", name: "Omar", phone: "0500000000" });
    expect(client.argsOf("leads", "insert")[0]?.[0]).toEqual({
      type: "general_contact",
      name: "Omar",
      phone: "0500000000",
      email: null,
      city: null,
      car_id: null,
      payload: {},
    });
  });

  it("throws the database error message", async () => {
    useClient({ tables: { leads: { error: { message: "new row violates policy" } } } });
    await expect(
      createLead({ type: "general_contact", name: "Omar", phone: "0500000000" }),
    ).rejects.toThrow("new row violates policy");
  });
});
