# DECISIONS

Short dated entries, oldest first within each date.

## 2026-11-19 (M1)

- GRID3 v2.0 on HDX (data.humdata.org/dataset/a3b971e7-2f6e-4d1c-b4b2-87698545e5ca) ships only a GeoPackage and a PDF release-notes file, no CSV or JSON. Parsing a GeoPackage needs a sqlite/GDAL dependency this project does not otherwise need. Per build-plan.md M1, moved to source 2: HDX `nigeria-health-facilities` (data.humdata.org/dataset/nigeria-health-facilities), which is the same underlying GRID3-derived facility set and ships a ready GeoJSON with coordinates, state, LGA, type and category. Used that instead. License CC BY on both.
- data/facilities.json (cleaned, 46,140 rows, about 11 MB minified) is added to .gitignore, same as data/raw. It is a large derived file, not a "small committed output", and is fully reproducible by `npm run ingest:facilities` once data/raw/NigeriaHealthFacilities.json is present. What ships to the web app is the much smaller per-state, pilot-state subset under web/public/data/, which is committed. This extends the "no raw dataset over 5 MB" rule to this derived file in spirit, since 11 MB is not small either.

## 2026-11-19

- Repo built from scratch per docs/claude.md and docs/build-plan.md. Working through milestones M0 to M9 in one unattended session.
- COS-IT-FLOWS/cos-it-flows_app clone timed out at 60s (repo is about 490 MB per docs/claude.md). This is the documented size, not a surprise failure. Fallback: did not clone it, reasoning from docs/claude.md's own description of it instead (MIT, Django and React, last commit Feb 2025). No code read or reused from it. Logged per the 20-minute blocked rule.
- CLIMADA (CLIMADA-project/climada_python) not cloned either: GPL-3.0, explicitly not to be added as a dependency, and the plan only needs its hazard/exposure/vulnerability framing, which is general public knowledge, not file contents. Skipped the clone to save time, no code read or reused.
- icpac-igad/flood_watch_system cloned successfully (depth 1) into _refs/. No LICENSE file at top level, confirmed. Read architecture only (next step), no code copied.
- `npm audit` after initial install: 9 vulnerabilities (5 moderate, 1 high, 3 critical). All are in dev tooling (vite, tsx, tinypool, pulled in by vitest) or in fast-xml-parser, where the advisory lists every version up to 5.11.2 as affected, so there is no non-breaking fix in the 4.x line used here for CAP XML tests. Not fixing with `--force` (breaking changes, hackathon time budget) since these are build-time/test-time tools, not exposed in the shipped static site. Revisit if time allows after M9.
