// M4: npm run replay -- --date YYYY-MM-DD
// Treats the 7 days after the given date in the reanalysis history as if
// they were a forecast, and writes data/replay-<date>.json. This is a
// historical replay using reanalysis, not a past forecast. Label it as
// such everywhere it is shown.
import { readFileSync, writeFileSync } from "node:fs";
import { fetchHistory } from "./lib/openmeteo.js";
import { pointKey, type Point } from "./lib/grid.js";
import { computeLevel, type CellThresholds } from "./lib/levels.js";

interface Pin {
  facilityId: string;
  cell: { lat: number; lon: number };
  distance_km: number;
}

interface CellStats extends CellThresholds {
  cell: Point;
  max2022: number;
}

function parseArgs(): { date: string } {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--date");
  if (idx === -1 || !args[idx + 1]) {
    throw new Error("Usage: npm run replay -- --date YYYY-MM-DD");
  }
  return { date: args[idx + 1] };
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const { date } = parseArgs();
  const pins: Record<string, Pin> = JSON.parse(readFileSync("data/pins.json", "utf-8"));
  const cells: Record<string, CellStats> = JSON.parse(readFileSync("data/cells.json", "utf-8"));

  const uniqueCellsMap = new Map<string, Point>();
  for (const pin of Object.values(pins)) uniqueCellsMap.set(pointKey(pin.cell), pin.cell);
  const uniqueCells = [...uniqueCellsMap.values()];

  const startDate = date;
  const endDate = addDays(date, 6);

  const historyResults = await fetchHistory(uniqueCells, startDate, endDate);
  const windowMaxByKey = new Map<string, number>();
  uniqueCells.forEach((cell, i) => {
    const r = historyResults[i];
    if (!r) return;
    const values = r.daily.river_discharge.map((v) => v ?? 0);
    windowMaxByKey.set(pointKey(cell), values.length ? Math.max(...values) : 0);
  });

  const facilityOutputs: Record<string, unknown> = {};
  const levelCounts: Record<string, number> = {};
  for (const [facilityId, pin] of Object.entries(pins)) {
    const key = pointKey(pin.cell);
    const cell = cells[key];
    const windowMax = windowMaxByKey.get(key);
    if (!cell || windowMax === undefined) continue;
    const levelResult = computeLevel(windowMax, cell);
    facilityOutputs[facilityId] = {
      cell: pin.cell,
      distance_km: pin.distance_km,
      windowMax: Math.round(windowMax * 100) / 100,
      level: levelResult.level,
      lowConfidence: levelResult.lowConfidence,
    };
    levelCounts[levelResult.level] = (levelCounts[levelResult.level] ?? 0) + 1;
  }

  const output = {
    replay_for_date: date,
    replay_window: [startDate, endDate],
    label: "historical replay using reanalysis, not a past forecast",
    model: "GloFAS v4 via Open-Meteo",
    facilities: facilityOutputs,
  };

  writeFileSync(`data/replay-${date}.json`, JSON.stringify(output, null, 2));
  console.log(`Wrote data/replay-${date}.json for ${Object.keys(facilityOutputs).length} facilities.`);
  console.log("Level counts:", levelCounts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
