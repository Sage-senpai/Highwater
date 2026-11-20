import { describe, it, expect } from "vitest";
import { classifyDay, buildForecastDays, type HeatColdThresholds } from "./heatlevels.js";

const thresholds: HeatColdThresholds = { heatP95: 40, coldP5: 15, yearsOfData: 20 };

describe("classifyDay", () => {
  it("flags HEAT_RISK when apparent max is above the cell's own p95", () => {
    expect(classifyDay(41, 20, thresholds)).toBe("HEAT_RISK");
  });

  it("does not flag HEAT_RISK at exactly p95 (boundary)", () => {
    expect(classifyDay(40, 20, thresholds)).toBe("NONE");
  });

  it("flags COLD_RISK when min temp is below the cell's own p5", () => {
    expect(classifyDay(30, 14, thresholds)).toBe("COLD_RISK");
  });

  it("does not flag COLD_RISK at exactly p5 (boundary)", () => {
    expect(classifyDay(30, 15, thresholds)).toBe("NONE");
  });

  it("returns NONE for an ordinary day", () => {
    expect(classifyDay(32, 22, thresholds)).toBe("NONE");
  });

  it("prefers HEAT_RISK if both conditions somehow hold (should not happen with sane thresholds)", () => {
    expect(classifyDay(45, 10, thresholds)).toBe("HEAT_RISK");
  });
});

describe("buildForecastDays", () => {
  it("builds a day entry per date with the right flag", () => {
    const days = buildForecastDays(
      ["2026-11-20", "2026-11-21"],
      [41, 30],
      [20, 14],
      thresholds
    );
    expect(days[0].flag).toBe("HEAT_RISK");
    expect(days[1].flag).toBe("COLD_RISK");
  });

  it("treats a null forecast value as not triggering a flag", () => {
    const days = buildForecastDays(["2026-11-20"], [null], [null], thresholds);
    expect(days[0].flag).toBe("NONE");
  });
});
