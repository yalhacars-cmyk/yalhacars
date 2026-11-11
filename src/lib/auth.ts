import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Public site authentication (any signed-in customer — not admin). Uses the
 * same Supabase Auth session/cookies as everything else on this shared
 * project, since it's one account system across the website, the app, and
 * this admin panel; see `getSupabaseAdminClient`'s doc comment for the admin
 * side of that. `src/lib/admin/auth.ts` is the separate, admin-scoped
 * counterpart to this file.
 */

export type PublicUser = {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
};

function toPublicUser(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): PublicUser {
  const meta = user.user_metadata ?? {};
  const name =
    (typeof meta["full_name"] === "string" && meta["full_name"]) ||
    (typeof meta["name"] === "string" && meta["name"]) ||
    user.email ||
    "Account";
  const avatarUrl =
    (typeof meta["avatar_url"] === "string" && meta["avatar_url"]) ||
    (typeof meta["picture"] === "string" && meta["picture"]) ||
    null;
  return { id: user.id, email: user.email ?? null, name, avatarUrl };
}

export const getCurrentUserFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return toPublicUser(data.user);
});

export const signOutFn = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  await supabase.auth.signOut();
});

/** Completes the Google OAuth flow: swaps the redirect `code` for a session. */
export const exchangePublicOAuthCode = createServerFn({ method: "POST" })
  .validator(z.object({ code: z.string().min(1) }))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(data.code);
    return { error: error?.message ?? null };
  });
