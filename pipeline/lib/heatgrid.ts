// Grid snapping for the experimental heat/cold layer. Deliberately much
// coarser than the river grid in pipeline/lib/grid.ts: temperature and
// heat stress vary smoothly over tens of kilometers in Nigeria's climate,
// unlike river discharge, which is drainage-basin-specific. See
// DECISIONS.md for why this is a defensible simplification here and not
// for the river model.
import type { Point } from "./grid.js";

export const HEAT_GRID_STEP = 0.5;

export function snapToHeatGrid(p: Point): Point {
  return {
    lat: Math.round(p.lat / HEAT_GRID_STEP) * HEAT_GRID_STEP,
    lon: Math.round(p.lon / HEAT_GRID_STEP) * HEAT_GRID_STEP,
  };
}

export function heatCellKey(p: Point): string {
  const snapped = snapToHeatGrid(p);
  return `${snapped.lat.toFixed(2)},${snapped.lon.toFixed(2)}`;
}
