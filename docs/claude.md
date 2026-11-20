# HighWater

River-flood early warning for Nigerian primary health facilities.
Built for the AIESEC x HISA Innovation Hackathon, Climate track, 19 to 20 November 2026.

Read this file fully, then read docs/BUILD_PLAN.md. Work through the milestones in order.

## What this is, and what it is not

HighWater tells a health officer which facilities sit near a large river that is forecast above its own historical flood levels, one week ahead, and drafts the alert message.

It is a river-level warning mapped to nearby facilities. It is NOT a flood-inundation forecast for a building. Do not say otherwise in the UI, README, commits, or pitch. See the claims policy below.

Users: LGA and state health officers, PHC in-charges, emergency managers.
Problem evidence (all sourced in docs/BUILD_PLAN.md, appendix A): flooded and damaged PHCs in Bayelsa, Jigawa, Kogi and Borno, and a 2026 national flood outlook naming 14,118 high-risk communities.

## Verified facts the design rests on

Tested from the owner's machine on 19 Nov 2026. Re-test anything you depend on.

- The Open-Meteo flood API works with no key for non-commercial use and returns GloFAS river discharge in m3/s.
  `https://flood-api.open-meteo.com/v1/flood?latitude=7.80&longitude=6.74&daily=river_discharge&forecast_days=7`
  `start_date` and `end_date` work. A request from 1984-01-01 to 2026-11-18 returned 15,663 rows.
- It snaps to a grid cell, not to a river. At Onitsha (6.15, 6.78) the snapped cell had 0.42 m3/s while the Niger, about 6,100 m3/s, was one cell west. Searching a window around the point and taking the strongest cell fixed that.
- The lattice step is about 0.05 degrees in longitude and about 0.1 in latitude in one test. Do not assume a square grid.
- At the tested Lokoja cell (7.825, 6.725) history is null for 1984 to 1996 and complete from 1997 to 2026-11-18 (10,914 values). Check every cell.
- Small streams near Enugu (6.425, 7.475) and Nsukka (6.875, 7.375) return about 0.1 to 0.2 m3/s. No usable flood signal there.
- At Lokoja the 1999 peak repeats 15957.79 on three consecutive days, and a November median equalled a forecast value to the cent. Cause unknown. Never present a single record value as a measured peak. Log what you find in docs/DATA_AUDIT.md.
- The Lokoja cell record (about 15,958) is half of Onitsha's (about 30,619). That cell may carry one river, not the combined Niger and Benue. Never call it the combined flow.

## Unverified: check before relying on it

- GRID3 health facility file: columns, formats, license, record counts. grid3.org lists v3.0 (August 2026, 24 states including Enugu, Kogi, Niger, Kwara, Delta, Bayelsa); a v2.0 page says it is superseded by v4.0. Which is current is unknown.
- Whether facility records have a type or level column.
- Open-Meteo rate limits, terms for a prize competition, required attribution, and whether the flood API accepts several comma-separated coordinates in one call.
- Hackathon rules on reusing open-source code. The flyer states none. The owner will check. Log every third-party item in ATTRIBUTIONS.md.
- Map tile terms for any provider you pick.

## Architecture: static first

```
 GRID3 / HDX / NCDC facility files          Open-Meteo Flood API (GloFAS)
            |                                        |
            v                                        v
   [pipeline: TypeScript, Node 20+]  -----------------+
     1 ingest + clean facilities
     2 find river cell per facility (window search, pin it)
     3 30-year climatology per cell (p50, p95, p99, record, 2022 max)
     4 daily refresh: 7-day forecast -> level per facility
     5 alert text + CAP XML
            |
            v
   data/*.json  --copy-->  web/public/data/*.json
            |
            v
   [web: Vite + React + TypeScript + MapLibre GL]  static site on Vercel
            |
   GitHub Actions cron (daily) reruns the pipeline and commits fresh data
```

Why static: nothing to host, nothing to crash during judging, and the whole system fits in one night. A server is only added for real SMS subscriptions, and that is a stretch goal.

Folders:

```
highwater/
  CLAUDE.md
  PROGRESS.md        handoff log, newest first
  DECISIONS.md       short dated entries
  ATTRIBUTIONS.md    every dataset, API, library, repo, with license
  docs/              BUILD_PLAN.md, DATA_AUDIT.md, BACKTEST.md, PITCH.md
  pipeline/          scripts and tests
  data/              small committed outputs; data/raw and data/cache are gitignored
  web/               the app
  _refs/             cloned reference repos, gitignored, read-only
  .github/workflows/refresh.yml
```

## Stack

TypeScript everywhere, so the owner needs no Python. Node 20 or newer, built-in `fetch`.
Pipeline: `tsx`, `csv-parse`, `@turf/turf`, `vitest`, `fast-xml-parser` (for CAP checks).
Web: Vite, React, TypeScript, MapLibre GL JS, a small chart library (uPlot or Recharts), plain CSS with variables. No UI kit.
Keep dependencies few and pinned. Run `npm audit` once and record the result.

## Alert levels (per facility, from its pinned river cell)

Compute from the cell's own 30-year history, never from another cell's.

- NO_SIGNAL: the cell's 30-year median is below the floor (default 100 m3/s, configurable, an arbitrary value, say so in the UI).
- NORMAL: 7-day forecast maximum at or below p95.
- WATCH: above p95.
- WARNING: above p99.
- SEVERE: above that cell's 2022 annual maximum.
- LOW_CONFIDENCE flag: fewer than 20 years of history, or a long repeated-value plateau.

