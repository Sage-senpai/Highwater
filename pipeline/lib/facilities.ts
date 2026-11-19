// Shared types and pure functions for facility ingestion.
// Kept dependency-free so it is easy to unit test.

export interface RawFacility {
  lat: number | null;
  lon: number | null;
}

export interface Facility {
  id: string;
  name: string;
  state: string;
  lga: string;
  lat: number;
  lon: number;
  type?: string;
  source: string;
}

// Nigeria bounding box, from docs/build-plan.md M1.
export const NIGERIA_BBOX = {
  minLon: 2.7,
  maxLon: 14.6,
  minLat: 4.3,
  maxLat: 13.9,
};

export function isInNigeriaBbox(lat: number, lon: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  return (
    lon >= NIGERIA_BBOX.minLon &&
    lon <= NIGERIA_BBOX.maxLon &&
    lat >= NIGERIA_BBOX.minLat &&
    lat <= NIGERIA_BBOX.maxLat
  );
}

export interface FilterResult<T> {
  kept: T[];
  droppedBadCoords: number;
  droppedOutOfBbox: number;
}

// Drops rows with missing/non-finite coordinates, then rows outside the
// Nigeria bounding box. Returns counts for each reason, for the audit.
export function filterByCoordinates<T extends { lat: number | null; lon: number | null }>(
  rows: T[]
): FilterResult<T & { lat: number; lon: number }> {
  const kept: (T & { lat: number; lon: number })[] = [];
  let droppedBadCoords = 0;
  let droppedOutOfBbox = 0;

  for (const row of rows) {
    const { lat, lon } = row;
    if (
      lat === null ||
      lon === null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon)
    ) {
      droppedBadCoords++;
      continue;
    }
    if (!isInNigeriaBbox(lat, lon)) {
      droppedOutOfBbox++;
      continue;
    }
    kept.push({ ...row, lat, lon });
  }

  return { kept, droppedBadCoords, droppedOutOfBbox };
}

export function countDuplicateCoordinates(
  rows: { lat: number; lon: number }[]
): number {
  const seen = new Map<string, number>();
  for (const r of rows) {
    const key = `${r.lat.toFixed(6)},${r.lon.toFixed(6)}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  let dup = 0;
  for (const count of seen.values()) {
    if (count > 1) dup += count;
  }
  return dup;
}
