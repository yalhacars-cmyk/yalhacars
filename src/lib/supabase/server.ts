import { createServerClient } from "@supabase/ssr";
import { getCookies, setCookie, deleteCookie } from "@tanstack/react-start/server";

/**
 * SERVER-ONLY Supabase client.
 *
 * It reads/writes the request-scoped cookie jar, so it may only be constructed
 * inside a `createServerFn(...).handler()` body — never imported from a route or
 * component module. The admin auth/CRUD server functions use it so the Supabase
 * session lives in httpOnly cookies and survives SSR page loads of `/admin/*`.
 *
 * Uses the anon key (public by design); RLS gates every write.
 */
export function getSupabaseServerClient() {
  return createServerClient(
    import.meta.env["VITE_SUPABASE_URL"],
    import.meta.env["VITE_SUPABASE_ANON_KEY"],
    {
      cookies: {
        getAll() {
          return Object.entries(getCookies()).map(([name, value]) => ({ name, value }));
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            if (!value) {
              deleteCookie(name, options);
            } else {
              setCookie(name, value, options);
            }
          }
        },
      },
    },
  );
}
