import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * The seller-submission app (a separate codebase on this same Supabase
 * project — see getSupabaseAdminClient's doc comment) reads these five
 * tables to populate its car-submission form's dropdowns. Their RLS only
 * grants public SELECT of active rows — there's no admin write path at all
 * — so every write here goes through the service-role client, gated by
 * requireAdmin().
 */

export type CarMake = { id: string; name: string; sort_order: number; is_active: boolean };
export type CarModel = {
  id: string;
  make: string;
  model: string;
  sort_order: number;
  is_active: boolean;
};
export type VehicleOption = {
  id: string;
  field_key: string;
  value: string;
  sort_order: number;
  is_active: boolean;
};
export type VehicleYearRange = { id: string; min_year: number; max_year: number };
export type BodyType = {
  id: string;
  value: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
};

// --- car_makes ---------------------------------------------------------

export const listCarMakesFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { data, error } = await getSupabaseAdminClient()
    .from("car_makes")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as CarMake[];
});

export const createCarMakeFn = createServerFn({ method: "POST" })
  .validator(z.object({ name: z.string().min(1), sort_order: z.number().int().default(0) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient().from("car_makes").insert(data);
    if (error) throw new Error(error.message);
  });

export const updateCarMakeFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { id, ...patch } = data;
    const { error } = await getSupabaseAdminClient().from("car_makes").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
  });

export const deleteCarMakeFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient().from("car_makes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
  });

// --- car_models ---------------------------------------------------------

export const listCarModelsFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { data, error } = await getSupabaseAdminClient()
    .from("car_models")
    .select("*")
    .order("make", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as CarModel[];
});

export const createCarModelFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      make: z.string().min(1),
      model: z.string().min(1),
      sort_order: z.number().int().default(0),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient().from("car_models").insert(data);
    if (error) throw new Error(error.message);
  });

export const updateCarModelFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      make: z.string().min(1).optional(),
      model: z.string().min(1).optional(),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { id, ...patch } = data;
    const { error } = await getSupabaseAdminClient().from("car_models").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
  });

export const deleteCarModelFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient().from("car_models").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
  });

// --- vehicle_option_lists -------------------------------------------------

export const listVehicleOptionsFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { data, error } = await getSupabaseAdminClient()
    .from("vehicle_option_lists")
    .select("*")
    .order("field_key", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as VehicleOption[];
});

export const createVehicleOptionFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      field_key: z.string().min(1),
      value: z.string().min(1),
      sort_order: z.number().int().default(0),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient().from("vehicle_option_lists").insert(data);
    if (error) throw new Error(error.message);
  });

export const updateVehicleOptionFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      field_key: z.string().min(1).optional(),
      value: z.string().min(1).optional(),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { id, ...patch } = data;
    const { error } = await getSupabaseAdminClient()
      .from("vehicle_option_lists")
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
  });

export const deleteVehicleOptionFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient()
      .from("vehicle_option_lists")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  });

// --- vehicle_year_range (singleton) ---------------------------------------

export const getVehicleYearRangeFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { data, error } = await getSupabaseAdminClient()
    .from("vehicle_year_range")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as VehicleYearRange | null;
});

export const updateVehicleYearRangeFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({ id: z.string().uuid(), min_year: z.number().int(), max_year: z.number().int() })
      // An inverted range would leave the seller app's year dropdown empty.
      .refine((range) => range.min_year <= range.max_year, {
        message: "min_year must not be after max_year",
        path: ["min_year"],
      }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { id, ...patch } = data;
    const { error } = await getSupabaseAdminClient()
      .from("vehicle_year_range")
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
  });

// --- body_types -------------------------------------------------------

export const listBodyTypesFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { data, error } = await getSupabaseAdminClient()
    .from("body_types")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as BodyType[];
});

export const createBodyTypeFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      value: z.string(),
      image_url: z.string().min(1),
      sort_order: z.number().int().default(0),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient().from("body_types").insert(data);
    if (error) throw new Error(error.message);
  });

export const updateBodyTypeFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      value: z.string().optional(),
      image_url: z.string().min(1).optional(),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { id, ...patch } = data;
    const { error } = await getSupabaseAdminClient().from("body_types").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
  });

export const deleteBodyTypeFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient().from("body_types").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
  });
