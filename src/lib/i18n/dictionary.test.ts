import { describe, expect, it } from "vitest";
import { formatNumber, formatSar, terms, tr, translations } from "./dictionary";

/** Every leaf path of a nested dictionary object, e.g. "checkout.moyasar". */
function leaves(node: unknown, path = ""): [string, unknown][] {
  if (node && typeof node === "object" && !Array.isArray(node)) {
    return Object.entries(node).flatMap(([key, value]) =>
      leaves(value, path ? `${path}.${key}` : key),
    );
  }
  return [[path, node]];
}

describe("translations", () => {
  const en = leaves(translations.en);
  const ar = leaves(translations.ar);

  it("has exactly the same keys in English and Arabic", () => {
    expect(ar.map(([key]) => key).sort()).toEqual(en.map(([key]) => key).sort());
  });

  it("has no empty strings in either language", () => {
    const empty = [...en, ...ar].filter(([, value]) => value === "").map(([key]) => key);
    expect(empty).toEqual([]);
  });

  it("actually translates: Arabic copy contains Arabic script", () => {
    const strings = ar.filter((entry): entry is [string, string] => typeof entry[1] === "string");
    const arabic = strings.filter(([, value]) => /[؀-ۿ]/.test(value));
    // Brand names, numbers and symbols legitimately stay Latin, so require a strong majority, not all.
    expect(arabic.length / strings.length).toBeGreaterThan(0.8);
  });
});

describe("terms", () => {
  it("has a non-empty English and Arabic value for every entry", () => {
    for (const [term, value] of Object.entries(terms)) {
      expect(value.en, `${term} (en)`).toBeTruthy();
      expect(value.ar, `${term} (ar)`).toBeTruthy();
    }
  });
});

describe("formatNumber", () => {
  it("formats English with Western digits and no decimals by default", () => {
    expect(formatNumber(125000, "en")).toBe("125,000");
  });

  it("formats Arabic with Arabic-Indic digits", () => {
    expect(formatNumber(125000, "ar")).toBe("١٢٥٬٠٠٠");
  });

  it("falls back to an em dash for non-finite values instead of throwing", () => {
    // Cars synced from the shared mobile app's submission flow can land with
    // null price/mileage — this guard is what keeps that from crashing the UI.
    expect(formatNumber(null as unknown as number, "en")).toBe("—");
    expect(formatNumber(undefined as unknown as number, "en")).toBe("—");
    expect(formatNumber(NaN, "en")).toBe("—");
  });

  it("respects fractionDigits", () => {
    expect(formatNumber(4.5, "en", 1)).toBe("4.5");
  });
});

describe("formatSar", () => {
  it("prefixes SAR in English", () => {
    expect(formatSar(50000, "en")).toBe("SAR 50,000");
  });

  it("suffixes ريال in Arabic", () => {
    expect(formatSar(50000, "ar")).toBe("٥٠٬٠٠٠ ريال");
  });

  it("falls back to an em dash for non-finite values", () => {
    expect(formatSar(NaN, "en")).toBe("—");
  });
});

describe("tr", () => {
  it("translates a known term into the target locale", () => {
    expect(tr("Used", "ar")).not.toBe("Used");
  });

  it("returns the original value unchanged when there's no translation entry", () => {
    // Real-world case: free-text values from the shared DB (e.g. a make/model
    // name) that were never added to the static terms dictionary.
    expect(tr("Some Untranslated Value", "ar")).toBe("Some Untranslated Value");
  });
});
