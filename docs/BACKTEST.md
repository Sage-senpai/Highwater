# Backtest

## Status

Draft written before the 2022 replay was run against real pinned cells (blocked on Open-Meteo's hourly
request limit, see DECISIONS.md). This file will be filled in with real hit/miss/false-alarm numbers once
`npm run replay -- --date 2022-10-01` (or the relevant 2022 window) runs against `data/pins.json` and
`data/cells.json`. Until then, say in the app that the backtest numbers below are pending, not invent them.

## Source of events

HDX "Nigeria: Flood data" (data.humdata.org/dataset/4cc05f0e-e794-4541-8e99-2073ace1f237), CC BY. This
dataset bundles several separate submissions with different coverage and different dates:

- `2022-flood-affected-areas-2022-by-lgas-as-of-30th-october-2022-3.csv`: 65 LGA rows, but only Adamawa,
  Borno and Yobe. Does not cover any of this project's pilot corridor states.
- `bylga-as-of-8-august-2022.csv`: 15 rows, Borno and Yobe only. Same limit.
- `nema-flood-data-06102022.xlsx` (NEMA Flood Data, 6 October 2022): 840 rows across 32 states and the FCT,
  with state, LGA, community/ward name and an affected-people count. This is the resource actually used
  for the comparison below, parsed with `pipeline/backtest-extract.ts` (the xlsx has no CSV sibling, so the
  file was unzipped with `unzip` and its worksheet XML parsed directly; this is a one-off step, not part of
  the daily refresh, since the 2022 event data is static).

Coverage of this project's 9 pilot corridor states in the NEMA file, counted from
`data/raw/nema_2022_lga.csv` on 2026-11-20:

| State | Rows | Unique LGAs reported flooded |
|---|---|---|
| Kogi | 3 | 3 (Idah, Ijumu, Ogori/Magongo) |
| Niger | 20 | 18 |
| Kwara | 12 | 12 |
| Benue | 112 | 14 |
| Nasarawa | 84 | 11 |
| Delta | 15 | 4 |
| Anambra | 61 | 12 |
| Bayelsa | 0 | 0 (not present in this resource, despite 2022 Bayelsa flooding being documented elsewhere, see docs/build-plan.md appendix A) |
| Jigawa | 18 | 13 |

Bayelsa's absence here is a gap in this specific NEMA submission, not evidence Bayelsa was unaffected.
Said plainly rather than left out.

## Method

For each pilot corridor state, compare:

- LGAs reported in the NEMA 2022 data above (ground truth signal, non-exhaustive).
- LGAs that contain at least one pilot facility whose pinned cell reached WATCH or higher in the 2022
  replay window (see `npm run replay`).

Report hits (LGA flooded and flagged), misses (LGA flooded, not flagged), false alarms (LGA flagged, not
in the flood data) and the sample size (how many LGAs had a pilot facility at all). Thresholds are not
tuned to improve this result; if a threshold changes for any reason, the old and new values and the
reason are logged in DECISIONS.md, separately from this file.

## Result

Pending. Needs `data/replay-<date>.json` for a 2022 window, which needs `data/pins.json` and
`data/cells.json`, which are blocked on the Open-Meteo hourly request limit as of 2026-11-20 00:20.
See PROGRESS.md for the resumed run and its outcome.

## Honest caveats regardless of the result

- The NEMA file is a single submission with incomplete state coverage (see table above). A miss in this
  comparison could mean the model missed the event, or could mean the event was never in this file.
- LGA-level ground truth is coarser than a facility. A flagged facility and a flooded LGA can both be true
  without the facility itself having flooded.
- This is the only backtest available for this build. One data point is not validation. See
  docs/claude.md's claims policy: nothing here is called "validated" on the strength of this alone.
