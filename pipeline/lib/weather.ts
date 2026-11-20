// Open-Meteo weather forecast and historical archive client, for the
// experimental heat/cold layer. Separate from pipeline/lib/openmeteo.ts
// (the flood API client) because it is a different host, a different
// variable set, and this session discovered the flood API subdomain
// specifically got heavily rate-limited after repeated 429s; keeping the
// clients separate avoids tangling an unrelated cache key namespace with
// that one. See DECISIONS.md for the terms verification.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import type { Point } from "./grid.js";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const CACHE_DIR = "data/cache/weather";
const FORECAST_CHUNK_SIZE = 100;
const HISTORY_CHUNK_SIZE = 20; // a 25-year daily archive request for 3 variables is much larger per point than a 7-day forecast; 100 locations at once returned a 400 "too much data" error, same issue as the flood API's history endpoint
const THROTTLE_MS = 1000; // published limit is 600/minute, far looser than the flood API's effective limit this session

export interface WeatherDailyResponse {
  latitude: number;
  longitude: number;
  daily: {
    time: string[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    apparent_temperature_max: (number | null)[];
  };
}

function cacheDir() {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  return CACHE_DIR;
}

function cachePath(params: string): string {
  const hash = createHash("sha1").update(params).digest("hex");
  return join(cacheDir(), `${hash}.json`);
}

function pointCachePath(p: Point, extraParams: string): string {
  return cachePath(`latitude=${p.lat}&longitude=${p.lon}&${extraParams}`);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, attempt = 1): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    if (attempt > 3) throw err;
    await sleep(2000 * attempt);
    return fetchWithRetry(url, attempt + 1);
  }
  if (res.status === 429) {
    throw new Error(`Open-Meteo weather API rate limit hit (429) on attempt ${attempt}. Stopping without retrying.`);
  }
  if (!res.ok) {
    throw new Error(`Open-Meteo weather API request failed: ${res.status} ${await res.text()}`);
  }
  return res;
}

const DAILY_VARS = "temperature_2m_max,temperature_2m_min,apparent_temperature_max";

async function fetchDailyBatch(
  baseUrl: string,
  points: Point[],
  extraParams: string,
  allowNetwork = true
): Promise<(WeatherDailyResponse | null)[]> {
  const results: (WeatherDailyResponse | null)[] = new Array(points.length).fill(null);
  const toFetch: { point: Point; index: number }[] = [];

  points.forEach((p, i) => {
    const file = pointCachePath(p, extraParams);
    if (existsSync(file)) {
      results[i] = JSON.parse(readFileSync(file, "utf-8"));
    } else {
      toFetch.push({ point: p, index: i });
    }
  });

  // Same lesson as pipeline/lib/openmeteo.ts (see DECISIONS.md): once a
  // run stops allowing new network calls, every remaining chunk must
  // still be checked against the cache, or already-fetched cells get
  // silently dropped on a rerun under a different candidate order.
  if (toFetch.length === 0 || !allowNetwork) return results;

  const lat = toFetch.map((t) => t.point.lat).join(",");
  const lon = toFetch.map((t) => t.point.lon).join(",");
  const query = `latitude=${lat}&longitude=${lon}&daily=${DAILY_VARS}&${extraParams}`;

  await sleep(THROTTLE_MS);
  const res = await fetchWithRetry(`${baseUrl}?${query}`);
  const json = await res.json();
  const arr: WeatherDailyResponse[] = Array.isArray(json) ? json : [json];

  arr.forEach((entry, j) => {
    const { point, index } = toFetch[j];
    writeFileSync(pointCachePath(point, extraParams), JSON.stringify(entry));
    results[index] = entry;
  });

  return results;
}

export async function fetchWeatherForecast(
  points: Point[],
  forecastDays = 7
): Promise<(WeatherDailyResponse | null)[]> {
  const out: (WeatherDailyResponse | null)[] = [];
  let hitLimit = false;
  for (let i = 0; i < points.length; i += FORECAST_CHUNK_SIZE) {
    const chunk = points.slice(i, i + FORECAST_CHUNK_SIZE);
    try {
      const batch = await fetchDailyBatch(FORECAST_URL, chunk, `forecast_days=${forecastDays}`, !hitLimit);
      out.push(...batch);
    } catch (err) {
      console.warn(`Weather forecast chunk ${i / FORECAST_CHUNK_SIZE} failed:`, (err as Error).message);
      hitLimit = true;
      out.push(...chunk.map(() => null));
    }
  }
  return out;
}

export async function fetchWeatherHistory(
  points: Point[],
  startDate: string,
  endDate: string
): Promise<(WeatherDailyResponse | null)[]> {
  const out: (WeatherDailyResponse | null)[] = [];
  let hitLimit = false;
  for (let i = 0; i < points.length; i += HISTORY_CHUNK_SIZE) {
    const chunk = points.slice(i, i + HISTORY_CHUNK_SIZE);
    try {
      const batch = await fetchDailyBatch(
        ARCHIVE_URL,
        chunk,
        `start_date=${startDate}&end_date=${endDate}`,
        !hitLimit
      );
      out.push(...batch);
    } catch (err) {
      console.warn(`Weather history chunk ${i / HISTORY_CHUNK_SIZE} failed, stopping further network requests this run:`, (err as Error).message);
      hitLimit = true;
      out.push(...chunk.map(() => null));
    }
  }
  return out;
}
