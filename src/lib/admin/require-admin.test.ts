import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/test/fakeSupabase";

const { getSupabaseServerClient } = vi.hoisted(() => ({ getSupabaseServerClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient }));

import { requireAdmin } from "./require-admin";

beforeEach(() => vi.clearAllMocks());

describe("requireAdmin", () => {
  it("rejects a request with no session", async () => {
    getSupabaseServerClient.mockReturnValue(fakeSupabase({ user: null }));
    await expect(requireAdmin()).rejects.toThrow("Not authenticated");
  });

  it("rejects when Supabase reports an auth error, even if a user object is present", async () => {
    getSupabaseServerClient.mockReturnValue(
      fakeSupabase({ user: { id: "u1" }, authError: { message: "jwt expired" } }),
    );
    await expect(requireAdmin()).rejects.toThrow("Not authenticated");
  });

  it("returns the session client for a signed-in admin", async () => {
    const client = fakeSupabase({
      user: { id: "u1", email: "admin@example.com", app_metadata: { role: "admin" } },
    });
    getSupabaseServerClient.mockReturnValue(client);
    await expect(requireAdmin()).resolves.toBe(client);
  });

  it("rejects a signed-in customer who is not an admin", async () => {
    getSupabaseServerClient.mockReturnValue(
      fakeSupabase({ user: { id: "u2", email: "customer@example.com", app_metadata: {} } }),
    );
    await expect(requireAdmin()).rejects.toThrow("Not authorized");
  });

  it("rejects a user whose own user_metadata claims admin (only app_metadata counts)", async () => {
    getSupabaseServerClient.mockReturnValue(
      fakeSupabase({ user: { id: "u3", user_metadata: { role: "admin" } } }),
    );
    await expect(requireAdmin()).rejects.toThrow("Not authorized");
  });
});
