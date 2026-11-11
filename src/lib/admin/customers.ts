import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * The `profiles` table — one row per customer account, shared across every
 * client (app and website alike), including `national_id` and a storage
 * path to their uploaded ID document, plus (see
 * supabase/add_dealer_account_type.sql) the dealer fields. Same RLS gap as
 * the other customer activity tables (each user can only read/write their
 * own row), so this goes through the service-role client. Handle with more
 * care than the other admin tables: this is real PII, not just business
 * data — the admin UI masks `national_id` by default.
 *
 * `dealer_verified` is deliberately never writable by the app's own code
 * (mobile or web) — only `setDealerVerifiedFn` here sets it, same pattern
 * as `cars.status`/`approveCarFn`.
 */

export type AccountType = "individual" | "dealer";
export type DealerStoreStatus = "pending" | "approved" | "rejected";

export type DealerStore = {
  store_name: string;
  logo_path: string | null;
  logo_url: string | null;
  status: DealerStoreStatus;
};

export type Profile = {
  user_id: string;
  /** From `auth.users`, not `profiles` — always present, even before the
   * visitor ever fills in their profile. */
  email: string | null;
  full_name: string;
  phone: string;
  city: string;
  national_id: string;
  national_id_document_path: string | null;
  account_type: AccountType;
  business_name: string | null;
  cr_number: string | null;
  cr_document_path: string | null;
  dealer_verified: boolean;
  /** @deprecated superseded by `dealer_store` — kept only because the column
   * still exists on old rows written before the dealer_stores table. */
  store_name: string | null;
  /** @deprecated superseded by `dealer_store` */
  store_logo_url: string | null;
  consented_at: string;
  created_at: string;
  updated_at: string;
  /** False for a visitor who signed in but never completed "Complete your
   * details" — every other field below is a placeholder/default in that
   * case, not real profile data. */
  has_profile: boolean;
  /** Signed, time-limited URLs — not DB columns. Populated by listCustomersFn
   * because both source paths live in private buckets. */
  national_id_document_url?: string | null;
  cr_document_url?: string | null;
  /** This dealer's storefront branding + review status, from the separate
   * `dealer_stores` table — null for individuals or a dealer who hasn't set
   * one up yet. */
  dealer_store?: DealerStore | null;
};

const NATIONAL_ID_BUCKET = "national-id-documents";
const DEALER_DOCS_BUCKET = "dealer-documents";
const DEALER_STORE_LOGO_BUCKET = "dealer-store-logos";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Every Google-sign-in customer account, paginated — `auth.users` has no
 * public/anon read path at all, so this is service-role only, same as
 * everything else here. Filtered to the `google` provider because that's
 * the *only* sign-in method a customer ever uses (see useGoogleSignIn in
 * AuthControls.tsx) — admin accounts share this same auth.users table but
 * sign in with email/password on a separate page, so this filter is what
 * actually excludes admin logins from showing up as "customers".
 */
async function listAllAuthUsers(supabase: ReturnType<typeof getSupabaseAdminClient>) {
  const perPage = 200;
  const users: { id: string; email: string | null; created_at: string }[] = [];
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    for (const u of data.users) {
      if (u.app_metadata?.["provider"] !== "google") continue;
      users.push({ id: u.id, email: u.email ?? null, created_at: u.created_at });
    }
    if (data.users.length < perPage) break;
  }
  return users;
}

/**
 * Every account that ever signed in — not just the ones who completed
 * "Complete your details" — left-joined with `profiles` and `dealer_stores`
 * where they exist. A visitor who signed in with Google but abandoned the
 * profile step still shows up here (with `has_profile: false` and
 * placeholder fields), which is the whole point: admin shouldn't lose track
 * of an account just because onboarding wasn't finished.
 */
