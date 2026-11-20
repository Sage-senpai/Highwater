import { describe, it, expect } from "vitest";
import { percentile, median, detectPlateaus, detectTopPlateau, sortAsc } from "./stats.js";

describe("percentile", () => {
  it("matches a hand-computed array", () => {
    const sorted = sortAsc([3, 1, 4, 1, 5, 9, 2, 6]);
    // sorted: [1,1,2,3,4,5,6,9]
    expect(percentile(sorted, 0)).toBe(1);
    expect(percentile(sorted, 100)).toBe(9);
    expect(median([3, 1, 4, 1, 5, 9, 2, 6])).toBeCloseTo(3.5, 5);
  });

  it("p95 of 1..100 is close to 95.05", () => {
    const vals = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(vals, 95)).toBeCloseTo(95.05, 2);
  });
});

describe("detectPlateaus", () => {
  it("flags a synthetic run of 3 identical values", () => {
    const vals = [1, 2, 3, 7, 7, 7, 4, 5];
    const result = detectPlateaus(vals);
    expect(result.flaggedCount).toBe(3);
    expect(result.longestRun).toBe(3);
  });

  it("does not flag runs shorter than 3", () => {
    const vals = [1, 2, 2, 3, 4];
    const result = detectPlateaus(vals);
    expect(result.flaggedCount).toBe(0);
  });

  it("flags a longer run and reports its length", () => {
    const vals = [5, 5, 5, 5, 5, 1, 2];
    const result = detectPlateaus(vals);
    expect(result.flaggedCount).toBe(5);
    expect(result.longestRun).toBe(5);
  });
});

describe("detectTopPlateau", () => {
  it("does not flag a low-value plateau (common dry-season zeros)", () => {
    const vals = [0, 0, 0, 0, 100, 200, 300];
    expect(detectTopPlateau(vals, 150).flaggedCount).toBe(0);
  });

  it("flags a repeated run only when the repeated value is at or above the threshold (the Lokoja pattern)", () => {
    const vals = [10, 20, 30, 15957.79, 15957.79, 15957.79, 40, 50];
    const result = detectTopPlateau(vals, 1000);
    expect(result.flaggedCount).toBe(3);
    expect(result.longestRun).toBe(3);
  });

  it("does not flag a run of 2, even above the threshold", () => {
    const vals = [10, 20, 9000, 9000, 30];
    expect(detectTopPlateau(vals, 1000).flaggedCount).toBe(0);
  });
});
