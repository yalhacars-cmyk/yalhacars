import { createClient } from "@supabase/supabase-js";

/**
 * Public, unauthenticated Supabase client.
 *
 * This is the ONLY client used for public reads (car listing / car detail) and it
 * is called directly from route loaders — safe both during SSR and on client-side
 * navigation because `persistSession: false` means it never touches `window` or
 * `localStorage`. Anonymous `select` on `public.cars` is granted by RLS (see
 * `supabase/schema.sql`). Writes go through the server functions in `src/server/`.
 */
export const supabase = createClient(
  import.meta.env["VITE_SUPABASE_URL"],
  import.meta.env["VITE_SUPABASE_ANON_KEY"],
  { auth: { persistSession: false } },
);
