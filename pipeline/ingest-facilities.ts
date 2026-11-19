// M1: read the raw HDX "Nigeria: Health facilities" GeoJSON, clean it, and
// write data/facilities.json. See docs/DATA_AUDIT.md for the audit numbers
// this script produced.
import { readFileSync, writeFileSync } from "node:fs";
import { filterByCoordinates, countDuplicateCoordinates } from "./lib/facilities.js";

const RAW_PATH = "data/raw/NigeriaHealthFacilities.json";
const OUT_PATH = "data/facilities.json";
const SOURCE = "HDX nigeria-health-facilities (GRID3-derived), CC BY, retrieved 2026-11-19";

interface RawFeature {
  properties: {
    id: number;
    name: string;
    lga_name: string | null;
    state_name: string | null;
    type: string | null;
    category: string | null;
  };
  geometry: { type: string; coordinates: [number, number] } | null;
}

function main() {
  const raw = JSON.parse(readFileSync(RAW_PATH, "utf-8")) as {
    totalFeatures: number;
    features: RawFeature[];
  };

  const rows = raw.features.map((f) => {
    const coords = f.geometry?.coordinates ?? null;
    return {
      id: String(f.properties.id),
      name: f.properties.name ?? "Unnamed facility",
      state: f.properties.state_name ?? "",
      lga: f.properties.lga_name ?? "",
      type: f.properties.category ?? undefined,
      lon: coords ? coords[0] : null,
      lat: coords ? coords[1] : null,
    };
  });

  const { kept, droppedBadCoords, droppedOutOfBbox } = filterByCoordinates(rows);
  const dupCount = countDuplicateCoordinates(kept);

  const facilities = kept.map((r) => ({
    id: r.id,
    name: r.name,
    state: r.state,
    lga: r.lga,
    lat: r.lat,
    lon: r.lon,
    type: r.type,
    source: SOURCE,
  }));

  writeFileSync(OUT_PATH, JSON.stringify(facilities, null, 2));

  console.log(`Read ${raw.features.length} raw rows.`);
  console.log(`Dropped ${droppedBadCoords} rows with missing/bad coordinates.`);
  console.log(`Dropped ${droppedOutOfBbox} rows outside the Nigeria bounding box.`);
  console.log(`Kept ${facilities.length} facilities. ${dupCount} rows share an exact duplicate coordinate.`);
  console.log(`Wrote ${OUT_PATH}`);
}

main();
