import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client for the public site's Google OAuth sign-in
 * (`src/routes/auth.callback.tsx`). Admin only ever uses email/password
 * (`adminLogin` in `@/lib/admin/auth`) — deliberately not Google, so an
 * admin session can never be started by someone who merely has a Google
 * account, the way any website visitor can.
 *
 * Unlike `@/lib/supabase/browser` (plain client, `persistSession: false`, used
 * for anonymous public reads), this one stores the PKCE code verifier in a
 * cookie via `@supabase/ssr` — the same storage `getSupabaseServerClient` reads
 * from, so the server-side callback can complete `exchangeCodeForSession`.
 */
export function getSupabaseBrowserAuthClient() {
  return createBrowserClient(
    import.meta.env["VITE_SUPABASE_URL"],
    import.meta.env["VITE_SUPABASE_ANON_KEY"],
  );
}
