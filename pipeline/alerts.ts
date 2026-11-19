// M7: generates alert text and CAP XML for every facility at WATCH or
// above in data/latest.json, writes web/public/alerts/<id>.xml, and
// appends to the mock SMS outbox at data/outbox.json. Real sending
// requires SEND_REAL_SMS=true and keys the owner sets (see .env.example);
// this script only ever uses the mock adapter.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { buildAlertText } from "./lib/alerttext.js";
import { buildCapXml } from "./lib/cap.js";

interface Facility {
  id: string;
  name: string;
  state: string;
  lga: string;
  lat: number;
  lon: number;
}

interface LatestFacilityStatus {
  level: string;
}

function peakDateFromForecast(daily: { date: string; value: number }[]): string {
  if (daily.length === 0) return new Date().toISOString().slice(0, 10);
  let best = daily[0];
  for (const d of daily) if (d.value > best.value) best = d;
  return best.date;
}

function main() {
  const facilitiesPath = "data/facilities.json";
  const pinsPath = "data/pins.json";
  const latestPath = "data/latest.json";

  if (!existsSync(latestPath) || !existsSync(pinsPath)) {
    console.log("No data/latest.json or data/pins.json yet. Run npm run refresh first. Skipping alert generation.");
    return;
  }

  const facilities: Facility[] = JSON.parse(readFileSync(facilitiesPath, "utf-8"));
  const facilityById = new Map(facilities.map((f) => [f.id, f]));
  const latest = JSON.parse(readFileSync(latestPath, "utf-8")) as {
    generated_at: string;
    facilities: Record<string, LatestFacilityStatus & { cell: { lat: number; lon: number } }>;
    cells: Record<string, { forecastDaily: { date: string; value: number }[] }>;
  };

  mkdirSync("web/public/alerts", { recursive: true });

  const outboxPath = "data/outbox.json";
  const outbox: unknown[] = existsSync(outboxPath) ? JSON.parse(readFileSync(outboxPath, "utf-8")) : [];
  const todayAlerts: { facilityId: string; text: string; level: string; capUrl: string }[] = [];

  let count = 0;
  for (const [facilityId, status] of Object.entries(latest.facilities)) {
    if (status.level !== "WATCH" && status.level !== "WARNING" && status.level !== "SEVERE") continue;
    const facility = facilityById.get(facilityId);
    if (!facility) continue;

    const cellKey = `${status.cell.lat.toFixed(4)},${status.cell.lon.toFixed(4)}`;
    const cell = latest.cells[cellKey];
    const peakDate = cell ? peakDateFromForecast(cell.forecastDaily) : new Date().toISOString().slice(0, 10);

    const level = status.level as "WATCH" | "WARNING" | "SEVERE";
    const text = buildAlertText({
      facilityName: facility.name,
      state: facility.state,
      level,
      peakDate,
    });

    const now = new Date().toISOString();
    const capXml = buildCapXml({
      id: `highwater-${facilityId}-${now.slice(0, 10)}`,
      sentIso: now,
      facilityName: facility.name,
      state: facility.state,
      lga: facility.lga,
      lat: facility.lat,
      lon: facility.lon,
      level,
      headline: `River forecast above ${level.toLowerCase()} level near ${facility.name}`,
      description: text,
      effectiveIso: now,
      expiresIso: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    writeFileSync(`web/public/alerts/${facilityId}.xml`, capXml);

    todayAlerts.push({
      facilityId,
      text,
      level,
      capUrl: `/alerts/${facilityId}.xml`,
    });

    outbox.push({
      facilityId,
      facilityName: facility.name,
      state: facility.state,
      level,
      text,
      sent_at: now,
      adapter: "mock",
      real_send: process.env.SEND_REAL_SMS === "true",
    });
    count++;
  }

  writeFileSync(outboxPath, JSON.stringify(outbox, null, 2));
  mkdirSync("web/public/data", { recursive: true });
  writeFileSync("web/public/data/alerts-today.json", JSON.stringify(todayAlerts, null, 2));
  console.log(`Generated ${count} alerts (CAP XML plus mock outbox entries plus web/public/data/alerts-today.json).`);
  if (process.env.SEND_REAL_SMS === "true") {
    console.log("SEND_REAL_SMS=true was set, but no real SMS adapter is wired up in this MVP. Nothing was sent.");
  }
}

main();
