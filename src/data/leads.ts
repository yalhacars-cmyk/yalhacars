import { supabase } from "@/lib/supabase/browser";

/**
 * Lightweight, flexible intake table backing every "submit a form" flow that
 * doesn't need its own bespoke table: test drive bookings, seller valuation
 * submissions, dealer/B2B contact, finance applications and support tickets.
 * See `supabase/schema_v2.sql` for the DDL — anon can insert, only an
 * authenticated admin session can read/update (RLS-enforced).
 */
export type LeadType =
  | "test_drive"
  | "seller_submission"
  | "dealer_contact"
  | "b2b_contact"
  | "finance_application"
  | "support_ticket"
  | "general_contact";

export type LeadStatus = "new" | "contacted" | "closed";

export type Lead = {
  id: string;
  type: LeadType;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  car_id: string | null;
  payload: Record<string, unknown>;
  status: LeadStatus;
  created_at: string;
};

export type NewLead = {
  type: LeadType;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  carId?: string;
  payload?: Record<string, unknown>;
};

export async function createLead(input: NewLead): Promise<void> {
  const { error } = await supabase.from("leads").insert({
    type: input.type,
    name: input.name,
    phone: input.phone,
    email: input.email ?? null,
    city: input.city ?? null,
    car_id: input.carId ?? null,
    payload: input.payload ?? {},
  });
  if (error) throw new Error(error.message);
}

// Admin listing/status-changes for leads require the authenticated (cookie)
// session, not the anon browser client — see src/lib/admin/leads.ts
// (listLeadsFn / updateLeadStatusFn).
