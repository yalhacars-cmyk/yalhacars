import type { Car } from "@/data/cars";
import { isAvailable } from "@/data/cars";

/**
 * Local, no-API fallback used when Groq is unavailable (missing key, rate
 * limited, network error) so the assistant never just breaks. Parses a
 * budget number, body type, brand and condition out of free text (EN + AR
 * keywords) and filters the real inventory — never invents a car.
 */

const BODY_TYPE_KEYWORDS: Record<string, string[]> = {
  SUV: ["suv", "دفع رباعي", "جبلية"],
  Sedan: ["sedan", "صالون", "سيدان"],
  Coupe: ["coupe", "كوبيه"],
  "Pick Up": ["pickup", "pick up", "بيكب"],
  Hatchback: ["hatchback", "هاتشباك"],
  Van: ["van", "فان"],
  MPV: ["mpv"],
  Crossover: ["crossover", "كروس"],
};

const CONDITION_KEYWORDS: Record<Car["condition"], string[]> = {
  New: ["new", "جديدة", "جديد"],
  Used: ["used", "مستعملة", "مستعمل"],
  Certified: ["certified", "معتمدة", "معتمد"],
};

// Model years people type alongside a budget ("Camry 2022 under 90,000") —
// no car here is priced this low, so a number in this range is a year.
const YEAR_MIN = 1980;
const YEAR_MAX = 2039;

/** First standalone 4–7 digit number that isn't a model year. */
function parseBudget(text: string): number | null {
  const numbers = Array.from(text.replace(/,/g, "").matchAll(/\b\d{4,7}\b/g), (m) => Number(m[0]));
  return numbers.find((n) => n < YEAR_MIN || n > YEAR_MAX) ?? null;
}

/**
 * Whole-word match for Latin keywords (so "van" doesn't hit "vantage" and
 * "new" doesn't hit "renewed"; a trailing "s" allows plurals like "SUVs").
 * `\b` is ASCII-only, so Arabic keywords fall back to a substring match.
 */
function mentions(text: string, keyword: string): boolean {
  return /^[\x20-\x7e]+$/.test(keyword)
    ? new RegExp(`\\b${keyword}s?\\b`).test(text)
    : text.includes(keyword);
}

export function heuristicMatch(query: string, cars: Car[]): { reply: string; matched: Car[] } {
  const q = query.toLowerCase();
  const budget = parseBudget(q);

  const bodyType = Object.entries(BODY_TYPE_KEYWORDS).find(([, keywords]) =>
    keywords.some((k) => mentions(q, k)),
  )?.[0];

  const condition = (Object.entries(CONDITION_KEYWORDS) as [Car["condition"], string[]][]).find(
    ([, keywords]) => keywords.some((k) => mentions(q, k)),
  )?.[0];

  const brand = Array.from(new Set(cars.map((c) => c.make))).find((make) =>
    q.includes(make.toLowerCase()),
  );

  let results = cars.filter(isAvailable);
  if (budget) results = results.filter((c) => c.price <= budget);
  if (bodyType) results = results.filter((c) => c.bodyType === bodyType);
  if (condition) results = results.filter((c) => c.condition === condition);
  if (brand) results = results.filter((c) => c.make === brand);

  results = results.slice(0, 6);

  const isArabic = /[؀-ۿ]/.test(query);
  const reply = results.length
    ? isArabic
      ? `وجدت ${results.length} سيارة تطابق طلبك:`
      : `I found ${results.length} car${results.length === 1 ? "" : "s"} matching that:`
    : isArabic
      ? "لم أجد سيارات مطابقة تمامًا — جرّب توسيع الميزانية أو تغيير الفئة."
      : "I couldn't find an exact match in current inventory — try widening the budget or body type.";

  return { reply, matched: results };
}
