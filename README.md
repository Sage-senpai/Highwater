# HighWater

A river-level warning for Nigerian primary health facilities near large rivers, built overnight for the
AIESEC x HISA Innovation Hackathon, Climate track (19 to 20 November 2026).

## What this is

HighWater links each facility in its pilot to the nearest usable river-discharge grid cell in the
Open-Meteo Flood API (GloFAS), and compares that cell's 7-day forecast against the cell's own 30-year
history. A facility is flagged NORMAL, WATCH, WARNING or SEVERE depending on how the forecast compares to
that cell's own 95th percentile, 99th percentile, and 2022 annual maximum. NO_SIGNAL means the cell's
history is too small to be a river at all (see "Alert levels" below).

## What this is not

It is not a flood-inundation forecast for a specific building. It does not claim real-time data, AI or
machine learning, or validated accuracy. Nothing here is learned from data; every threshold is a fixed
percentile computed once from each cell's own 30-year history. See docs/claude.md's claims policy for the
exact wording this project is held to.

## Alert levels

| Level | Meaning |
|---|---|
| NO_SIGNAL | The cell's 30-year median discharge is below 100 m3/s (an arbitrary floor, configurable) |
| NORMAL | 7-day forecast maximum at or below the cell's own 95th percentile |
| WATCH | Above the 95th percentile |
| WARNING | Above the 99th percentile |
| SEVERE | Above the cell's own 2022 annual maximum |
| LOW_CONFIDENCE | Fewer than 20 years of history, or a long repeated-value plateau in the record |

## Setup

Requires Node 20 or newer.

```
npm install
npm test
npm run ingest:facilities   # downloads data/raw/NigeriaHealthFacilities.json first, see docs/DATA_AUDIT.md
npm run pin:cells
npm run climatology
npm run refresh
npm run alerts
npm run build:web-data
cd web && npm install && npm run dev
```

`npm run replay -- --date YYYY-MM-DD` replays a historical window as if it were a forecast, labelled
"historical replay using reanalysis, not a past forecast" everywhere it appears.

## Data sources

- River discharge: Open-Meteo Flood API (GloFAS v4), no key required for non-commercial use.
  https://open-meteo.com/en/docs/flood-api
  Note: this API has a tight, undocumented hourly request limit (discovered the hard way, see
  DECISIONS.md and docs/DATA_AUDIT.md). The pipeline caches every response per point on disk
  (`data/cache/`, gitignored) and resumes where it left off across runs, but a full pilot run can take
  more than one hour of wall-clock time across several attempts.
- Facility locations: HDX "Nigeria: Health facilities" (GRID3-derived), CC BY. Not validated against a
  site visit. See docs/DATA_AUDIT.md for the full audit.
- 2022 flood events for the backtest: HDX "Nigeria: Flood data" (NEMA), CC BY. See docs/BACKTEST.md.
- Map tiles: CARTO light basemap, free, no key, attribution shown in the app.

Full attribution list, with licenses, in ATTRIBUTIONS.md.

## Limits

- Model resolution is about 5 km. A grid cell is not a measurement at a clinic door.
- Small streams and hill towns are not represented; the model returns no usable signal there (tested near
  Enugu and Nsukka).
- Facility locations are non-validated.
- Thresholds are percentiles of a model's own history, not gauge levels.
- An existing national system (NIHSA) already forecasts floods and runs a public dashboard. This project's
  difference is the facility link and the drafted alert, not the forecast itself.

## License

TBD, pending the owner's decision for the hackathon submission.

## Project logs

- PROGRESS.md: dated handoff log, newest first, with a NEEDS OWNER section at the top.
- DECISIONS.md: short dated entries for every threshold change, fallback and scope decision.
- ATTRIBUTIONS.md: every third-party dataset, API, library and reference repo, with its license.
- docs/DATA_AUDIT.md, docs/BACKTEST.md, docs/PITCH.md: the audit, the 2022 backtest, and the pitch script.
