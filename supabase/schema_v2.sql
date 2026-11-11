-- =============================================================================
-- Yalhacar — Supabase schema v2 (additive)
-- =============================================================================
--
-- Run this in the Supabase Dashboard → SQL Editor AFTER schema.sql + seed.sql
-- have already been applied. It only adds new objects — it never touches
-- existing `cars` rows or policies except for one new column.
--
-- Adds:
--   1. `cars.status` — available / reserved / sold, so a car can't be
--      reserved or bought twice.
--   2. `leads` — one flexible intake table backing every "submit a form"
--      flow (test drives, seller submissions, dealer/B2B contact, finance
--      applications, support tickets). Anyone can submit one; only a
--      signed-in admin can read/manage them.
--   3. `reservations` — one row per checkout. Writes go ONLY through the
--      `create_reservation` RPC below (never a direct insert), which
--      atomically flips the car to `reserved` — this is what actually
--      prevents two shoppers from reserving the same car at once. Reads for
--      shoppers go ONLY through `lookup_reservation` (order number + phone
--      must both match), so no one can browse other customers' orders.
-- =============================================================================

alter table public.cars
  add column if not exists "status" text not null default 'available'
    check ("status" in ('available','reserved','sold'));

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in
    ('test_drive','seller_submission','dealer_contact','b2b_contact',
     'finance_application','support_ticket','general_contact')),
  name text not null,
  phone text not null,
  email text,
  city text,
  car_id text references public.cars(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new','contacted','closed')),
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

create policy "Anyone can submit a lead" on public.leads
  for insert to anon, authenticated with check (true);

create policy "Authenticated can read leads" on public.leads
  for select to authenticated using (true);

create policy "Authenticated can update leads" on public.leads
  for update to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- reservations
-- ---------------------------------------------------------------------------

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  car_id text not null references public.cars(id),
  name text not null,
  phone text not null,
  email text,
  amount integer not null,
  payment_method text not null check (payment_method in ('cash_on_delivery','bank_transfer','card_demo','tabby','tamara')),
  delivery_type text not null check (delivery_type in ('delivery','pickup')),
  address jsonb,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '48 hours')
);

alter table public.reservations enable row level security;

-- No direct insert/select policy for anon on purpose — all anon access to
-- this table goes through the two security-definer RPCs below, which run
-- with the table owner's privileges regardless of RLS.
create policy "Authenticated can read reservations" on public.reservations
  for select to authenticated using (true);

create policy "Authenticated can update reservations" on public.reservations
  for update to authenticated using (true) with check (true);

create or replace function public.create_reservation(
  p_car_id text, p_name text, p_phone text, p_email text,
  p_amount int, p_payment_method text, p_delivery_type text, p_address jsonb
) returns public.reservations
language plpgsql security definer set search_path = public as $$
declare
  v_row public.reservations;
begin
  update public.cars set "status" = 'reserved'
    where id = p_car_id and "status" = 'available';
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

grant execute on function public.create_reservation(text, text, text, text, int, text, text, jsonb)
  to anon, authenticated;

create or replace function public.lookup_reservation(p_order_number text, p_phone text)
returns public.reservations
language sql security definer stable set search_path = public as $$
  select * from public.reservations
  where order_number = p_order_number and phone = p_phone
  limit 1;
$$;

grant execute on function public.lookup_reservation(text, text) to anon, authenticated;
