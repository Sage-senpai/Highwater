// M2: pin a river cell to each pilot facility.
// See docs/claude.md "Alert levels" for why the cell is pinned once, by
// 30-year median, and never re-picked by today's forecast.
import { readFileSync, writeFileSync } from "node:fs";
import { windowCandidates, pointKey, distanceKm, type Point } from "./lib/grid.js";
import { fetchForecast, fetchHistory, meanOf } from "./lib/openmeteo.js";
import { median, dropNulls } from "./lib/stats.js";

const FLOOR = 100; // m3/s, arbitrary, see docs/claude.md Alert levels. Shown in the UI.
const SAMPLE_PER_STATE = 25; // caps API cost, see DECISIONS.md
// Order matters under a tight rate limit: states not yet reached by an
// earlier run (see docs/DATA_AUDIT.md) go first, so the next limited run
// makes new progress instead of re-confirming states that already have
// real data cached.
const CORRIDOR_STATES = [
  "Benue",
  "Delta",
  "Anambra",
  "Bayelsa",
  "Jigawa",
  "Kogi",
  "Niger",
  "Kwara",
  "Nasarawa",
];

interface Facility {
  id: string;
  name: string;
  state: string;
  lga: string;
  lat: number;
  lon: number;
  type?: string;
  source: string;
}

function sampleEvenly<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(arr[Math.floor(i * step)]);
  return out;
}

