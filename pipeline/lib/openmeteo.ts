// Open-Meteo Flood API client: batches comma-separated coordinates,
// caches every response by the exact query sent, throttles, and retries
// with backoff. See docs/claude.md "Verified facts" for the endpoint and
// its no-key non-commercial use.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import type { Point } from "./grid.js";

const BASE_URL = "https://flood-api.open-meteo.com/v1/flood";
const CACHE_DIR = "data/cache";
const FORECAST_CHUNK_SIZE = 100; // conservative batch size, tested up to 60 coordinates in one call
const HISTORY_CHUNK_SIZE = 10; // a 30-year daily history request is much larger per point than a 7-day forecast; 100 locations at once returned a 400 "too much data" error, so history batches are smaller
const THROTTLE_MS = 15000; // raised from 1500ms: evidence late in this build session suggests a token-bucket-style limit that refills slowly rather than a strict once-per-hour reset (a single-point check succeeded seconds after a batch request got a 429), see DECISIONS.md
const HISTORY_THROTTLE_MS = 4000; // history requests are much larger and tripped an hourly cap once already, see DECISIONS.md

export interface FloodDailyResponse {
  latitude: number;
  longitude: number;
  daily: {
    time: string[];
    river_discharge: (number | null)[];
  };
}

function cacheDir() {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  return CACHE_DIR;
}

function cacheKey(params: string): string {
  return createHash("sha1").update(params).digest("hex");
}

function cachePath(params: string): string {
  return join(cacheDir(), `${cacheKey(params)}.json`);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, attempt = 1): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    // A network-level failure (DNS, connect timeout) is not a quota
    // problem, so it is worth a couple of short retries, unlike a 429.
    if (attempt > 3) throw err;
    await sleep(2000 * attempt);
    return fetchWithRetry(url, attempt + 1);
  }
  if (res.status === 429) {
    // Every retry is itself a request that counts against whatever the
    // real hourly quota is (confirmed: this quota is tight enough that
    // even status checks between runs consumed it). Fail fast on 429
    // instead of burning more of the quota on retries; the caller resumes
    // later and reuses the cache for whatever already succeeded.
    throw new Error(`Open-Meteo hourly limit hit (429) on attempt ${attempt}. Stopping without retrying.`);
  }
  if (res.status >= 500) {
    if (attempt > 3) {
      throw new Error(`Open-Meteo request failed after ${attempt} attempts: ${res.status}`);
    }
    const backoffMs = 2000 * 2 ** attempt;
    await sleep(backoffMs);
    return fetchWithRetry(url, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`Open-Meteo request failed: ${res.status} ${await res.text()}`);
  }
  return res;
}

// Caches per INDIVIDUAL point, not per batch. Two calls that request the
// same point under the same extraParams (same date range or forecast
// length) hit the same cache file even if they group that point into a
// differently-ordered or differently-sized batch alongside other points.
// This matters a lot here: pin-cells.ts and climatology.ts both fetch
// history for overlapping sets of cells, in different orders, and without
// this the second script would re-request the exact same data under a
// different batch key and waste the same tight hourly quota again.
function pointCachePath(p: Point, extraParams: string): string {
  return cachePath(`latitude=${p.lat}&longitude=${p.lon}&daily=river_discharge&${extraParams}`);
}

async function fetchDailyBatch(
  points: Point[],
  extraParams: string,
  throttleMs = THROTTLE_MS,
  allowNetwork = true
): Promise<(FloodDailyResponse | null)[]> {
  const results: (FloodDailyResponse | null)[] = new Array(points.length).fill(null);
  const toFetch: { point: Point; index: number }[] = [];

  points.forEach((p, i) => {
    const file = pointCachePath(p, extraParams);
    if (existsSync(file)) {
      results[i] = JSON.parse(readFileSync(file, "utf-8"));
    } else {
      toFetch.push({ point: p, index: i });
    }
  });

  // Once a run has hit the rate limit, the caller stops allowing new
  // network calls, but cached points above were still filled in from
  // disk, so this chunk is not wasted even if some points in it are not
  // cached. Only the uncached remainder is skipped.
  if (toFetch.length === 0 || !allowNetwork) return results;

  const lat = toFetch.map((t) => t.point.lat).join(",");
  const lon = toFetch.map((t) => t.point.lon).join(",");
  const query = `latitude=${lat}&longitude=${lon}&daily=river_discharge&${extraParams}`;

  await sleep(throttleMs);
  const res = await fetchWithRetry(`${BASE_URL}?${query}`);
  const json = await res.json();
  const arr: FloodDailyResponse[] = Array.isArray(json) ? json : [json];

  arr.forEach((entry, j) => {
    const { point, index } = toFetch[j];
    writeFileSync(pointCachePath(point, extraParams), JSON.stringify(entry));
    results[index] = entry;
  });

  return results;
}

// Fetches a short forecast (default 7 days) for many points, in chunks.
// Same partial-progress behavior as fetchHistory: a failure (rate limit or
// network) stops further new NETWORK requests for the rest of this call,
// but every remaining chunk is still checked against the on-disk cache
// (fetchDailyBatch with allowNetwork=false), so already-fetched points
// are never dropped just because they come after a failed chunk in the
// iteration order. This was a real bug: an earlier version skipped whole
// remaining chunks outright once the limit was hit, which silently lost
// previously-cached cells on a rerun whenever the candidate order changed
// (e.g. after reprioritizing unreached states), see DECISIONS.md.
export async function fetchForecast(
  points: Point[],
  forecastDays = 7
): Promise<(FloodDailyResponse | null)[]> {
  const out: (FloodDailyResponse | null)[] = [];
  let hitLimit = false;
  for (let i = 0; i < points.length; i += FORECAST_CHUNK_SIZE) {
    const chunk = points.slice(i, i + FORECAST_CHUNK_SIZE);
    try {
      const batch = await fetchDailyBatch(chunk, `forecast_days=${forecastDays}`, THROTTLE_MS, !hitLimit);
      out.push(...batch);
    } catch (err) {
      console.warn(`Forecast chunk ${i / FORECAST_CHUNK_SIZE} failed, stopping further forecast network requests this run:`, (err as Error).message);
      hitLimit = true;
      out.push(...chunk.map(() => null));
    }
  }
  return out;
}

// Fetches daily history for many points, in chunks, for a date range.
// If the hourly quota runs out partway through, stops making new NETWORK
// requests but keeps checking the cache for every remaining chunk, so
// already-fetched cells are never dropped (see the comment on
// fetchForecast above for why this matters).
export async function fetchHistory(
  points: Point[],
  startDate: string,
  endDate: string
): Promise<(FloodDailyResponse | null)[]> {
  const out: (FloodDailyResponse | null)[] = [];
  let hitLimit = false;
  for (let i = 0; i < points.length; i += HISTORY_CHUNK_SIZE) {
    const chunk = points.slice(i, i + HISTORY_CHUNK_SIZE);
    try {
      const batch = await fetchDailyBatch(
        chunk,
        `start_date=${startDate}&end_date=${endDate}`,
        HISTORY_THROTTLE_MS,
        !hitLimit
      );
      out.push(...batch);
    } catch (err) {
      console.warn(`History chunk ${i / HISTORY_CHUNK_SIZE} failed, stopping further history network requests this run:`, (err as Error).message);
      hitLimit = true;
      out.push(...chunk.map(() => null));
    }
  }
  return out;
}

export function meanOf(values: (number | null)[]): number {
  const nums = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
