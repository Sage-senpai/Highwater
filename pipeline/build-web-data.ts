// M5/M9: builds web/public/data/* from the pipeline outputs, so the web
// app only ever reads static JSON. Run after refresh or replay.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { slugifyState } from "./lib/slug.js";

interface Facility {
  id: string;
  name: string;
  state: string;
  lga: string;
  lat: number;
  lon: number;
  type?: string;
  source: string;
  // Experimental, separate layer: a different data source and method
  // than the river level (see pipeline/heat-cold.ts, docs/PITCH.md).
  // Present only for facilities whose 0.5 degree cell has been resolved
  // so far (the heat/cold layer is nationwide but builds up over several
  // runs under the weather API's own rate limit, same pattern as the
  // river pilot).
  heatRiskIn7Days?: boolean;
  coldRiskIn7Days?: boolean;
  heatColdLowConfidence?: boolean;
}

function main() {
  const facilitiesPath = "data/facilities.json";
  const pinsPath = "data/pins.json";
  const latestPath = "data/latest.json";
  const heatColdPath = "data/heatcold.json";

  if (!existsSync(pinsPath)) {
    console.log("No data/pins.json yet. Run npm run pin:cells first. Skipping web data build.");
    return;
  }

  const facilities: Facility[] = JSON.parse(readFileSync(facilitiesPath, "utf-8"));
  const pins = JSON.parse(readFileSync(pinsPath, "utf-8")) as Record<string, unknown>;
  const pinnedIds = new Set(Object.keys(pins));

  // Only ship the pilot facilities that were actually pinned, plus their
  // own state, not the full national facility file. The heat/cold layer
  // itself is computed nationwide (pipeline/heat-cold.ts covers all
  // facilities), but the current web app only has a map and state
  // picker for the river pilot's states, so that is the only slice shown
  // for now. Attaching the flag here does not limit the underlying data.
  const pilotFacilities = facilities.filter((f) => pinnedIds.has(f.id));

  let heatCold: {
    cells: Record<string, { heatP95: number; coldP5: number; lowConfidence: boolean; days: { flag: string }[] }>;
    facilities: Record<string, { cell: string }>;
  } | null = null;
  if (existsSync(heatColdPath)) {
    heatCold = JSON.parse(readFileSync(heatColdPath, "utf-8"));
  }

  const byState = new Map<string, Facility[]>();
  for (const f of pilotFacilities) {
    const slug = slugifyState(f.state);
    if (!byState.has(slug)) byState.set(slug, []);
    const hc = heatCold?.facilities[f.id];
    const cellData = hc ? heatCold!.cells[hc.cell] : undefined;
    byState.get(slug)!.push({
      id: f.id,
      name: f.name,
      state: f.state,
      lga: f.lga,
      lat: f.lat,
      lon: f.lon,
      type: f.type,
      source: f.source,
      ...(cellData
        ? {
            heatRiskIn7Days: cellData.days.some((d) => d.flag === "HEAT_RISK"),
            coldRiskIn7Days: cellData.days.some((d) => d.flag === "COLD_RISK"),
            heatColdLowConfidence: cellData.lowConfidence,
          }
        : {}),
    });
  }

  mkdirSync("web/public/data/facilities", { recursive: true });
  for (const [slug, list] of byState) {
    writeFileSync(`web/public/data/facilities/${slug}.json`, JSON.stringify(list));
  }
  writeFileSync("web/public/data/states.json", JSON.stringify([...byState.keys()].sort()));

  if (existsSync(latestPath)) {
    const latest = readFileSync(latestPath, "utf-8");
    writeFileSync("web/public/data/latest.json", latest);
  }

  console.log(`Wrote ${byState.size} per-state facility files, ${pilotFacilities.length} facilities total.`);
}

main();
