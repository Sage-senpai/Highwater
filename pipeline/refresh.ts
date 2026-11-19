// M4: npm run refresh
// Pulls a 7-day forecast for each pinned cell, computes a level per cell
// and per facility, and writes data/latest.json.
import { readFileSync, writeFileSync } from "node:fs";
import { fetchForecast } from "./lib/openmeteo.js";
import { pointKey, type Point } from "./lib/grid.js";
import { computeLevel, type CellThresholds } from "./lib/levels.js";

interface Pin {
  facilityId: string;
  cell: { lat: number; lon: number };
  distance_km: number;
  median_m3s: number;
  above_floor: boolean;
  method: string;
}

interface CellStats extends CellThresholds {
  cell: Point;
  firstYearWithData: number | null;
  record: number;
  recordDate: string | null;
  max2022: number;
  annualMaxima: Record<string, number>;
  lowConfidenceReasons: string[];
}

async function main() {
  const pins: Record<string, Pin> = JSON.parse(readFileSync("data/pins.json", "utf-8"));
  const cells: Record<string, CellStats> = JSON.parse(readFileSync("data/cells.json", "utf-8"));

  const uniqueCellsMap = new Map<string, Point>();
  for (const pin of Object.values(pins)) uniqueCellsMap.set(pointKey(pin.cell), pin.cell);
  const uniqueCells = [...uniqueCellsMap.values()];

  const forecastResults = await fetchForecast(uniqueCells, 7);
  const forecastByKey = new Map<string, { max: number; dailyMax: { date: string; value: number }[] }>();
  uniqueCells.forEach((cell, i) => {
    const r = forecastResults[i];
    if (!r) return;
    const values = r.daily.river_discharge.map((v) => v ?? 0);
    const max = Math.max(...values);
    forecastByKey.set(pointKey(cell), {
      max,
      dailyMax: r.daily.time.map((t, idx) => ({ date: t, value: r.daily.river_discharge[idx] ?? 0 })),
    });
  });

  const cellOutputs: Record<string, unknown> = {};
  for (const [key, cell] of Object.entries(cells)) {
    const forecast = forecastByKey.get(key);
    if (!forecast) continue;
    const levelResult = computeLevel(forecast.max, cell);
    cellOutputs[key] = {
      cell: cell.cell,
      forecastMax: Math.round(forecast.max * 100) / 100,
      forecastDaily: forecast.dailyMax,
      level: levelResult.level,
      lowConfidence: levelResult.lowConfidence,
      ratioToP95: levelResult.ratioToP95,
      p50: cell.p50,
      p95: cell.p95,
      p99: cell.p99,
      max2022: cell.max2022,
    };
  }

  const facilityOutputs: Record<string, unknown> = {};
  for (const [facilityId, pin] of Object.entries(pins)) {
    const cellOut = cellOutputs[pointKey(pin.cell)] as
      | { level: string; lowConfidence: boolean; ratioToP95: number | null }
      | undefined;
    if (!cellOut) continue;
    facilityOutputs[facilityId] = {
      cell: pin.cell,
      distance_km: pin.distance_km,
      level: cellOut.level,
      lowConfidence: cellOut.lowConfidence,
      ratioToP95: cellOut.ratioToP95,
    };
  }

  const output = {
    generated_at: new Date().toISOString(),
    model: "GloFAS v4 via Open-Meteo",
    floor_m3s: 100,
    cells: cellOutputs,
    facilities: facilityOutputs,
  };

  writeFileSync("data/latest.json", JSON.stringify(output, null, 2));

  const levelCounts: Record<string, number> = {};
  for (const f of Object.values(facilityOutputs) as { level: string }[]) {
    levelCounts[f.level] = (levelCounts[f.level] ?? 0) + 1;
  }
  console.log(`Wrote data/latest.json for ${Object.keys(facilityOutputs).length} facilities.`);
  console.log("Level counts:", levelCounts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
