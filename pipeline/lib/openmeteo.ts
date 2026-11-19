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
const THROTTLE_MS = 1500; // Open-Meteo returned 429 at a faster pace in testing; no published limit was found, so this is a conservative guess, logged in DECISIONS.md
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
  const res = await fetch(url);
  if (res.status === 429 || res.status >= 500) {
    if (attempt > 6) {
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

async function fetchDailyBatch(
  points: Point[],
  extraParams: string,
  throttleMs = THROTTLE_MS
): Promise<FloodDailyResponse[]> {
  const lat = points.map((p) => p.lat).join(",");
  const lon = points.map((p) => p.lon).join(",");
  const query = `latitude=${lat}&longitude=${lon}&daily=river_discharge&${extraParams}`;
  const file = cachePath(query);

  if (existsSync(file)) {
    return JSON.parse(readFileSync(file, "utf-8"));
  }

  await sleep(throttleMs);
  const res = await fetchWithRetry(`${BASE_URL}?${query}`);
  const json = await res.json();
  const arr = Array.isArray(json) ? json : [json];
  writeFileSync(file, JSON.stringify(arr));
  return arr;
}

// Fetches a short forecast (default 7 days) for many points, in chunks.
export async function fetchForecast(
  points: Point[],
  forecastDays = 7
): Promise<FloodDailyResponse[]> {
  const out: FloodDailyResponse[] = [];
  for (let i = 0; i < points.length; i += FORECAST_CHUNK_SIZE) {
    const chunk = points.slice(i, i + FORECAST_CHUNK_SIZE);
    const batch = await fetchDailyBatch(chunk, `forecast_days=${forecastDays}`);
    out.push(...batch);
  }
  return out;
}

// Fetches daily history for many points, in chunks, for a date range.
export async function fetchHistory(
  points: Point[],
  startDate: string,
  endDate: string
): Promise<FloodDailyResponse[]> {
  const out: FloodDailyResponse[] = [];
  for (let i = 0; i < points.length; i += HISTORY_CHUNK_SIZE) {
    const chunk = points.slice(i, i + HISTORY_CHUNK_SIZE);
    const batch = await fetchDailyBatch(
      chunk,
      `start_date=${startDate}&end_date=${endDate}`,
      HISTORY_THROTTLE_MS
    );
    out.push(...batch);
  }
  return out;
}

export function meanOf(values: (number | null)[]): number {
  const nums = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
