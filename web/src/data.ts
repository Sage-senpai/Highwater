import type { Facility, LatestData } from "./types";

const STATE_FILE_CACHE = new Map<string, Promise<Facility[]>>();

// Facility data is split per state and lazy-loaded, so the first screen
// does not pull all facilities at once (docs/claude.md: low bandwidth).
export function loadStateFacilities(state: string): Promise<Facility[]> {
  const key = state.toLowerCase().replace(/\s+/g, "-");
  if (!STATE_FILE_CACHE.has(key)) {
    STATE_FILE_CACHE.set(
      key,
      fetch(`/data/facilities/${key}.json`)
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to load facilities for ${state}: ${r.status}`);
          return r.json();
        })
        .catch((err) => {
          console.error(err);
          return [];
        })
    );
  }
  return STATE_FILE_CACHE.get(key)!;
}

export async function loadStateIndex(): Promise<string[]> {
  const res = await fetch("/data/states.json");
  if (!res.ok) return [];
  return res.json();
}

export async function loadLatest(): Promise<LatestData | null> {
  const res = await fetch("/data/latest.json");
  if (!res.ok) return null;
  return res.json();
}
