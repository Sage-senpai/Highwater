import { describe, it, expect } from "vitest";
import { buildAlertText, isAscii, toAsciiSafe, formatPeakDate } from "./alerttext.js";

describe("formatPeakDate", () => {
  it("formats an ISO date as day and short month", () => {
    expect(formatPeakDate("2026-11-12")).toBe("12 Nov");
  });
});

describe("toAsciiSafe", () => {
  it("replaces an em dash with a hyphen", () => {
    expect(toAsciiSafe("a—b")).toBe("a-b");
  });
  it("replaces curly quotes with straight quotes", () => {
    expect(toAsciiSafe("‘hi’")).toBe("'hi'");
  });
});

describe("buildAlertText", () => {
  const cases: Array<AlertCase> = [
    { facilityName: "Kogi PHC X", state: "Kogi", level: "WATCH", peakDate: "2026-11-12" },
    { facilityName: "Onitsha General Clinic", state: "Anambra", level: "WARNING", peakDate: "2026-12-01" },
    { facilityName: "Lokoja Primary Health Center", state: "Kogi", level: "SEVERE", peakDate: "2026-09-09" },
  ];
  type AlertCase = Parameters<typeof buildAlertText>[0];

  for (const c of cases) {
    it(`stays at or under 160 ASCII characters for ${c.level}`, () => {
      const text = buildAlertText(c);
      expect(isAscii(text)).toBe(true);
      expect(text.length).toBeLessThanOrEqual(160);
    });
  }

  it("mentions the facility name and state", () => {
    const text = buildAlertText(cases[0]);
    expect(text).toContain("Kogi PHC X");
    expect(text).toContain("Kogi");
  });

  it("shortens a very long facility name to stay under the limit", () => {
    const text = buildAlertText({
      facilityName: "Comprehensive Primary Health Center and Maternity Annex of Greater Metropolitan Lokoja Local Government Area",
      state: "Kogi",
      level: "WARNING",
      peakDate: "2026-11-12",
    });
    expect(isAscii(text)).toBe(true);
    expect(text.length).toBeLessThanOrEqual(160);
  });
});
