-- =============================================================================
-- Yalhacar — Supabase schema v4 (additive)
-- =============================================================================
--
-- Run this in the Supabase Dashboard → SQL Editor AFTER schema.sql, seed.sql,
-- schema_v2.sql and schema_v3.sql have already been applied.
--
-- `cars.status` has been repurposed (outside this app's codebase) as a
-- seller-listing moderation flag — 'pending' while awaiting admin review,
-- 'approved' once live — with its check constraint changed to match. That
-- collides with what this app's reservation flow and admin inventory panel
-- were using the same column for: 'available' / 'reserved' / 'sold', so a
-- car could never be reserved (create_reservation's `where status =
-- 'available'` could never match) and admin could never save a car (its
-- insert/update sent 'available' straight into a column that now only
-- accepts 'pending'/'approved').
--
-- This adds a SEPARATE `cars.availability` column for that concern and
-- repoints every place in this app that used to read/write `cars.status`
-- for availability at it instead. `cars.status` itself is untouched — still
-- whatever the moderation feature expects — so this is safe to run whether
-- or not that feature has code here yet.
-- =============================================================================

alter table public.cars
  add column if not exists availability text not null default 'available'
    check (availability in ('available', 'reserved', 'sold'));

-- Backfill from the actual reservation state rather than assuming every car
-- is available: a car with a live pending reservation is genuinely
-- `reserved`, one with a confirmed reservation is genuinely `sold`.
update public.cars c
  set availability = 'reserved'
  where exists (
    select 1 from public.reservations r where r.car_id = c.id and r.status = 'pending'
  );

update public.cars c
  set availability = 'sold'
  where exists (
    select 1 from public.reservations r where r.car_id = c.id and r.status = 'confirmed'
  );

create or replace function public.create_reservation(
  p_car_id text, p_name text, p_phone text, p_email text,
  p_amount int, p_payment_method text, p_delivery_type text, p_address jsonb
) returns public.reservations
language plpgsql security definer set search_path = public as $$
declare
  v_row public.reservations;
begin
  update public.cars set availability = 'reserved'
    where id = p_car_id and availability = 'available';
  if not found then
    raise exception 'car_unavailable';
  end if;

  insert into public.reservations
    (order_number, car_id, name, phone, email, amount, payment_method, delivery_type, address)
  values (
    'YLH-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(md5(random()::text), 1, 5)),
    p_car_id, p_name, p_phone, p_email, p_amount, p_payment_method, p_delivery_type, p_address
  )
  returning * into v_row;

  return v_row;
end;
$$;

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

  update public.cars set availability = 'sold' where id = v_row.car_id;

  return v_row;
end;
$$;

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
    update public.cars set availability = 'available' where id = v_car_id and availability = 'reserved';
  end if;
end;
$$;
