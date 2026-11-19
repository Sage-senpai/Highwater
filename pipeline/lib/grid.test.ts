import { describe, it, expect } from "vitest";
import { windowCandidates, distanceKm, snapToGridBase } from "./grid.js";

describe("snapToGridBase", () => {
  it("snaps to the approximate lattice", () => {
    const snapped = snapToGridBase({ lat: 6.15, lon: 6.78 });
    expect(snapped.lat).toBeCloseTo(6.2, 5);
    expect(snapped.lon).toBeCloseTo(6.8, 5);
  });
});

describe("windowCandidates", () => {
  it("produces 15 points (3 lat offsets by 5 lon offsets)", () => {
    const points = windowCandidates({ lat: 6.15, lon: 6.78 });
    expect(points.length).toBe(15);
  });

  it("gives the same candidates for two facilities in the same grid tile (cache sharing)", () => {
    // Both well inside the 6.15-6.25 lat / 6.775-6.825 lon tile, away from
    // any rounding boundary, so both snap to the same base point.
    const a = windowCandidates({ lat: 6.18, lon: 6.79 });
    const b = windowCandidates({ lat: 6.21, lon: 6.81 });
    expect(a).toEqual(b);
  });
});

describe("distanceKm", () => {
  it("is zero for the same point", () => {
    expect(distanceKm({ lat: 6.15, lon: 6.78 }, { lat: 6.15, lon: 6.78 })).toBeCloseTo(0, 5);
  });

  it("matches a known rough distance (Lagos to Abuja, about 480 km)", () => {
    const lagos = { lat: 6.5244, lon: 3.3792 };
    const abuja = { lat: 9.0765, lon: 7.3986 };
    const d = distanceKm(lagos, abuja);
    expect(d).toBeGreaterThan(400);
    expect(d).toBeLessThan(560);
  });
});
