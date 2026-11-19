export type Level = "NO_SIGNAL" | "NORMAL" | "WATCH" | "WARNING" | "SEVERE";

export interface Facility {
  id: string;
  name: string;
  state: string;
  lga: string;
  lat: number;
  lon: number;
  type?: string;
}

export interface FacilityStatus {
  cell: { lat: number; lon: number };
  distance_km: number;
  level: Level;
  lowConfidence: boolean;
  ratioToP95: number | null;
}

export interface LatestData {
  generated_at: string;
  model: string;
  floor_m3s: number;
  cells: Record<
    string,
    {
      cell: { lat: number; lon: number };
      forecastMax: number;
      forecastDaily: { date: string; value: number }[];
      level: Level;
      lowConfidence: boolean;
      ratioToP95: number | null;
      p50: number;
      p95: number;
      p99: number;
      max2022: number;
    }
  >;
  facilities: Record<string, FacilityStatus>;
}

export const LEVEL_LABELS: Record<Level, string> = {
  NO_SIGNAL: "No signal",
  NORMAL: "Normal",
  WATCH: "Watch",
  WARNING: "Warning",
  SEVERE: "Severe",
};

export const LEVEL_COLORS: Record<Level, string> = {
  NO_SIGNAL: "#8A8F94",
  NORMAL: "#2F6F73",
  WATCH: "#C98A00",
  WARNING: "#C2410C",
  SEVERE: "#7F1D1D",
};

// Shapes, so color is never the only signal (docs/claude.md Design section).
export const LEVEL_SHAPES: Record<Level, string> = {
  NO_SIGNAL: "hollow-dotted-circle",
  NORMAL: "circle",
  WATCH: "triangle",
  WARNING: "square",
  SEVERE: "diamond-hatch",
};
