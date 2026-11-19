import { describe, it, expect } from "vitest";
import { computeLevel, FLOOR_M3S } from "./levels.js";

const baseCell = {
  p50: 500,
  p95: 1000,
  p99: 1500,
  max2022: 2000,
  yearsOfData: 30,
  lowConfidence: false,
};

describe("computeLevel", () => {
  it("returns NO_SIGNAL when the cell median is below the floor", () => {
    const cell = { ...baseCell, p50: FLOOR_M3S - 1 };
    const result = computeLevel(5000, cell);
    expect(result.level).toBe("NO_SIGNAL");
    expect(result.ratioToP95).toBeNull();
  });

  it("returns NORMAL at or below p95 (boundary equality)", () => {
    expect(computeLevel(1000, baseCell).level).toBe("NORMAL");
    expect(computeLevel(999, baseCell).level).toBe("NORMAL");
  });

  it("returns WATCH just above p95", () => {
    expect(computeLevel(1000.01, baseCell).level).toBe("WATCH");
  });

  it("returns WATCH at the p99 boundary (not above it)", () => {
    expect(computeLevel(1500, baseCell).level).toBe("WATCH");
  });

  it("returns WARNING just above p99", () => {
    expect(computeLevel(1500.01, baseCell).level).toBe("WARNING");
  });

  it("returns WARNING at the 2022 max boundary (not above it)", () => {
    expect(computeLevel(2000, baseCell).level).toBe("WARNING");
  });

  it("returns SEVERE just above the 2022 annual maximum", () => {
    expect(computeLevel(2000.01, baseCell).level).toBe("SEVERE");
  });

  it("flags LOW_CONFIDENCE when years of data is under 20", () => {
    const cell = { ...baseCell, yearsOfData: 15 };
    expect(computeLevel(500, cell).lowConfidence).toBe(true);
  });

  it("flags LOW_CONFIDENCE when the cell itself is marked low confidence (plateau)", () => {
    const cell = { ...baseCell, lowConfidence: true };
    expect(computeLevel(500, cell).lowConfidence).toBe(true);
  });

  it("computes ratioToP95", () => {
    const result = computeLevel(1200, baseCell);
    expect(result.ratioToP95).toBeCloseTo(1.2, 5);
  });
});
