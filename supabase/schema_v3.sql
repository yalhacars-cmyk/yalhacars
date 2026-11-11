-- =============================================================================
-- Yalhacar — Supabase schema v3 (additive)
-- =============================================================================
--
-- Run this in the Supabase Dashboard → SQL Editor AFTER schema.sql, seed.sql
-- and schema_v2.sql have already been applied.
--
-- Adds real online payment support (Moyasar + Amwal) on top of the existing
-- reservation flow:
--   1. `reservations.provider_ref` / `paid_at` — track the gateway's own
--      payment/payment-link id and when payment actually landed.
--   2. `payment_method` now also allows 'moyasar' and 'amwal'.
--   3. Three more security-definer RPCs:
--        - `set_reservation_provider_ref` — called right after a payment is
--          initiated, to remember the gateway's payment/link id.
--        - `confirm_reservation_paid` — called only after the payment has
--          been independently re-verified with the gateway. Idempotent.
--        - `fail_reservation_payment` — called when a payment is declined/
--          abandoned, so the car goes back to `available` instead of sitting
--          `reserved` forever.
--
--      Unlike `create_reservation`/`lookup_reservation` in schema_v2.sql,
--      these three are granted to `service_role` ONLY, not `anon` — they
--      trust whatever provider/provider_ref they're given, so if `anon`
--      could call them, anyone could confirm any pending reservation as
--      paid straight from the browser console with no payment at all. Only
--      the Supabase Edge Functions in supabase/functions/ — which alone
--      talk to Moyasar/Amwal with the real secret keys, and run with the
--      auto-injected SUPABASE_SERVICE_ROLE_KEY — are meant to call these.
-- =============================================================================

alter table public.reservations
  add column if not exists provider_ref text,
  add column if not exists paid_at timestamptz;

alter table public.reservations drop constraint if exists reservations_payment_method_check;
alter table public.reservations add constraint reservations_payment_method_check
  check (payment_method in
    ('cash_on_delivery','bank_transfer','card_demo','tabby','tamara','moyasar','amwal'));

create or replace function public.set_reservation_provider_ref(
  p_order_number text, p_phone text, p_provider_ref text
) returns void
language sql security definer set search_path = public as $$
  update public.reservations
    set provider_ref = p_provider_ref
    where order_number = p_order_number and phone = p_phone and status = 'pending';
$$;

revoke all on function public.set_reservation_provider_ref(text, text, text) from public, anon, authenticated;
grant execute on function public.set_reservation_provider_ref(text, text, text) to service_role;

create or replace function public.confirm_reservation_paid(
  p_order_number text, p_provider text, p_provider_ref text
) returns public.reservations
language plpgsql security definer set search_path = public as $$
declare
  v_row public.reservations;
begin
  select * into v_row from public.reservations
    where order_number = p_order_number and payment_method = p_provider;
  if not found then
    raise exception 'reservation_not_found';
  end if;

  -- Idempotent: a webhook/poll can land more than once for the same
  -- payment, so a reservation that's already confirmed is just returned as-is.
  if v_row.status = 'confirmed' then
    return v_row;
  end if;
  if v_row.status <> 'pending' then
    raise exception 'reservation_not_pending';
  end if;

  update public.reservations
    set status = 'confirmed', paid_at = now(), provider_ref = coalesce(p_provider_ref, provider_ref)
    where id = v_row.id
    returning * into v_row;

  update public.cars set "status" = 'sold' where id = v_row.car_id;

  return v_row;
end;
$$;

revoke all on function public.confirm_reservation_paid(text, text, text) from public, anon, authenticated;
grant execute on function public.confirm_reservation_paid(text, text, text) to service_role;

create or replace function public.fail_reservation_payment(
  p_order_number text, p_provider text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_car_id text;
begin
  update public.reservations
    set status = 'cancelled'
    where order_number = p_order_number and payment_method = p_provider and status = 'pending'
    returning car_id into v_car_id;

  if v_car_id is not null then
    update public.cars set "status" = 'available' where id = v_car_id and "status" = 'reserved';
  end if;
end;
$$;

revoke all on function public.fail_reservation_payment(text, text) from public, anon, authenticated;
grant execute on function public.fail_reservation_payment(text, text) to service_role;
