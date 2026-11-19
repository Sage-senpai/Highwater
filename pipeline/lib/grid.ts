// Geometry helpers for the river-cell window search (M2).
// The Open-Meteo flood API snaps a query point to its own internal grid,
// about 0.05 degrees in longitude and about 0.1 in latitude (see
// docs/claude.md "Verified facts"). Do not assume a square grid.

export const GRID_LON_STEP = 0.05;
export const GRID_LAT_STEP = 0.1;

export const LAT_OFFSETS = [-0.1, 0, 0.1];
export const LON_OFFSETS = [-0.1, -0.05, 0, 0.05, 0.1];

export interface Point {
  lat: number;
  lon: number;
}

// Snap a raw coordinate to the approximate grid lattice before building the
// search window. This makes nearby facilities share the same window
// candidate points, so the cache hit rate is high and the number of API
// calls scales with unique cells, not facility count. Documented deviation
// from a literal per-facility offset in DECISIONS.md.
export function snapToGridBase(p: Point): Point {
  return {
    lat: Math.round(p.lat / GRID_LAT_STEP) * GRID_LAT_STEP,
    lon: Math.round(p.lon / GRID_LON_STEP) * GRID_LON_STEP,
  };
}

export function windowCandidates(p: Point): Point[] {
  const base = snapToGridBase(p);
  const points: Point[] = [];
  for (const dLat of LAT_OFFSETS) {
    for (const dLon of LON_OFFSETS) {
      points.push({
        lat: round4(base.lat + dLat),
        lon: round4(base.lon + dLon),
      });
    }
  }
  return points;
}

export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function pointKey(p: Point): string {
  return `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;
}

// Haversine distance in kilometers.
export function distanceKm(a: Point, b: Point): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
