# PROGRESS

Newest entry first.

## NEEDS OWNER

- Hackathon rules on open-source reuse: the flyer states none, but the owner should confirm this directly before the pitch. Not blocking build work.
- `vercel login`: needed at M9 for the live deploy. Not blocking M0 to M8.
- Any SMS provider sandbox keys: optional, stretch only. Mock adapter is the default and needs no keys.

## 2026-11-19

- Started M0. Node v22.18.0, git 2.51.0.windows.1, both satisfy the ">=20" requirement.
- M0 done. git init complete. .gitignore, .gitattributes, .env.example, PROGRESS.md, DECISIONS.md, ATTRIBUTIONS.md, README.md stub in place. Root package.json created with tsx, vitest, @turf/turf, csv-parse, fast-xml-parser. `npm install` succeeded (203 packages). `npx vitest run` passes (pipeline/setup.test.ts, 1 test, 1 passed). npm audit run and recorded in DECISIONS.md: 9 vulnerabilities, all in dev tooling or fast-xml-parser's unfixed range, not forcing breaking upgrades under hackathon time budget. icpac-igad/flood_watch_system cloned to _refs/ (gitignored). cos-it-flows_app and CLIMADA skipped per DECISIONS.md fallback. First commit pending.
- Evidence: `npx vitest run` output showed "1 passed (1)".

## 2026-11-19 (M1)

- M1 done. Used HDX `nigeria-health-facilities` GeoJSON (GRID3-derived, CC BY) after GRID3 v2.0's HDX page turned out to only offer a GeoPackage, no CSV/JSON (see DECISIONS.md). Wrote `pipeline/ingest-facilities.ts` and `pipeline/lib/facilities.ts`. Ran `npx tsx pipeline/ingest-facilities.ts`: read 46,146 raw rows, dropped 6 outside Nigeria's bounding box, kept 46,140, flagged 13 rows with duplicate coordinates. Wrote `docs/DATA_AUDIT.md` with full column list, value lists for type/category, missing-field counts, and a per-state coverage table (all 36 states plus FCT present).
- Tests: `npx vitest run` now passes 2 files, 7 tests (the new `pipeline/lib/facilities.test.ts` covers bad-coordinate filtering, bbox filtering, and duplicate-coordinate counting against hand-built arrays).
- data/facilities.json (about 11 MB) added to .gitignore, not committed, since it is a large derived file, not a small output; it is reproducible from the ingest script. Logged in DECISIONS.md.
- Evidence: ingest script console output (46146 read, 6 dropped-out-of-bbox, 46140 kept, 13 duplicate-coordinate rows) plus `npx vitest run` showing 7 passed.
