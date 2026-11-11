import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Read/write access to customer activity tables (orders, finance_applications,
 * test_drive_bookings, favorites) — one account, one set of data, regardless
 * of whether the customer acted through the app or the website. (Distinct
 * from this app's own `orders`-less checkout via `reservations` — see
 * src/lib/admin/reservations.ts and the Reservations admin page — which
 * predates the shared account system.) Same reasoning as
 * src/lib/admin/catalog.ts: RLS only lets a row's own user manage it, so
 * admin visibility requires the service-role client.
 *
 * `user_id` only has a FK to `auth.users`, not to `public.profiles`, so
 * PostgREST can't embed a profiles join — each list function fetches
 * profiles separately and merges by user_id in JS.
 */

type Profile = { user_id: string; full_name: string; phone: string };

async function profilesByUserId(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  userIds: string[],
): Promise<Map<string, Profile>> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return new Map();
  const { data, error } = await admin
    .from("profiles")
    .select("user_id, full_name, phone")
    .in("user_id", unique);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((p: Profile) => [p.user_id, p]));
}

// --- orders ---------------------------------------------------------------

export type CustomerOrder = {
  id: string;
  order_reference: string;
  user_id: string;
  car_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  delivery_option: string;
  vehicle_price: number;
  vat_amount: number;
  delivery_fee: number;
  total_amount: number;
  status: string;
  created_at: string;
};

export const listOrdersFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { data, error } = await getSupabaseAdminClient()
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CustomerOrder[];
});

export const updateOrderStatusFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), status: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient()
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  });

// --- finance_applications -------------------------------------------------

export type FinanceApplication = {
  id: string;
  user_id: string;
  car_id: string | null;
  full_name: string;
  phone: string;
  employment_status: string;
  employer_name: string | null;
  monthly_income: number | null;
  national_id_uploaded: boolean;
  salary_certificate_uploaded: boolean;
  status: string;
  created_at: string;
};

export const listFinanceApplicationsFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { data, error } = await getSupabaseAdminClient()
    .from("finance_applications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as FinanceApplication[];
});

export const updateFinanceApplicationStatusFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), status: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient()
      .from("finance_applications")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  });

// --- test_drive_bookings ---------------------------------------------------

export type TestDriveBooking = {
  id: string;
  user_id: string;
  car_id: string;
  branch: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  created_at: string;
  profile: Profile | null;
};

export const listTestDriveBookingsFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("test_drive_bookings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const profiles = await profilesByUserId(
    admin,
    rows.map((r: { user_id: string }) => r.user_id),
  );
  return rows.map((r: Omit<TestDriveBooking, "profile">) => ({
    ...r,
    profile: profiles.get(r.user_id) ?? null,
  })) as TestDriveBooking[];
});

export const updateTestDriveBookingStatusFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), status: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient()
      .from("test_drive_bookings")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  });

// --- favorites (read + remove only — no status concept) -------------------

export type Favorite = {
  user_id: string;
  car_id: string;
  created_at: string;
  profile: Profile | null;
};

export const listFavoritesFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("favorites")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const profiles = await profilesByUserId(
    admin,
    rows.map((r: { user_id: string }) => r.user_id),
  );
  return rows.map((r: Omit<Favorite, "profile">) => ({
    ...r,
    profile: profiles.get(r.user_id) ?? null,
  })) as Favorite[];
});

export const deleteFavoriteFn = createServerFn({ method: "POST" })
  .validator(z.object({ user_id: z.string().uuid(), car_id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient()
      .from("favorites")
      .delete()
      .eq("user_id", data.user_id)
      .eq("car_id", data.car_id);
    if (error) throw new Error(error.message);
  });
