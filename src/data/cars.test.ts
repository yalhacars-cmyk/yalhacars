import { describe, expect, it } from "vitest";
import { carAvailability, isAvailable } from "./cars";

describe("carAvailability", () => {
  it("defaults to available for rows written before the column existed", () => {
    expect(carAvailability({})).toBe("available");
  });

  it("passes through an explicit value", () => {
    expect(carAvailability({ availability: "reserved" })).toBe("reserved");
    expect(carAvailability({ availability: "sold" })).toBe("sold");
  });
});

describe("isAvailable", () => {
  it("is true only for available", () => {
    expect(isAvailable({ availability: "available" })).toBe(true);
    expect(isAvailable({})).toBe(true);
    expect(isAvailable({ availability: "reserved" })).toBe(false);
    expect(isAvailable({ availability: "sold" })).toBe(false);
  });
});