export const listCustomersFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const supabase = getSupabaseAdminClient();
  const [authUsers, { data, error }, { data: storeRows, error: storeError }] = await Promise.all([
    listAllAuthUsers(supabase),
    supabase.from("profiles").select("*"),
    supabase.from("dealer_stores").select("*"),
  ]);
  if (error) throw new Error(error.message);
  if (storeError) throw new Error(storeError.message);
  const profilesByUser = new Map((data ?? []).map((p) => [p["user_id"] as string, p]));

  const storesByUser = new Map(
    (storeRows ?? []).map((s) => [
      s["user_id"] as string,
      {
        store_name: s["store_name"] as string,
        logo_path: (s["logo_path"] as string | null) ?? null,
        logo_url: s["logo_path"]
          ? supabase.storage.from(DEALER_STORE_LOGO_BUCKET).getPublicUrl(s["logo_path"] as string)
              .data.publicUrl
          : null,
        status: s["status"] as DealerStoreStatus,
      },
    ]),
  );

  const merged = authUsers.map((u) => {
    const p = profilesByUser.get(u.id);
    return {
      user_id: u.id,
      email: u.email,
      full_name: (p?.["full_name"] as string | undefined) ?? u.email ?? u.id,
      phone: (p?.["phone"] as string | undefined) ?? "",
      city: (p?.["city"] as string | undefined) ?? "",
      national_id: (p?.["national_id"] as string | undefined) ?? "",
      national_id_document_path: (p?.["national_id_document_path"] as string | null) ?? null,
      account_type: (p?.["account_type"] as AccountType | undefined) ?? "individual",
      business_name: (p?.["business_name"] as string | null) ?? null,
      cr_number: (p?.["cr_number"] as string | null) ?? null,
      cr_document_path: (p?.["cr_document_path"] as string | null) ?? null,
      dealer_verified: (p?.["dealer_verified"] as boolean | undefined) ?? false,
      store_name: (p?.["store_name"] as string | null) ?? null,
      store_logo_url: (p?.["store_logo_url"] as string | null) ?? null,
      consented_at: (p?.["consented_at"] as string | undefined) ?? u.created_at,
      created_at: (p?.["created_at"] as string | undefined) ?? u.created_at,
      updated_at: (p?.["updated_at"] as string | undefined) ?? u.created_at,
      has_profile: p !== undefined,
    };
  });
  merged.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return Promise.all(
    merged.map(async (p) => {
      const [nationalIdUrl, crUrl] = await Promise.all([
        p.national_id_document_path
          ? supabase.storage
              .from(NATIONAL_ID_BUCKET)
              .createSignedUrl(p.national_id_document_path, SIGNED_URL_TTL_SECONDS)
              .then((r) => r.data?.signedUrl ?? null)
          : null,
        p.cr_document_path
          ? supabase.storage
              .from(DEALER_DOCS_BUCKET)
              .createSignedUrl(p.cr_document_path, SIGNED_URL_TTL_SECONDS)
              .then((r) => r.data?.signedUrl ?? null)
          : null,
      ]);
      return {
        ...p,
        national_id_document_url: nationalIdUrl,
        cr_document_url: crUrl,
        dealer_store: storesByUser.get(p.user_id) ?? null,
      } satisfies Profile;
    }),
  );
});

export const updateCustomerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      user_id: z.string().uuid(),
      full_name: z.string().min(1).optional(),
      phone: z.string().min(1).optional(),
      city: z.string().min(1).optional(),
      national_id: z.string().min(1).optional(),
      business_name: z.string().nullable().optional(),
      cr_number: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    // Upsert, not update — the customer may have signed in but never
    // completed their own profile form, in which case there's no existing
    // row for `.update()` to match (see listCustomersFn's has_profile).
    const { error } = await getSupabaseAdminClient()
      .from("profiles")
      .upsert({ ...data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
  });

/** Admin approves (or revokes) a dealer's verification — the only writer of `dealer_verified`. */
export const setDealerVerifiedFn = createServerFn({ method: "POST" })
  .validator(z.object({ user_id: z.string().uuid(), verified: z.boolean() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient()
      .from("profiles")
      .update({ dealer_verified: data.verified, updated_at: new Date().toISOString() })
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
  });

/**
 * Admin approves/rejects/resets a dealer's storefront branding. This is the
 * only writer of `dealer_stores.status` — the live
 * `protect_dealer_store_status_trigger` blocks any other client (including
 * the dealer themselves via saveMyDealerStoreFn) from changing it, same
 * pattern as `dealer_verified` above.
 */
export const setDealerStoreStatusFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      user_id: z.string().uuid(),
      status: z.enum(["pending", "approved", "rejected"]),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { error } = await getSupabaseAdminClient()
      .from("dealer_stores")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
  });
