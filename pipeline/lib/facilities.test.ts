import { describe, it, expect } from "vitest";
import { filterByCoordinates, isInNigeriaBbox, countDuplicateCoordinates } from "./facilities.js";

describe("isInNigeriaBbox", () => {
  it("accepts a point inside Nigeria", () => {
    expect(isInNigeriaBbox(9.0, 7.5)).toBe(true);
  });
  it("rejects a point far outside Nigeria", () => {
    expect(isInNigeriaBbox(51.5, -0.1)).toBe(false); // London
  });
  it("rejects null-like non-finite values", () => {
    expect(isInNigeriaBbox(NaN, 7.5)).toBe(false);
  });
});

describe("filterByCoordinates", () => {
  it("drops rows with null coordinates and counts them", () => {
    const rows = [
      { lat: 9.0, lon: 7.5 },
      { lat: null, lon: 7.5 },
      { lat: 9.0, lon: null },
    ];
    const result = filterByCoordinates(rows);
    expect(result.kept.length).toBe(1);
    expect(result.droppedBadCoords).toBe(2);
    expect(result.droppedOutOfBbox).toBe(0);
  });

  it("drops rows outside the Nigeria bounding box and counts them", () => {
    const rows = [
      { lat: 9.0, lon: 7.5 }, // inside
      { lat: 51.5, lon: -0.1 }, // London, outside
      { lat: -1.3, lon: 36.8 }, // Nairobi, outside
    ];
    const result = filterByCoordinates(rows);
    expect(result.kept.length).toBe(1);
    expect(result.droppedOutOfBbox).toBe(2);
  });
});

describe("countDuplicateCoordinates", () => {
  it("counts rows that share an exact coordinate pair", () => {
    const rows = [
      { lat: 9.0, lon: 7.5 },
      { lat: 9.0, lon: 7.5 },
      { lat: 10.0, lon: 8.0 },
    ];
    expect(countDuplicateCoordinates(rows)).toBe(2);
  });
});
