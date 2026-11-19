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
}

function main() {
  const facilitiesPath = "data/facilities.json";
  const pinsPath = "data/pins.json";
  const latestPath = "data/latest.json";

  if (!existsSync(pinsPath)) {
    console.log("No data/pins.json yet. Run npm run pin:cells first. Skipping web data build.");
    return;
  }

  const facilities: Facility[] = JSON.parse(readFileSync(facilitiesPath, "utf-8"));
  const pins = JSON.parse(readFileSync(pinsPath, "utf-8")) as Record<string, unknown>;
  const pinnedIds = new Set(Object.keys(pins));

  // Only ship the pilot facilities that were actually pinned, plus their
  // own state, not the full national facility file.
  const pilotFacilities = facilities.filter((f) => pinnedIds.has(f.id));

  const byState = new Map<string, Facility[]>();
  for (const f of pilotFacilities) {
    const slug = slugifyState(f.state);
    if (!byState.has(slug)) byState.set(slug, []);
    byState.get(slug)!.push({
      id: f.id,
      name: f.name,
      state: f.state,
      lga: f.lga,
      lat: f.lat,
      lon: f.lon,
      type: f.type,
      source: f.source,
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
