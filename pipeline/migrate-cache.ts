// One-off: the cache used to be keyed by a whole batch query string. It is
// now keyed per point, so the same point can be reused across batches of
// different size or order (see DECISIONS.md). This migrates every old
// batch-keyed cache file into the new per-point format without any new API
// calls, so already-paid-for quota is not wasted a second time.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const CACHE_DIR = "data/cache";

function cachePath(params: string): string {
  const hash = createHash("sha1").update(params).digest("hex");
  return join(CACHE_DIR, `${hash}.json`);
}

function pointCachePath(lat: number, lon: number, extraParams: string): string {
  return cachePath(`latitude=${lat}&longitude=${lon}&daily=river_discharge&${extraParams}`);
}

function main() {
  const files = readdirSync(CACHE_DIR).filter((f) => f.endsWith(".json"));
  let migrated = 0;
  let skipped = 0;

  for (const file of files) {
    const full = join(CACHE_DIR, file);
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(full, "utf-8"));
    } catch {
      skipped++;
      continue;
    }
    if (!Array.isArray(data)) {
      skipped++;
      continue;
    }

    for (const entry of data) {
      if (!entry || typeof entry !== "object" || !("daily" in entry)) continue;
      const e = entry as { latitude: number; longitude: number; daily: { time: string[] } };
      const len = e.daily?.time?.length ?? 0;
      let extraParams: string;
      if (len > 0 && len <= 10) {
        // short series: this project only ever requests forecast_days=7
        extraParams = "forecast_days=7";
      } else if (len > 10) {
        // long series: this project only ever requests history from
        // 1984-01-01 to the end date used in that run. Use the last date
        // actually present, which is the only thing that varies run to run.
        const lastDate = e.daily.time[e.daily.time.length - 1];
        extraParams = `start_date=1984-01-01&end_date=${lastDate}`;
      } else {
        continue;
      }
      const dest = pointCachePath(e.latitude, e.longitude, extraParams);
      writeFileSync(dest, JSON.stringify(entry));
      migrated++;
    }
  }

  console.log(`Migrated ${migrated} point entries from ${files.length} old batch cache files. Skipped ${skipped} non-batch files.`);
}

main();
