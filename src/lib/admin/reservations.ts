import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Admin-only reads/writes for `reservations` (orders). Same reasoning as
 * leads.ts — RLS only grants authenticated SELECT/UPDATE, direct table
 * writes for anon go only through the create_reservation RPC.
 */

export const listReservationsFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const updateReservationStatusFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      carId: z.string().min(1),
      status: z.enum(["pending", "confirmed", "cancelled", "expired"]),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = await requireAdmin();
    const { error } = await supabase
      .from("reservations")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // Keep the car row in sync: confirming a reservation sells the car,
    // cancelling/expiring one frees it back up for other shoppers.
    //
    // This is `availability`, not `status` — `cars.status` is the seller-listing
    // moderation flag (pending/approved), and writing "sold"/"available" there
    // drops the car out of the public list (listCars requires "approved").
    // The service-role client is needed because the live RLS on `cars` has no
    // admin carve-out, so the session client's update would match no rows.
    const availability =
      data.status === "confirmed"
        ? "sold"
        : data.status === "cancelled" || data.status === "expired"
          ? "available"
          : null;
    if (availability) {
      const { error: carError } = await getSupabaseAdminClient()
        .from("cars")
        .update({ availability })
        .eq("id", data.carId);
      if (carError) throw new Error(carError.message);
    }
    return { id: data.id };
  });
