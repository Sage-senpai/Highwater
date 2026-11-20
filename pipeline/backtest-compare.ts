// M8: compare the 2022 replay's WATCH-or-higher facilities against the
// NEMA 2022 flood LGA data, by state+LGA. One-off analysis script, run by
// hand after a replay exists; writes nothing, just prints the numbers
// that go into docs/BACKTEST.md so they are reproducible from the repo.
import { readFileSync, existsSync } from "node:fs";

interface Facility {
  id: string;
  state: string;
  lga: string;
}

function main() {
  const replayPath = process.argv[2] ?? "data/replay-2022-10-01.json";
  if (!existsSync(replayPath)) {
    console.error(`${replayPath} does not exist. Run npm run replay first.`);
    process.exit(1);
  }
  const facilities: Facility[] = JSON.parse(readFileSync("data/facilities.json", "utf-8"));
  const facById = new Map(facilities.map((f) => [f.id, f]));
  const replay = JSON.parse(readFileSync(replayPath, "utf-8")) as {
    facilities: Record<string, { level: string }>;
  };

  const nemaLines = readFileSync("data/raw/nema_2022_lga.csv", "utf-8").split("\n").slice(1);
  const nemaLgas = new Set<string>();
  for (const line of nemaLines) {
    const m = line.match(/^"([^"]*)","([^"]*)",/);
    if (!m) continue;
    nemaLgas.add(`${m[1]}|${m[2]}`);
  }

  // Sample size: every distinct (state, LGA) pair that has at least one
  // pilot facility in this replay, whether flagged or not.
  const sampleLgas = new Set<string>();
  const flaggedLgas = new Set<string>();
  for (const [fid, status] of Object.entries(replay.facilities)) {
    const f = facById.get(fid);
    if (!f) continue; // spot-check synthetic points have no real LGA
    const key = `${f.state}|${f.lga}`;
    sampleLgas.add(key);
    if (status.level === "WATCH" || status.level === "WARNING" || status.level === "SEVERE") {
      flaggedLgas.add(key);
    }
  }

  let hits = 0;
  let misses = 0;
  let falseAlarms = 0;
  const hitList: string[] = [];
  const missList: string[] = [];
  const falseAlarmList: string[] = [];

  for (const lga of sampleLgas) {
    const inNema = nemaLgas.has(lga);
    const flagged = flaggedLgas.has(lga);
    if (flagged && inNema) {
      hits++;
      hitList.push(lga);
    } else if (!flagged && inNema) {
      misses++;
      missList.push(lga);
    } else if (flagged && !inNema) {
      falseAlarms++;
      falseAlarmList.push(lga);
    }
  }

  console.log(`Sample size: ${sampleLgas.size} distinct (state, LGA) pairs with a pilot facility.`);
  console.log(`Flagged (WATCH or higher) LGAs: ${flaggedLgas.size}.`);
  console.log(`Hits (flagged and in NEMA 2022 data): ${hits}`, hitList.sort());
  console.log(`Misses (in NEMA 2022 data, not flagged): ${misses}`, missList.sort());
  console.log(`False alarms (flagged, not in NEMA 2022 data): ${falseAlarms}`, falseAlarmList.sort());
}

main();
