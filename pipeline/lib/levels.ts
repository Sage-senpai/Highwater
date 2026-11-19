// Alert level rules from docs/claude.md "Alert levels". Compute from the
// cell's own 30-year history only.

export const FLOOR_M3S = 100; // arbitrary, configurable, shown in the UI

export type Level = "NO_SIGNAL" | "NORMAL" | "WATCH" | "WARNING" | "SEVERE";

export interface CellThresholds {
  p50: number;
  p95: number;
  p99: number;
  max2022: number;
  yearsOfData: number;
  lowConfidence: boolean;
}

export interface LevelResult {
  level: Level;
  lowConfidence: boolean;
  ratioToP95: number | null;
}

// forecastMax is the 7-day forecast maximum discharge for the pinned cell.
export function computeLevel(forecastMax: number, cell: CellThresholds): LevelResult {
  const lowConfidence = cell.lowConfidence || cell.yearsOfData < 20;

  if (cell.p50 < FLOOR_M3S) {
    return { level: "NO_SIGNAL", lowConfidence, ratioToP95: null };
  }

  const ratioToP95 = cell.p95 > 0 ? forecastMax / cell.p95 : null;

  let level: Level = "NORMAL";
  if (forecastMax > cell.max2022) {
    level = "SEVERE";
  } else if (forecastMax > cell.p99) {
    level = "WARNING";
  } else if (forecastMax > cell.p95) {
    level = "WATCH";
  } else {
    level = "NORMAL";
  }

  return { level, lowConfidence, ratioToP95 };
}
