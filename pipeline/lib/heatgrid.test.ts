import { describe, it, expect } from "vitest";
import { snapToHeatGrid, heatCellKey } from "./heatgrid.js";

describe("snapToHeatGrid", () => {
  it("snaps to the 0.5 degree lattice", () => {
    const snapped = snapToHeatGrid({ lat: 6.46, lon: 7.55 });
    expect(snapped.lat).toBeCloseTo(6.5, 5);
    expect(snapped.lon).toBeCloseTo(7.5, 5);
  });

  it("gives the same cell key for two nearby points", () => {
    const a = heatCellKey({ lat: 6.4, lon: 7.4 });
    const b = heatCellKey({ lat: 6.3, lon: 7.3 });
    expect(a).toBe(b);
  });

  it("gives a different cell key for points in different cells", () => {
    const a = heatCellKey({ lat: 6.4, lon: 7.4 });
    const b = heatCellKey({ lat: 9.0, lon: 3.0 });
    expect(a).not.toBe(b);
  });
});