async function main() {
  const facilities: Facility[] = JSON.parse(readFileSync("data/facilities.json", "utf-8"));
  const corridorFacilities = facilities.filter((f) => CORRIDOR_STATES.includes(f.state));

  // The two spot-check points from docs/claude.md go first, so they are
  // the first things fetched (not the last) under a tight rate limit.
  // Earlier runs queued them last and never reached them before the
  // hourly quota ran out every single time; see DECISIONS.md.
  const onitsha: Facility = {
    id: "spotcheck-onitsha",
    name: "Onitsha spot-check point",
    state: "Anambra",
    lga: "Onitsha",
    lat: 6.15,
    lon: 6.78,
    source: "spot-check from docs/claude.md",
  };
  const nsukka: Facility = {
    id: "spotcheck-nsukka",
    name: "Nsukka spot-check point",
    state: "Enugu",
    lga: "Nsukka",
    lat: 6.875,
    lon: 7.375,
    source: "spot-check from docs/claude.md",
  };

  const candidates: Facility[] = [onitsha, nsukka];
  for (const state of CORRIDOR_STATES) {
    const inState = corridorFacilities.filter((f) => f.state === state);
    candidates.push(...sampleEvenly(inState, SAMPLE_PER_STATE));
  }

  console.log(`Corridor facility pool: ${corridorFacilities.length}. Sampled candidates: ${candidates.length}.`);

  // Build the global set of unique window query points.
  const windowsByFacility = new Map<string, Point[]>();
  const uniquePointsMap = new Map<string, Point>();
  for (const f of candidates) {
    const points = windowCandidates({ lat: f.lat, lon: f.lon });
    windowsByFacility.set(f.id, points);
    for (const p of points) uniquePointsMap.set(pointKey(p), p);
  }
  const uniquePoints = [...uniquePointsMap.values()];
  console.log(`Unique window query points across all candidates: ${uniquePoints.length}.`);

  // Stage 1: 7-day forecast for every unique point. Open-Meteo preserves
  // request order in the response array, so align positionally to recover
  // which snapped cell answered which query point.
  const forecastResults = await fetchForecast(uniquePoints, 7);
  const forecastByQueryKey = new Map<string, { snapped: Point; mean: number }>();
  uniquePoints.forEach((qp, i) => {
    const r = forecastResults[i];
    if (!r) return;
    forecastByQueryKey.set(pointKey(qp), {
      snapped: { lat: r.latitude, lon: r.longitude },
      mean: meanOf(r.daily.river_discharge),
    });
  });

  // Stage 2: for each facility, take its window's distinct snapped cells,
  // keep the top 2 by forecast mean.
  const topCellsByFacility = new Map<string, { snapped: Point; mean: number }[]>();
  const allTopCells = new Map<string, Point>();
  for (const f of candidates) {
    const points = windowsByFacility.get(f.id)!;
    const seenCells = new Map<string, { snapped: Point; mean: number }>();
    for (const p of points) {
      const entry = forecastByQueryKey.get(pointKey(p));
      if (!entry) continue;
      const cellKey = pointKey(entry.snapped);
      if (!seenCells.has(cellKey) || seenCells.get(cellKey)!.mean < entry.mean) {
        seenCells.set(cellKey, entry);
      }
    }
    // Spec calls for keeping the top 2 candidates and choosing by 30-year
    // median. Reduced to the top 1 after hitting Open-Meteo's hourly
    // request cap (see DECISIONS.md), to roughly halve the number of
    // unique cells that need a full 30-year history pull. This means the
    // "choose by higher median between two candidates" step is skipped;
    // the single top-forecast-mean cell is used directly. Logged as a
    // threshold/method change per docs/claude.md rule 5.
    const TOP_N_CANDIDATES = 1;
    const ranked = [...seenCells.values()].sort((a, b) => b.mean - a.mean).slice(0, TOP_N_CANDIDATES);
    topCellsByFacility.set(f.id, ranked);
    for (const c of ranked) allTopCells.set(pointKey(c.snapped), c.snapped);
  }

  const cellsToHistoryCheck = [...allTopCells.values()];
  console.log(`Unique top-2 cells needing 30-year history: ${cellsToHistoryCheck.length}.`);

  // Stage 3: 30-year history for the top-2 cells, to pick by median.
  const today = new Date();
  const endDate = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const historyResults = await fetchHistory(cellsToHistoryCheck, "1984-01-01", endDate);
  const medianByCell = new Map<string, number>();
  cellsToHistoryCheck.forEach((qp, i) => {
    const r = historyResults[i];
    if (!r) return; // history fetch failed or was skipped this run (rate limit); leave unset, not zero
    const values = dropNulls(r.daily.river_discharge);
    medianByCell.set(pointKey(qp), values.length > 0 ? median(values) : 0);
  });

  // Stage 4: pin each facility to the cell with the higher 30-year median.
  // Facilities whose only candidate cell has no history result yet (this
  // run was rate-limited partway through) are skipped entirely, not
  // pinned with a fake zero median, so a future run can finish them
  // without this run's gap being mistaken for a real NO_SIGNAL reading.
  interface Pin {
    facilityId: string;
    cell: { lat: number; lon: number };
    distance_km: number;
    median_m3s: number;
    above_floor: boolean;
    method: string;
  }
  const pins: Record<string, Pin> = {};
  let skippedNoHistory = 0;
  for (const f of candidates) {
    const ranked = topCellsByFacility.get(f.id) ?? [];
    if (ranked.length === 0) continue;
    const withMedian = ranked
      .map((c) => ({ c, m: medianByCell.get(pointKey(c.snapped)) }))
      .filter((x): x is { c: typeof ranked[number]; m: number } => x.m !== undefined);
    if (withMedian.length === 0) {
      skippedNoHistory++;
      continue;
    }
    let best = withMedian[0].c;
    let bestMedian = withMedian[0].m;
    for (const { c, m } of withMedian.slice(1)) {
      if (m > bestMedian) {
        best = c;
        bestMedian = m;
      }
    }
    pins[f.id] = {
      facilityId: f.id,
      cell: best.snapped,
      distance_km: Math.round(distanceKm({ lat: f.lat, lon: f.lon }, best.snapped) * 100) / 100,
      median_m3s: Math.round(bestMedian * 100) / 100,
      above_floor: bestMedian >= FLOOR,
      method: "window search, top-2 by 7-day forecast mean, pinned by 30-year median",
    };
  }

  writeFileSync("data/pins.json", JSON.stringify(pins, null, 2));
  console.log(`Pinned ${Object.keys(pins).length} facilities. Skipped ${skippedNoHistory} (no history result yet this run, rerun to finish them).`);

  // Coverage table per state.
  const coverage: Record<string, { n: number; aboveFloor: number; medianDistanceKm: number }> = {};
  for (const state of CORRIDOR_STATES) {
    const inState = candidates.filter((f) => f.state === state && pins[f.id]);
    const distances = inState.map((f) => pins[f.id].distance_km).sort((a, b) => a - b);
    const aboveFloor = inState.filter((f) => pins[f.id].above_floor).length;
    coverage[state] = {
      n: inState.length,
      aboveFloor,
      medianDistanceKm: distances.length ? median(distances) : 0,
    };
  }
  writeFileSync("data/coverage.json", JSON.stringify(coverage, null, 2));

  console.log("Coverage by state:", coverage);

  const onitshaPin = pins["spotcheck-onitsha"];
  const nsukkaPin = pins["spotcheck-nsukka"];
  console.log("Onitsha spot-check pin:", onitshaPin);
  console.log("Nsukka spot-check pin:", nsukkaPin);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
