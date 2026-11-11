import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicUser } from "@/lib/auth";
import { signOutFn } from "@/lib/auth";
import { LocaleProvider } from "@/lib/i18n/context";
import { getSupabaseBrowserAuthClient } from "@/lib/supabase/browser-auth";
import { ThemeProvider } from "@/lib/theme/context";
import { Sidebar } from "./Sidebar";

// Regression coverage for: the sidebar's "Login / Sign up" row used to be a
// dead <button> with no onClick at all — this locks in the real Google OAuth
// wiring (shared with the desktop Header via AuthControls) so it can't
// silently regress back to a no-op button.

// Sidebar's nav rows use Link for real routing — no RouterProvider test
// harness is set up in this app, so a plain <a> stands in for it (same
// approach as CarCard.test.tsx).
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
  // LocaleProvider checks the current route to force admin pages LTR — Sidebar
  // never renders under /admin, so a fixed "not admin" result is correct here.
  useRouterState: () => false,
}));

const signInWithOAuth = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/browser-auth", () => ({
  getSupabaseBrowserAuthClient: vi.fn(() => ({
    auth: { signInWithOAuth },
  })),
}));

vi.mock("@/lib/auth", () => ({
  signOutFn: vi.fn().mockResolvedValue(undefined),
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.clearAllMocks();
});

function renderSidebar(user: PublicUser | null) {
  window.localStorage.setItem("yalhacar-locale", "en");
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <Sidebar user={user} />
      </ThemeProvider>
    </LocaleProvider>,
  );
}

describe("Sidebar auth row", () => {
  it("starts Google OAuth sign-in when signed out and the login row is clicked", async () => {
    const user = userEvent.setup();
    renderSidebar(null);

    await user.click(screen.getByLabelText("Open menu"));
    await user.click(await screen.findByText("Login / Sign up"));

    expect(getSupabaseBrowserAuthClient).toHaveBeenCalled();
    expect(signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: "google" }));
  });

  it("shows the signed-in visitor's name and a working sign-out row instead of the login row", async () => {
    const user = userEvent.setup();
    const originalLocation = window.location;
    // signOutAndReload navigates via window.location.href — stub it out so
    // jsdom doesn't throw "Not implemented: navigation".
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, href: "" },
      writable: true,
    });

    renderSidebar({ id: "u1", name: "Sara Khan", avatarUrl: null, email: "sara@example.com" });

    await user.click(screen.getByLabelText("Open menu"));
    expect(await screen.findByText("Sara Khan")).toBeInTheDocument();
    expect(screen.queryByText("Login / Sign up")).not.toBeInTheDocument();

    await user.click(screen.getByText("Sign out"));
    expect(signOutFn).toHaveBeenCalledOnce();

    Object.defineProperty(window, "location", { value: originalLocation, writable: true });
  });
});
