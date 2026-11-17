-- Clean up imported Haraj cars so they read well in the app and website.
-- Safe to re-run.

-- 1) Prices below SAR 5,000 are Haraj's "thousands" shorthand (e.g. "90" for
--    90,000) or placeholders. We can't know the real amount, so hide them
--    until someone corrects the price in the admin panel.
update public.cars set status = 'pending'
where id like 'haraj-%' and (price is null or price < 5000) and status = 'approved';

-- 2) Arabic model names -> English.
update public.cars set model = case
    when model = 'الفئة X' then 'X Series'
    when model = 'تاهو' then 'Tahoe'
    when model = 'سبارك' then 'Spark'
    when model = 'سوبربان' then 'Suburban'
    when model = 'ايفرست' then 'Everest'
    when model = 'توروس' then 'Taurus'
    when model = 'سييرا' then 'Sierra'
    when model = 'كولراي' then 'Coolray'
    when model = 'هافال H6' then 'H6'
    when model = 'ازيرا' then 'Azera'
    when model = 'اكسنت' then 'Accent'
    when model = 'النترا' then 'Elantra'
    when model = 'سوناتا' then 'Sonata'
    when model = 'سيراتو' then 'Cerato'
    when model = 'اوبتيما' then 'Optima'
    when model = 'بيجاس' then 'Pegas'
    when model = 'تاسمان' then 'Tasman'
    when model = 'كيا K4' then 'K4'
    when model = 'رنج روفر' then 'Range Rover'
    when model = 'مازدا 6' then 'Mazda 6'
    when model = 'سبيس ستار' then 'Space Star'
    when model = 'اكس تريل' then 'X-Trail'
    when model = 'باترول' then 'Patrol'
    when model = 'باثفندر' then 'Pathfinder'
    when model = 'صني' then 'Sunny'
    when model = 'كايين' then 'Cayenne'
    when model = 'ديزاير' then 'Dzire'
    when model = 'افالون' then 'Avalon'
    when model = 'راش' then 'Rush'
    when model = 'راف فور' then 'RAV4'
    when model = 'فورتونر' then 'Fortuner'
    when model = 'كامري' then 'Camry'
    when model = 'كورولا' then 'Corolla'
    when model = 'لاندكروزر' then 'Land Cruiser'
    when model = 'هايلوكس' then 'Hilux'
    when model = 'يارس' then 'Yaris'
    when model = 'ربع' and make = 'Toyota' then 'Land Cruiser'
    when model = 'ربع' and make = 'Nissan' then 'Patrol'
    else model
  end
where id like 'haraj-%' and model ~ '[؀-ۿ]';

-- 3) Clean, consistent titles: "2023 Toyota RAV4" (the original ad text was
--    free-form, often Arabic, and read badly on cards).
update public.cars
set title = year::text || ' ' || make || ' ' || model
where id like 'haraj-%' and model !~ '[؀-ۿ]';
