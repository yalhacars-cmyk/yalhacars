import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PublicUser } from "@/lib/auth";
import { signOutFn } from "@/lib/auth";
import { getSupabaseBrowserAuthClient } from "@/lib/supabase/browser-auth";

/**
 * Shared between the desktop Header (pill button / avatar dropdown) and the
 * mobile Sidebar sheet (plain menu rows) — both need the exact same Google
 * OAuth call and sign-out call, just presented differently.
 */

export function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l3.99-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l3.99 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

/** Kicks off Google OAuth and redirects the browser — nothing more happens
 * client-side on success, so the returned `loading` only needs resetting on
 * a same-tab failure (network error, provider misconfigured, etc).
 *
 * `signIn` defaults to returning the visitor to the current URL, but takes
 * an explicit path (hash included) when the caller needs to land somewhere
 * more specific — e.g. back at a particular section of the page they were on. */
export function useGoogleSignIn() {
  const [loading, setLoading] = useState(false);

  const signIn = async (target?: string) => {
    setLoading(true);
    const supabase = getSupabaseBrowserAuthClient();
    const next = encodeURIComponent(target ?? window.location.pathname + window.location.search);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    });
    if (error) setLoading(false);
  };

  return { signIn, loading };
}

export async function signOutAndReload() {
  await signOutFn();
  window.location.href = "/";
}

export function SignInButton() {
  const { signIn, loading } = useGoogleSignIn();

  return (
    <button
      type="button"
      onClick={() => signIn()}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-panel-fg/20 transition-colors hover:ring-panel-fg/50 disabled:opacity-60"
    >
      <GoogleLogo className="size-3.5" />
      <span className="hidden sm:inline">{loading ? "Redirecting…" : "Sign in"}</span>
    </button>
  );
}

/** A full-width card prompting sign-in, used by pages that need an account
 * (submitting a car, viewing your own listings) rather than the header's
 * compact pill button. `next` is where Google should return the visitor to. */
export function SignInPrompt({
  next,
  message = "Sign in to continue — we'll ask a few details once, then you're set.",
}: {
  next: string;
  message?: string;
}) {
  const { signIn, loading } = useGoogleSignIn();

  return (
    <div className="rounded-panel bg-panel p-6 text-panel-fg ring-1 ring-panel-fg/10">
      <p className="text-sm text-panel-fg/70">{message}</p>
      <button
        type="button"
        onClick={() => signIn(next)}
        disabled={loading}
        className="mt-4 rounded-control bg-brass px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {loading ? "Redirecting…" : "Continue with Google"}
      </button>
    </div>
  );
}

export function AccountMenu({ user }: { user: PublicUser }) {
  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="grid size-9 place-items-center rounded-full ring-1 ring-panel-fg/20 transition-colors hover:ring-panel-fg/50 focus:outline-none">
        <Avatar className="size-8">
          <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
          <AvatarFallback className="text-xs">{initials || "?"}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{user.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/favorites">Favorites</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/track-order">Track an order</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOutAndReload}>
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
