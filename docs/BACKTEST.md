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

Real numbers now exist. `npm run replay -- --date 2022-10-01` ran against 86 pinned facilities across 6
states (Kogi, Niger, Kwara, Nasarawa, Benue, Anambra; see docs/DATA_AUDIT.md for the full coverage table).
`pipeline/backtest-compare.ts` compared the replay's WATCH-or-higher facilities against the NEMA 2022 LGA
data by (state, LGA):

- Sample size: 49 distinct (state, LGA) pairs with at least one pilot facility.
- Flagged (WATCH or higher) LGAs in the replay: 18.
- Hits (flagged and in the NEMA 2022 data): 9. Benue: Katsina-Ala, Kwande. Kogi: Idah. Nasarawa: Toto.
  Niger: Borgu, Bosso, Katcha, Magama, Shiroro.
- Misses (in the NEMA 2022 data, not flagged): 17. Benue: Ado, Apa, Makurdi, Oturkpo, Vandeikya. Kogi:
  Ijumu. Kwara: Asa, Ilorin West, Kaiama, Oyun. Niger: Agwara, Gurara, Kontagora, Lavun, Mariga, Mashegu,
  Paikoro.
- False alarms (flagged, not in the NEMA 2022 data): 9. Benue: Tarka. Kogi: Bassa, Ibaji, Kogi, Lokoja,
  Ofu, Omala. Niger: Edati, Gbako.

Read plainly: of the LGAs this pilot could even check, about half the ones NEMA reported as flooded were
missed, and the flagged set has close to as many false alarms as hits. This is a single replay window
(2022-10-01 to 2022-10-07) against a 49-LGA sample from a 9-state candidate pool that was itself cut short
by an API rate limit, not a validated detector. Do not say this model is accurate or validated based on
this number. The honest summary for the pitch is: it finds some real events, misses others, and the
false-alarm rate is not low. Reproduce with `npx tsx pipeline/backtest-compare.ts data/replay-2022-10-01.json`
once `data/raw/nema_2022_lga.csv` exists (from `pipeline/backtest-extract.ts`, see above; gitignored, not
committed, since it is a derived intermediate from a raw download).

Benue's own miss list is large partly because Benue has far more NEMA-reported LGAs (14) than this pilot
sampled facilities for (its 21 sampled facilities land in fewer than 14 distinct LGAs). Delta, Bayelsa and
Jigawa still have 0 pilot facilities pinned (see docs/DATA_AUDIT.md), so they contribute nothing to this
sample in either direction; a larger pilot would very likely change these numbers, probably not for the
better given the miss rate already seen in the states it does cover.

## Honest caveats regardless of the result

- The NEMA file is a single submission with incomplete state coverage (see table above). A miss in this
  comparison could mean the model missed the event, or could mean the event was never in this file.
- LGA-level ground truth is coarser than a facility. A flagged facility and a flooded LGA can both be true
  without the facility itself having flooded.
- This is the only backtest available for this build. One data point is not validation. See
  docs/claude.md's claims policy: nothing here is called "validated" on the strength of this alone.
