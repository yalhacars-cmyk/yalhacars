import { describe, expect, it } from "vitest";
import type { Car } from "@/data/cars";
import { heuristicMatch } from "./heuristic";

function makeCar(overrides: Partial<Car> & Pick<Car, "id">): Car {
  return {
    make: "Toyota",
    model: "Camry",
    price: 85_000,
    bodyType: "Sedan",
    condition: "Used",
    ...overrides,
  } as Car;
}

const camry = makeCar({ id: "camry" });
const prado = makeCar({
  id: "prado",
  model: "Prado",
  bodyType: "SUV",
  condition: "New",
  price: 250_000,
});
const vantage = makeCar({
  id: "vantage",
  make: "Aston Martin",
  model: "Vantage",
  bodyType: "Coupe",
  price: 600_000,
});
const van = makeCar({ id: "van", make: "Ford", model: "Transit", bodyType: "Van", price: 120_000 });
const inventory = [camry, prado, vantage, van];

const ids = (cars: Car[]) => cars.map((c) => c.id);

describe("heuristicMatch — budget", () => {
  it("filters by a comma-formatted budget", () => {
    const { matched } = heuristicMatch("something under 130,000", inventory);
    expect(ids(matched)).toEqual(["camry", "van"]);
  });

  it("does not mistake a model year for a budget", () => {
    // "2022" is a year, 90,000 is the budget — the Camry (85k) must still match.
    const { matched } = heuristicMatch("Camry 2022 under 90,000", inventory);
    expect(ids(matched)).toEqual(["camry"]);
  });

  it("applies no budget filter when the only number is a year", () => {
    const { matched } = heuristicMatch("toyota 2022", inventory);
    expect(ids(matched)).toEqual(["camry", "prado"]);
  });

  it("ignores digit runs too long to be a price (e.g. phone numbers)", () => {
    // Truncated to 7 digits this would read as a 500,000 budget and drop the 600k Vantage.
    const { matched } = heuristicMatch("aston martin vantage, call 0500000000", inventory);
    expect(ids(matched)).toEqual(["vantage"]);
  });
});

describe("heuristicMatch — keywords", () => {
  it("matches English and Arabic body-type keywords", () => {
    expect(ids(heuristicMatch("i want an SUV", inventory).matched)).toEqual(["prado"]);
    expect(ids(heuristicMatch("أبغى سيارة دفع رباعي", inventory).matched)).toEqual(["prado"]);
  });

  it("matches plural body-type keywords", () => {
    expect(ids(heuristicMatch("show me SUVs", inventory).matched)).toEqual(["prado"]);
  });

  it("matches condition keywords", () => {
    expect(ids(heuristicMatch("a new toyota", inventory).matched)).toEqual(["prado"]);
    expect(ids(heuristicMatch("used toyota", inventory).matched)).toEqual(["camry"]);
  });

  it("matches the brand case-insensitively", () => {
    expect(ids(heuristicMatch("any FORD?", inventory).matched)).toEqual(["van"]);
  });

  it("does not match a keyword buried inside another word", () => {
    // "vantage" contains "van", "renewed" contains "new" — neither is a filter.
    expect(ids(heuristicMatch("aston martin vantage", inventory).matched)).toEqual(["vantage"]);
    expect(ids(heuristicMatch("renewed toyota", inventory).matched)).toEqual(["camry", "prado"]);
  });

  it("combines filters", () => {
    const { matched } = heuristicMatch("new SUV under 300000", inventory);
    expect(ids(matched)).toEqual(["prado"]);
  });
});

describe("heuristicMatch — inventory rules", () => {
  it("never returns reserved or sold cars", () => {
    const cars = [
      makeCar({ id: "a" }),
      makeCar({ id: "b", availability: "reserved" }),
      makeCar({ id: "c", availability: "sold" }),
    ];
    expect(ids(heuristicMatch("toyota", cars).matched)).toEqual(["a"]);
  });

  it("returns at most 6 cars", () => {
    const many = Array.from({ length: 10 }, (_, i) => makeCar({ id: `car-${i}` }));
    expect(heuristicMatch("toyota", many).matched).toHaveLength(6);
  });
});

describe("heuristicMatch — replies", () => {
  it("uses singular and plural English wording", () => {
    expect(heuristicMatch("suv", inventory).reply).toBe("I found 1 car matching that:");
    expect(heuristicMatch("toyota", inventory).reply).toBe("I found 2 cars matching that:");
  });

  it("replies in Arabic when the query contains Arabic", () => {
    expect(heuristicMatch("سيارة دفع رباعي", inventory).reply).toBe("وجدت 1 سيارة تطابق طلبك:");
  });

  it("suggests widening the search when nothing matches, in the query's language", () => {
    const en = heuristicMatch("ferrari under 10000", inventory);
    expect(en.matched).toEqual([]);
    expect(en.reply).toMatch(/couldn't find an exact match/);

    const ar = heuristicMatch("فيراري تحت 10000", inventory);
    expect(ar.matched).toEqual([]);
    expect(ar.reply).toMatch(/لم أجد/);
  });
});
