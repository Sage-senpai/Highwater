// Experimental heat/cold risk flags. A different method and data source
// than the river-level warning (docs/claude.md's NORMAL/WATCH/WARNING/
// SEVERE/NO_SIGNAL levels): this uses Open-Meteo's standard weather
// forecast and historical archive, not GloFAS river discharge, and is
// never blended into the river level. See docs/PITCH.md for why this
// layer exists (Enugu and Nsukka have no usable river signal, but heat
// and harmattan cold are real, documented, nationwide risks).

export interface HeatColdThresholds {
  // p95 of the cell's own historical daily max apparent temperature.
  heatP95: number;
  // p5 of the cell's own historical daily min temperature.
  coldP5: number;
  yearsOfData: number;
}

export type HeatColdFlag = "HEAT_RISK" | "COLD_RISK" | "NONE";

export interface HeatColdDay {
  date: string;
  flag: HeatColdFlag;
  maxApparentC: number;
  minC: number;
}

// Arbitrary in the same sense as the river floor_m3s: fewer than this many
// years of history makes a percentile too noisy to trust. Shown wherever
// this layer's confidence is shown, not hidden.
export const MIN_YEARS_FOR_CONFIDENCE = 10;

export function classifyDay(
  maxApparentC: number,
  minC: number,
  thresholds: HeatColdThresholds
): HeatColdFlag {
  if (maxApparentC > thresholds.heatP95) return "HEAT_RISK";
  if (minC < thresholds.coldP5) return "COLD_RISK";
  return "NONE";
}

export function buildForecastDays(
  dates: string[],
  maxApparentC: (number | null)[],
  minC: (number | null)[],
  thresholds: HeatColdThresholds
): HeatColdDay[] {
  return dates.map((date, i) => {
    const maxA = maxApparentC[i] ?? -Infinity;
    const minT = minC[i] ?? Infinity;
    return {
      date,
      flag: classifyDay(maxA, minT, thresholds),
      maxApparentC: maxA,
      minC: minT,
    };
  });
}