Pin the cell once per facility (highest 30-year median in the search window) and store it. Do not re-pick by today's forecast, because the level could flip for no physical reason.

## Rules of work (overnight, unattended)

1. One milestone at a time. At the end of each: run tests, lint and build, commit, add an entry to PROGRESS.md.
2. "Done" needs evidence: a test, an output file, or a screenshot. Never mark a milestone done on belief.
3. Record failures as plainly as successes. If something does not work, write what you tried and what you saw.
4. If blocked more than 20 minutes on one step, use the documented fallback, log it in DECISIONS.md, and move on.
5. Do not tune thresholds to make results look better. If you change one, record the old value, the new value and why.
6. Windows 11 with PowerShell. Use cross-platform npm scripts. No bash-only syntax. Add `.gitattributes` with `* text=auto`.
7. Check `node --version` first. If Node is below 20, stop and tell the owner. Do not install system software unattended. Use the project folder only.
8. Never touch files outside this repo folder.
9. If a session ends, the next one starts by reading PROGRESS.md, DECISIONS.md and `git log --oneline -20`.
10. Ask the owner (write it at the top of PROGRESS.md under NEEDS OWNER) for: `vercel login`, SMS keys, the hackathon rules check, and anything legal.
    Update, 2026-11-20: the owner confirmed in chat that reusing other open-source repos/code for this hackathon is fine, resolving the hackathon-rules-check item (see PROGRESS.md NEEDS OWNER). This does not change the license rules in "Reference repos" above or the ATTRIBUTIONS.md requirement.

## Commits

Small and frequent, after each feature or milestone. Format `type(scope): summary`, for example `feat(pipeline): pin river cell per facility`. Types: feat, fix, data, docs, test, chore. No secrets, no raw datasets over 5 MB, no `_refs/`.

## Secrets and keys

The MVP needs no API keys. Keep it that way.
Optional keys, which the OWNER creates from their own free accounts and puts in `.env.local` (gitignored): an SMS provider sandbox (for example Africa's Talking sandbox; verify it exists and its terms), a Vercel token.
Never search GitHub, gists, pastebins or any site for other people's keys, tokens or credentials, and never use any you come across. Those belong to someone else and using them is unauthorized access. If you find one in a cloned repo, do not use it, and note the repo in DECISIONS.md.
SMS defaults to a mock adapter that writes to an outbox file. Real sending requires `SEND_REAL_SMS=true` and keys the owner set.

## Reference repos (read-only, in `_refs/`, shallow clone)

- COS-IT-FLOWS/cos-it-flows_app: MIT. Django backend, React frontend, ML folder. Last commit Feb 2025, about 490 MB. Default decision: reuse nothing. Read for ideas for at most 20 minutes. Copy a UI component only if it drops in and runs within 30 minutes, and log it.
- icpac-igad/flood_watch_system: orchestration only, no LICENSE file at the top level. Application code lives in other repos with their own licenses. Read the architecture and CAP alert handling. Copy no code.
- CLIMADA (CLIMADA-project/climada_python): GPL-3.0, heavy. Do not add as a dependency. Read its hazard, exposure and vulnerability framing only.
- ECMWF Code for Earth, Africa stream, challenge 41 "Missed Opportunities in Flood Disaster Risk Management": find its GitHub issue or repo, read the problem text for framing. The 2026 programme has ended.

## Design

Before building the UI (M5), if a skill named `frontend-design` or any other design skill is available, load and follow it. If none is available, follow this section.

Direction: a calm field-operations tool that a tired officer can read on a phone in sunlight. Paper and ink, not neon dark SaaS. No stock gradients, no glassmorphism, no generic hero section.

- Mobile first. Map full screen, details in a bottom sheet on phones and a side panel on desktop.
- Colour is never the only signal. Each level also has a shape and a label.

| Level | Colour | Shape |
|---|---|---|
| NORMAL | teal `#2F6F73` | circle |
| WATCH | amber `#C98A00` | triangle |
| WARNING | burnt red `#C2410C` | square |
| SEVERE | deep red `#7F1D1D` with hatch | diamond |
| NO_SIGNAL | grey `#8A8F94` | hollow circle, dotted |

- Surface `#F6F4EF`, ink `#14211F`. Run contrast checks to WCAG AA and fix any colour that fails.
- Type: a self-hosted free font such as Public Sans or Source Sans 3 through fontsource. Large numbers for discharge and dates.
- Low bandwidth: target under 300 KB of JS on first load (gzipped). Split facility data per state and lazy-load it.
- Every screen has a visible data-quality line: source, date, "modelled, not measured".
- Keyboard accessible, labelled controls, readable at 200 percent zoom.
- UI copy is short and plain. No exclamation marks, no jargon without a gloss.

## Claims policy

Allowed: "river-level warning for facilities near large rivers", "forecast above its own 30-year 95th percentile", "uses open GloFAS data via Open-Meteo", "facility locations from GRID3, not validated".
Not allowed unless you have evidence in this repo: "predicts flooding at your facility", "real-time", "AI" or "machine learning" (nothing here is learned), "validated", "accurate", any number you did not compute or source.
Every statistic in the UI, README or pitch must trace to a file in this repo or a URL in appendix A of docs/BUILD_PLAN.md.
Show limits in the app: model resolution about 5 km, small streams not represented, facility data non-validated, thresholds are percentiles of a model, not gauge levels.

## Writing style

No em dashes anywhere: code comments, UI copy, docs, commit messages. Use commas, colons or full stops. Plain, specific sentences. No filler, no marketing adjectives, no "seamless", "robust", "leverage", "empower".