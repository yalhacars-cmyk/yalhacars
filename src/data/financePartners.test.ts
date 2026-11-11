import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FINANCE_PARTNERS, partnerLogo } from "./financePartners";

const withArabicLogo = FINANCE_PARTNERS.find((p) => "logoAr" in p)!;
const withoutArabicLogo = FINANCE_PARTNERS.find((p) => !("logoAr" in p))!;

describe("partnerLogo", () => {
  it("uses the Arabic lockup in Arabic when the partner ships one", () => {
    expect(partnerLogo(withArabicLogo, "ar")).toBe(
      "logoAr" in withArabicLogo ? withArabicLogo.logoAr : undefined,
    );
  });

  it("falls back to the shared logo in Arabic when there is no Arabic lockup", () => {
    expect(partnerLogo(withoutArabicLogo, "ar")).toBe(withoutArabicLogo.logo);
  });

  it("always uses the shared logo in English", () => {
    for (const partner of FINANCE_PARTNERS) expect(partnerLogo(partner, "en")).toBe(partner.logo);
  });
});

describe("FINANCE_PARTNERS", () => {
  it("has English and Arabic copy for every partner", () => {
    for (const p of FINANCE_PARTNERS) {
      expect(p.name.en).toBeTruthy();
      expect(p.name.ar).toMatch(/[؀-ۿ]/);
      expect(p.term.en).toBeTruthy();
      expect(p.term.ar).toMatch(/[؀-ۿ]/);
    }
  });

  it("has unique partner names", () => {
    const names = FINANCE_PARTNERS.map((p) => p.name.en);
    expect(new Set(names).size).toBe(names.length);
  });

  it("points every logo at a file that actually exists in /public", () => {
    const logos = FINANCE_PARTNERS.flatMap((p) => [p.logo, "logoAr" in p ? p.logoAr : undefined]);
    for (const logo of logos.filter((l): l is string => Boolean(l))) {
      expect(existsSync(join(process.cwd(), "public", logo)), `${logo} is missing`).toBe(true);
    }
  });
});
