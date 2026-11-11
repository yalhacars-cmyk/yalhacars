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

  it("returns the session client for a signed-in user", async () => {
    const client = fakeSupabase({ user: { id: "u1", email: "admin@example.com" } });
    getSupabaseServerClient.mockReturnValue(client);
    await expect(requireAdmin()).resolves.toBe(client);
  });

  // Known gap, tracked here on purpose: requireAdmin only checks that *someone*
  // is signed in, and public customers sign in with Google — so any customer
  // passes it, and every admin server function then runs with the service-role
  // key. Needs an admin allowlist (e.g. ADMIN_EMAILS) or an app_metadata role.
  it.todo("rejects a signed-in user who is not an admin");
});
