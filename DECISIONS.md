# DECISIONS

Short dated entries, oldest first within each date.

## 2026-11-20 (M2 blocker and fallback)

- Hit Open-Meteo's undocumented hourly request limit while fetching 30-year history for the 319 unique top-2 candidate cells (10-coordinate batches). Response: `{"error":true,"reason":"Hourly API request limit exceeded. Please try again in the next hour."}`. Confirmed with a single-point test request immediately after stopping the pipeline script, so this is a real account/IP-level hourly cap, not a bug in the retry logic. No specific fallback for this is written in docs/build-plan.md, so per the general 20-minute rule: stopped the blocked step, logged it here, and moved on to other milestones that do not need fresh API calls (web app scaffold, alert text, CAP XML, backtest write-up) while the hourly window resets. Will resume `npm run pin:cells` and `npm run climatology` once the limit clears, with a smaller SAMPLE_PER_STATE and a longer throttle to stay well under whatever the real cap is, since it is unverified and undocumented.
- Already-cached responses (forecast for all ~1978 unique window points, plus 1 of 32 history batches) are kept in data/cache/ and will be reused on the next run, so no completed work is lost.
- Changed pin-cells.ts to keep only the top 1 candidate cell by 7-day forecast mean per facility, not the top 2 the plan describes, to roughly halve the number of unique cells needing a full 30-year history pull before resuming after the hourly cap. Old value: top 2 (then choose by higher 30-year median). New value: top 1 (median is still computed and stored, but there is no second candidate to compare against). Reason: fit the remaining hackathon time budget after the rate-limit blocker above. This does not change any alert threshold, only how many forecast-ranked candidates are considered before pinning.
- Increased the history-fetch throttle from 1500 ms to 4000 ms (HISTORY_THROTTLE_MS in pipeline/lib/openmeteo.ts) to stay further under whatever the real hourly cap is.

## 2026-11-20 (web npm audit)

- `npm audit` inside web/ (not run earlier, only the root pipeline's was): 3 vulnerabilities. esbuild (moderate, dev-server only, same class as the root audit). maplibre-gl (critical, XSS sanitizer bypass in DOM.sanitize via a live NamedNodeMap), fix only available in maplibre-gl 6.x (breaking from the pinned 4.7.1). Not upgrading under the hackathon time budget: this app never calls MapLibre's HTML-sanitizing APIs with untrusted input (no popups with user-controlled HTML, facility names are rendered through React text nodes, not through MapLibre's own DOM injection), so the specific bypass does not have a reachable path here. Logged rather than silently left out of the audit record.

## 2026-11-20 (cache keying bug, plateau detection bug)

- Found and fixed a real caching bug: fetchDailyBatch cached by the whole batch query string (all points joined), so the same point requested in a differently-ordered or differently-sized batch (which happened between pin-cells.ts and climatology.ts) was a cache miss and would have re-spent the same tight hourly quota on data already paid for. Changed to cache per individual point instead. Wrote pipeline/migrate-cache.ts, a one-off that rebuilt per-point cache entries from the existing batch-keyed cache files (3268 point entries recovered from 41 files) with no new API calls.
- Found and fixed a real logic bug in the Lokoja plateau detector (pipeline/lib/stats.ts detectPlateaus): it flagged a cell as low-confidence if the series had ANY run of 3+ identical values ANYWHERE, independently checked against whether the series separately had any value at or above p99. Those two conditions are almost always both true for 30 years of daily data (long dry-season runs of identical low values are normal and harmless), so every one of the first 50 real cells got flagged, which is not plausible and was caught by inspecting the actual output rather than trusting the summary count. Added detectTopPlateau, which only flags a run of 3+ identical values when the repeated value itself is at or above the threshold, with 3 new unit tests distinguishing a dry-season zero plateau from a genuine high-value plateau. Rerunning climatology.ts after the fix: 11 of 50 real cells flagged, not 50.

## 2026-11-20 (rate limit, second hit, resilience changes)

- The hourly limit cleared, then was hit again almost immediately. Root cause: the repeated single-point curl checks used to test whether the limit had cleared, plus the Monitor tool's own 45-second poll loop, were themselves counted against the same hourly quota, so checking for the limit to clear was consuming it. Fixed by widening the Monitor poll interval to 5 minutes and stopping manual interim curl checks.
- Changed pipeline/lib/openmeteo.ts: fetchWithRetry no longer retries on 429 (each retry is itself a request that burns more of the same tight quota); it now fails fast. fetchHistory no longer throws on the first failed chunk; it marks the quota as exhausted for the rest of that run, fills remaining points with null, and returns what succeeded so far, so a run that gets rate-limited partway through still saves partial progress instead of losing everything.

- Removed the `.gitignore` rule that excluded `web/public/data/*.json`. Vercel's static build (`vercel.json`'s buildCommand) only runs `npm run build` inside web/, it does not call the pipeline, so if the generated per-state facility files, latest.json, and alerts-today.json were gitignored, a fresh checkout would deploy with no data at all. The GitHub Actions daily cron is what keeps these files fresh and commits them; Vercel then just serves whatever is checked in. These files are small (per-state facility subsets of the pilot, not the full 46,140-row national file), unlike data/facilities.json, which stays gitignored.

## 2026-11-20 (CAP schema)

- Downloaded the real OASIS CAP 1.2 XSD from docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2.xsd (saved to pipeline/cap-v1.2.xsd) after the first guessed URL 404'd and the directory listing gave the real filename. This environment has no xmllint or other XSD validator installed, and installing one is out of scope for the time budget, so full schema validation against this XSD was not run. Used fast-xml-parser's XMLValidator.validate for strict well-formedness instead, which is the fallback build-plan.md allows ("validate well-formedness, and against the OASIS CAP 1.2 schema if you can download it").

## 2026-11-20 (lint)

- Root package.json's `lint` script uses `tsc --noEmit` instead of eslint. ESLint was never installed (not in docs/claude.md's stack list), and adding and configuring it is extra scope under the hackathon time budget. TypeScript's own strict type checking catches a meaningful share of the same issues for this size of codebase. Logged as a scope decision, not a silent substitution.

