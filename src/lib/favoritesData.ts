import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The signed-in visitor's own `favorites` rows — shared with the app, same
 * one-account-one-dataset reasoning as src/lib/profile.ts and
 * src/lib/sellerListing.ts. Plain authenticated client: RLS already grants
 * a user full access to their own rows ("Users manage their own favorites",
 * auth.uid() = user_id), nothing to bypass.
 *
 * Signed-out visitors still get a working favorites list — see
 * src/lib/favorites.tsx's localStorage fallback — this file only covers the
 * signed-in, account-backed path.
 */

export const getMyFavoriteIdsFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("favorites")
    .select("car_id")
    .eq("user_id", auth.user.id);
  if (error) throw new Error(error.message);
  return (data ?? []).map((f) => f.car_id as string);
});

export const setFavoriteFn = createServerFn({ method: "POST" })
  .validator(z.object({ car_id: z.string().min(1), favorited: z.boolean() }))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not signed in");

    if (data.favorited) {
      const { error } = await supabase
        .from("favorites")
        .upsert({ user_id: auth.user.id, car_id: data.car_id }, { onConflict: "user_id,car_id" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", auth.user.id)
        .eq("car_id", data.car_id);
      if (error) throw new Error(error.message);
    }
  });
