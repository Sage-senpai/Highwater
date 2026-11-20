// Experimental heat/cold risk layer. A different data source and method
// than the river-level warning: Open-Meteo's standard weather forecast
// and historical archive (temperature, not river discharge), snapped to
// a coarse 0.5 degree grid (see pipeline/lib/heatgrid.ts), applied to
// every facility nationwide, not just the river-corridor pilot. Never
// blended into the NORMAL/WATCH/WARNING/SEVERE river levels. See
// docs/PITCH.md for why this exists (Enugu and Nsukka have no usable
// river signal, but heat and harmattan cold are real, documented risks).
import { readFileSync, writeFileSync } from "node:fs";
import { snapToHeatGrid, heatCellKey } from "./lib/heatgrid.js";
import type { Point } from "./lib/grid.js";
import { fetchWeatherForecast, fetchWeatherHistory } from "./lib/weather.js";
import { percentile, sortAsc, dropNulls } from "./lib/stats.js";
import { buildForecastDays, MIN_YEARS_FOR_CONFIDENCE, type HeatColdThresholds } from "./lib/heatlevels.js";

interface Facility {
  id: string;
  name: string;
  state: string;
  lga: string;
  lat: number;
  lon: number;
}

// 2000-01-01 to yesterday: shorter than the river model's 1984 baseline,
// a deliberate scope cut for this stretch layer under the hackathon time
// budget, logged in DECISIONS.md. Still long enough for a meaningful
// percentile at any single location (order 9000 daily values).
const HISTORY_START = "2000-01-01";

function yesterday(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function main() {
  const facilities: Facility[] = JSON.parse(readFileSync("data/facilities.json", "utf-8"));
  console.log(`Loaded ${facilities.length} facilities nationwide for the heat/cold layer.`);

  const cellsMap = new Map<string, Point>();
  const cellByFacility = new Map<string, string>();
  for (const f of facilities) {
    const snapped = snapToHeatGrid({ lat: f.lat, lon: f.lon });
    const key = heatCellKey({ lat: f.lat, lon: f.lon });
    cellsMap.set(key, snapped);
    cellByFacility.set(f.id, key);
  }
  const cells = [...cellsMap.values()];
  const cellKeys = [...cellsMap.keys()];
  console.log(`${cells.length} unique 0.5 degree cells cover all facilities nationwide.`);

  const endDate = yesterday();
  const historyResults = await fetchWeatherHistory(cells, HISTORY_START, endDate);
  const forecastResults = await fetchWeatherForecast(cells, 7);

  const thresholdsByCell = new Map<string, HeatColdThresholds>();
  const forecastByCell = new Map<string, { dates: string[]; maxApparent: (number | null)[]; min: (number | null)[] }>();

  cellKeys.forEach((key, i) => {
    const hist = historyResults[i];
    if (hist) {
      const maxApparent = dropNulls(hist.daily.apparent_temperature_max);
      const mins = dropNulls(hist.daily.temperature_2m_min);
      const years = new Set(hist.daily.time.map((d) => d.slice(0, 4))).size;
      thresholdsByCell.set(key, {
        heatP95: percentile(sortAsc(maxApparent), 95),
        coldP5: percentile(sortAsc(mins), 5),
        yearsOfData: years,
      });
    }
    const fc = forecastResults[i];
    if (fc) {
      forecastByCell.set(key, {
        dates: fc.daily.time,
        maxApparent: fc.daily.apparent_temperature_max,
        min: fc.daily.temperature_2m_min,
      });
    }
  });

  const cellOutputs: Record<string, unknown> = {};
  for (const key of cellKeys) {
    const thresholds = thresholdsByCell.get(key);
    const forecast = forecastByCell.get(key);
    if (!thresholds || !forecast) continue;
    cellOutputs[key] = {
      cell: cellsMap.get(key),
      heatP95: Math.round(thresholds.heatP95 * 10) / 10,
      coldP5: Math.round(thresholds.coldP5 * 10) / 10,
      yearsOfData: thresholds.yearsOfData,
      lowConfidence: thresholds.yearsOfData < MIN_YEARS_FOR_CONFIDENCE,
      days: buildForecastDays(forecast.dates, forecast.maxApparent, forecast.min, thresholds),
    };
  }

  const facilityOutputs: Record<string, unknown> = {};
  let heatCount = 0;
  let coldCount = 0;
  for (const f of facilities) {
    const key = cellByFacility.get(f.id)!;
    const cellOut = cellOutputs[key] as { days: { flag: string }[] } | undefined;
    if (!cellOut) continue;
    const anyHeat = cellOut.days.some((d) => d.flag === "HEAT_RISK");
    const anyCold = cellOut.days.some((d) => d.flag === "COLD_RISK");
    facilityOutputs[f.id] = { cell: key, anyHeatRiskIn7Days: anyHeat, anyColdRiskIn7Days: anyCold };
    if (anyHeat) heatCount++;
    if (anyCold) coldCount++;
  }

  const output = {
    generated_at: new Date().toISOString(),
    label: "experimental: a different data source and method than the river-level warning",
    model: "Open-Meteo standard weather forecast and historical archive (not GloFAS)",
    history_start: HISTORY_START,
    grid_step_degrees: 0.5,
    min_years_for_confidence: MIN_YEARS_FOR_CONFIDENCE,
    cells: cellOutputs,
    facilities: facilityOutputs,
  };

  writeFileSync("data/heatcold.json", JSON.stringify(output));
  console.log(`Wrote data/heatcold.json. Cells resolved: ${Object.keys(cellOutputs).length} of ${cells.length}.`);
  console.log(`Facilities resolved: ${Object.keys(facilityOutputs).length} of ${facilities.length}.`);
  console.log(`Facilities with a HEAT_RISK day in the next 7: ${heatCount}. With a COLD_RISK day: ${coldCount}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
