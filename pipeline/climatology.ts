// M3: 30-year climatology per unique pinned cell.
// Reads data/pins.json, fetches full daily history per unique cell,
// computes p50/p95/p99/record/annual maxima/2022 max, and flags cells with
// fewer than 20 years of data or a plateau pattern (see docs/claude.md).
import { readFileSync, writeFileSync } from "node:fs";
import { fetchHistory } from "./lib/openmeteo.js";
import { pointKey, type Point } from "./lib/grid.js";
import { percentile, sortAsc, dropNulls, detectTopPlateau } from "./lib/stats.js";

interface Pin {
  facilityId: string;
  cell: { lat: number; lon: number };
  distance_km: number;
  median_m3s: number;
  above_floor: boolean;
  method: string;
}

interface CellStats {
  cell: Point;
  firstYearWithData: number | null;
  yearsOfData: number;
  p50: number;
  p95: number;
  p99: number;
  record: number;
  recordDate: string | null;
  max2022: number;
  annualMaxima: Record<string, number>;
  lowConfidence: boolean;
  lowConfidenceReasons: string[];
  plateauFlaggedCount: number;
  plateauLongestRun: number;
}

async function main() {
  const pins: Record<string, Pin> = JSON.parse(readFileSync("data/pins.json", "utf-8"));

  const uniqueCellsMap = new Map<string, Point>();
  for (const pin of Object.values(pins)) {
    uniqueCellsMap.set(pointKey(pin.cell), pin.cell);
  }
  const uniqueCells = [...uniqueCellsMap.values()];
  console.log(`Unique pinned cells needing climatology: ${uniqueCells.length}.`);

  const today = new Date();
  const endDate = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const historyResults = await fetchHistory(uniqueCells, "1984-01-01", endDate);

  const cells: Record<string, CellStats> = {};
  let flaggedLowConfidence = 0;
  let flaggedPlateau = 0;

  uniqueCells.forEach((cell, i) => {
    const r = historyResults[i];
    const key = pointKey(cell);
    if (!r) {
      console.warn(`No history result for cell ${key}`);
      return;
    }

    const dates = r.daily.time;
    const values = r.daily.river_discharge;

    let firstYearWithData: number | null = null;
    const byYear = new Map<string, number[]>();
    let record = -Infinity;
    let recordDate: string | null = null;

    for (let j = 0; j < dates.length; j++) {
      const v = values[j];
      if (v === null || !Number.isFinite(v)) continue;
      const year = dates[j].slice(0, 4);
      if (firstYearWithData === null) firstYearWithData = Number(year);
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year)!.push(v);
      if (v > record) {
        record = v;
        recordDate = dates[j];
      }
    }

    const clean = dropNulls(values);
    const sorted = sortAsc(clean);
    const p50 = percentile(sorted, 50);
    const p95 = percentile(sorted, 95);
    const p99 = percentile(sorted, 99);

    const annualMaxima: Record<string, number> = {};
    for (const [year, vals] of byYear) {
      annualMaxima[year] = Math.max(...vals);
    }
    const max2022 = annualMaxima["2022"] ?? 0;

    const yearsOfData = byYear.size;
    const reasons: string[] = [];
    if (yearsOfData < 20) reasons.push(`only ${yearsOfData} years of data`);

    // The Lokoja pattern from docs/claude.md: a run of 3 or more identical
    // consecutive values where the repeated value itself sits in the top 1
    // percent. A run of identical low values (e.g. several exact-zero days
    // in the dry season) is common and not flagged; only a repeated HIGH
    // value is suspicious.
    const p99Threshold = percentile(sorted, 99);
    const plateau = detectTopPlateau(clean, p99Threshold);
    if (plateau.longestRun >= 3) {
      reasons.push(`repeated-value run of ${plateau.longestRun} at or above the 99th percentile`);
      flaggedPlateau++;
    }

    if (reasons.length > 0) flaggedLowConfidence++;

    cells[key] = {
      cell,
      firstYearWithData,
      yearsOfData,
      p50: Math.round(p50 * 100) / 100,
      p95: Math.round(p95 * 100) / 100,
      p99: Math.round(p99 * 100) / 100,
      record: Math.round(record * 100) / 100,
      recordDate,
      max2022: Math.round(max2022 * 100) / 100,
      annualMaxima,
      lowConfidence: reasons.length > 0,
      lowConfidenceReasons: reasons,
      plateauFlaggedCount: plateau.flaggedCount,
      plateauLongestRun: plateau.longestRun,
    };
  });

  writeFileSync("data/cells.json", JSON.stringify(cells, null, 2));
  console.log(`Wrote data/cells.json with ${Object.keys(cells).length} cells.`);
  console.log(`Flagged low-confidence cells: ${flaggedLowConfidence} (fewer than 20 years, or a plateau).`);
  console.log(`Of those, cells with a top-1-percent plateau pattern: ${flaggedPlateau}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
