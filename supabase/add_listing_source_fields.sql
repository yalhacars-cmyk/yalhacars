-- Extra fields from imported (Haraj) listings: neighbourhood, when the ad was
-- originally posted, and a link to the source ad. All nullable, so existing
-- rows and seller-submitted cars are unaffected. Safe to re-run.
-- Run in: Supabase Dashboard -> SQL Editor.

alter table public.cars add column if not exists neighborhood text;
alter table public.cars add column if not exists posted_at timestamptz;
alter table public.cars add column if not exists source_url text;

create index if not exists cars_posted_at_idx on public.cars (posted_at desc);

-- Backfill from the description footer the first import wrote
-- ("Source: https://haraj.com.sa/...").
update public.cars
set source_url = substring(details from 'Source: (https?://\S+)')
where id like 'haraj-%' and source_url is null and details like '%Source: http%';