## 2026-11-20 (M5 design)

- No skill literally named `frontend-design` is available. Several generic UI skills exist (`impeccable`, `design-taste-frontend`, `high-end-visual-design`, `redesign-existing-projects`), but they bias toward a premium agency look (motion, depth, polish) that works against docs/claude.md's explicit, detailed Design section (paper and ink, no gradients, no glassmorphism, exact hex colors and shapes per alert level, WCAG AA). Followed docs/claude.md's Design section directly as the authoritative spec rather than loading a generic visual-design skill, since the two would conflict and the project's own spec is more specific and was written for this exact tool.

## 2026-11-19 (M1)

- GRID3 v2.0 on HDX (data.humdata.org/dataset/a3b971e7-2f6e-4d1c-b4b2-87698545e5ca) ships only a GeoPackage and a PDF release-notes file, no CSV or JSON. Parsing a GeoPackage needs a sqlite/GDAL dependency this project does not otherwise need. Per build-plan.md M1, moved to source 2: HDX `nigeria-health-facilities` (data.humdata.org/dataset/nigeria-health-facilities), which is the same underlying GRID3-derived facility set and ships a ready GeoJSON with coordinates, state, LGA, type and category. Used that instead. License CC BY on both.
- data/facilities.json (cleaned, 46,140 rows, about 11 MB minified) is added to .gitignore, same as data/raw. It is a large derived file, not a "small committed output", and is fully reproducible by `npm run ingest:facilities` once data/raw/NigeriaHealthFacilities.json is present. What ships to the web app is the much smaller per-state, pilot-state subset under web/public/data/, which is committed. This extends the "no raw dataset over 5 MB" rule to this derived file in spirit, since 11 MB is not small either.

## 2026-11-19

- Repo built from scratch per docs/claude.md and docs/build-plan.md. Working through milestones M0 to M9 in one unattended session.
- COS-IT-FLOWS/cos-it-flows_app clone timed out at 60s (repo is about 490 MB per docs/claude.md). This is the documented size, not a surprise failure. Fallback: did not clone it, reasoning from docs/claude.md's own description of it instead (MIT, Django and React, last commit Feb 2025). No code read or reused from it. Logged per the 20-minute blocked rule.
- CLIMADA (CLIMADA-project/climada_python) not cloned either: GPL-3.0, explicitly not to be added as a dependency, and the plan only needs its hazard/exposure/vulnerability framing, which is general public knowledge, not file contents. Skipped the clone to save time, no code read or reused.
- icpac-igad/flood_watch_system cloned successfully (depth 1) into _refs/. No LICENSE file at top level, confirmed. Read architecture only (next step), no code copied.
- `npm audit` after initial install: 9 vulnerabilities (5 moderate, 1 high, 3 critical). All are in dev tooling (vite, tsx, tinypool, pulled in by vitest) or in fast-xml-parser, where the advisory lists every version up to 5.11.2 as affected, so there is no non-breaking fix in the 4.x line used here for CAP XML tests. Not fixing with `--force` (breaking changes, hackathon time budget) since these are build-time/test-time tools, not exposed in the shipped static site. Revisit if time allows after M9.
