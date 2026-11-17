-- Remove every visible trace of the import source from imported cars, so the
-- marketplace shows clean Yalhacar listings. Safe to re-run.
--
-- The original ad link stays only in the private `source_url` column (used by
-- the admin and for de-duplicating re-imports); it is no longer shown or
-- repeated in the public description.

-- 1) Description: drop the "Source: ..." footer, Haraj's placeholder text and
--    sellers' own phone numbers (customers should contact Yalhacar, and private
--    sellers' numbers should not be republished).
update public.cars
set details = nullif(btrim(
      regexp_replace(
      regexp_replace(
      regexp_replace(details,
        '\s*Source: https?://\S+', '', 'g'),
        '\(\s*Phone number appears when clicking the contact button\s*\)', '', 'gi'),
        '(\+?966|00966|\y0)?5[0-9]{8}', '', 'g')
    ), '')
where id like 'haraj-%' and details is not null;

-- 2) Internal import tag is not for customers.
update public.cars set tags = '{}' where id like 'haraj-%';

-- 3) Lease-handover ads ("للتنازل" / "تقبيل") are not normal sales: keep hidden.
update public.cars set status = 'pending'
where id like 'haraj-%' and status = 'approved' and details ~ '(للتنازل|للتقبيل|تقبيل)';

-- 4) De-duplication key for re-imports, now that ids no longer carry the source.
alter table public.cars drop constraint if exists cars_source_url_key;
alter table public.cars add constraint cars_source_url_key unique (source_url);

-- 5) Neutral ids and stock numbers: haraj-192405751 / HRJ-192405751 -> yc-192405751 / YC-405751
--    (nothing references these cars yet; reservations/leads would block the rename).
update public.cars
set stock = 'YC-' || right(substr(id, 7), 6),
    id = 'yc-' || substr(id, 7)
where id like 'haraj-%';

-- 6) Many imported ads are other dealers' showroom adverts (their branches and
--    phone numbers). Don't republish free-form seller text at all: describe
--    the car from its own structured details instead.
update public.cars
set details = concat_ws(' ',
      year::text || ' ' || make || ' ' || model || '.',
      nullif(concat_ws(', ',
        nullif(coalesce("bodyType", ''), ''),
        nullif(coalesce(gear_type, ''), ''),
        nullif(coalesce(fuel, ''), ''),
        case when coalesce("mileageKm", 0) > 0 then to_char("mileageKm", 'FM999G999G999') || ' km' end
      ), '') || case when city is not null and city <> '' then ', located in ' || city || '.' else '.' end,
      'Contact Yalhacar to view the car, arrange an inspection or ask about finance.'
    )
where id like 'yc-%';

-- 7) Kia Cerato was imported under the wrong brands.
update public.cars set make = 'Kia' where model = 'Cerato' and make <> 'Kia';

-- 8) Keep titles in step with the corrected make/model.
update public.cars set title = year::text || ' ' || make || ' ' || model where id like 'yc-%';
