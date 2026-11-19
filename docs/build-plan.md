# HighWater build plan

Total budget about 11 hours. Each milestone has tasks and an acceptance check. Do them in order. Update PROGRESS.md and commit after each one.

## M0 Setup (20 min)

- `git init`, `.gitignore` (node_modules, data/raw, data/cache, _refs, .env*, dist), `.gitattributes`, `.env.example`.
- Create PROGRESS.md, DECISIONS.md, ATTRIBUTIONS.md, README.md (stub), docs/.
- Check `node --version` (needs 20 or newer) and `git --version`.
- Shallow clone the reference repos into `_refs/` (`git clone --depth 1 <url> _refs/<name>`), record each license in ATTRIBUTIONS.md.
- Put at the top of PROGRESS.md under NEEDS OWNER: check hackathon rules on open-source reuse; Vercel login when M9 starts.
- Acceptance: repo builds an empty `npm test` successfully; first commit exists.

## M1 Facility data audit (60 min)

Goal: one clean facilities file and an honest audit.

Try sources in this order and stop at the first that gives usable coordinates, but record all attempts:
1. GRID3 NGA Health Facilities, newest version on data.grid3.org (grid3.org/geospatial-data-nigeria lists v3.0 of August 2026; a dataset page mentions v4.0).
2. HDX `NigeriaHealthFacilities.csv` (data.humdata.org/dataset/nigeria-health-facilities).
3. National registry CSV through the eHealth Africa WFS link on the NCDC portal (dataportal.ncdc.gov.ng, dataset national-health-facility-registry).

Tasks:
- Download to `data/raw/`. Save the URL, retrieval date and license text in the audit.
- Write `docs/DATA_AUDIT.md`: source, version, row count, columns, null counts, duplicate coordinates, coordinates outside Nigeria (bounding box about lon 2.7 to 14.6, lat 4.3 to 13.9), states covered, whether a facility type or level column exists, and what it contains.
- If state or LGA is missing, join by point-in-polygon with the HDX administrative boundaries (`cod-ab-nga`).
- Write `data/facilities.json`: `{id, name, state, lga, lat, lon, type?, source}`. Drop rows with bad coordinates and count them.
- Acceptance: DATA_AUDIT.md has real numbers; facilities.json validates; a unit test checks coordinate filtering.
- Fallback: if no source can be downloaded, write that down, ask the owner to download the file manually and place it in `data/raw/`, and meanwhile continue with a 30-row hand-made sample clearly labelled SAMPLE so M2 onward is not blocked.

## M2 River-cell finder (90 min)

Goal: for each pilot facility, pin the river cell that represents it.

- First test whether the flood API accepts comma-separated coordinates (`latitude=a,b&longitude=c,d`). If yes, batch up to the documented limit. If no, one request per point.
- Read the Open-Meteo terms and rate limits. Throttle, retry with backoff, and cache every response by snapped cell in `data/cache/`. The number of API calls must scale with unique cells, not facilities.
- Search window per facility: latitude offsets -0.1, 0, +0.1 and longitude offsets -0.1 to +0.1 in 0.05 steps. Dedupe by the snapped latitude and longitude the API returns.
- Pick the pinned cell as the highest 30-year median discharge in the window. To avoid pulling history for every candidate, take the top 2 by 7-day mean forecast, pull history for those, then choose.
- Store `data/pins.json`: `facilityId -> {cell, distance_km, method}`.
- Choose the pilot: facilities in river-corridor states with the best coverage, 150 to 400 facilities. Candidate corridors: Niger and Benue (Kogi, Niger, Kwara, Benue, Nasarawa), the lower Niger (Delta, Anambra, Bayelsa), and the Hadejia-Jama'are (Jigawa). Let the coverage numbers decide.
- Add a coverage table to DATA_AUDIT.md per state: share of facilities with a cell at or above the floor within the window, median distance to that cell.
- Acceptance: pins.json exists; the Onitsha test point (6.15, 6.78) pins to a cell near 6.175, 6.725 with discharge in the thousands; a Nsukka facility pins to NO_SIGNAL.

## M3 Climatology per cell (60 min)

- For each unique pinned cell, request daily discharge from 1984-01-01 to yesterday. Drop nulls. Record first year with data.
- Compute p50, p95, p99, record and its date, annual maxima, 2022 maximum.
- Flag: fewer than 20 years of data; any run of 3 or more identical consecutive values at the top 1 percent (the Lokoja plateau). Count and report how many cells are flagged. This is a finding, not a bug to hide.
- Write `data/cells.json`.
- Tests: the percentile function against a hand-computed array; the plateau detector against a synthetic array.
- Acceptance: cells.json exists; a flagged-cells summary is in DATA_AUDIT.md.

## M4 Forecast, levels, replay (45 min)

- `npm run refresh`: pull a 7-day forecast for each pinned cell, compute levels using the rules in CLAUDE.md, write `data/latest.json` with `generated_at` (UTC), `model: "GloFAS v4 via Open-Meteo"`, per-cell forecast and level, per-facility level, and `ratio_to_p95`.
- `npm run replay -- --date YYYY-MM-DD`: treat the 7 days after that date in the reanalysis as the forecast and write `data/replay-<date>.json`. Label it in the file and in the UI: "historical replay using reanalysis, not a past forecast".
- Tests for the level function: each level, exact boundary equality, NO_SIGNAL, LOW_CONFIDENCE.
- Acceptance: today's `latest.json` exists (expect mostly NORMAL for late November); a replay for the 2022 peak window produces some WATCH or higher. If it produces none anywhere, report that in PROGRESS.md before continuing.

## M5 Web app skeleton (120 min) uses the design section of CLAUDE.md

- Load the design skill first if one is available.
- Vite React app in `web/`. Map with MapLibre GL. Pick a keyless tile source whose terms allow public use and log it in ATTRIBUTIONS.md. Do not use `tile.openstreetmap.org` for the public deployment unless you have checked its usage policy.
- Facility markers use the shape and colour table. Cluster at low zoom without hiding WATCH or worse.
- Filter by state and level. A summary strip shows counts per level and the data date.
- Load facility data per state, lazy.
- Acceptance: runs with `npm run dev`; works at 360 px width; Lighthouse accessibility check recorded in PROGRESS.md; first-load JS size recorded.

## M6 Facility detail and the "how reliable is this" page (60 min)

- Bottom sheet or side panel: facility name, LGA, state, level, pinned cell and distance, 7-day discharge forecast against p95, p99 and the 2022 line, the one-line data-quality statement.
- Hydrograph chart with the three threshold lines and shape-plus-label legend.
- "How reliable is this" page, plain language: what the number is, the 5 km limit, what NO_SIGNAL means, the unvalidated facility data, the backtest result once M8 exists.
- Acceptance: three facilities with different levels open correctly; screenshot saved to `docs/img/`.

## M7 Alerts and CAP (75 min)

- Alert text generator. English only. Each message at most 160 characters, plain ASCII (an em dash or curly quote forces a shorter encoding and splits the SMS). Example shape: `HighWater: River near Kogi PHC X forecast above flood watch level within 7 days (peak 12 Nov). Check access routes and stock.` Provide stubs for Hausa, Igbo and Yoruba marked NEEDS NATIVE REVIEW. Do not machine-translate and present it as final.
- CAP 1.2 XML per alert at `web/public/alerts/<id>.xml`. Validate well-formedness, and against the OASIS CAP 1.2 schema if you can download it.
- UI: an Alerts tab listing the day's WATCH and above, with a copy button and a CAP download.
- SMS adapters: `mock` (default, writes `data/outbox.json`, shown in the UI as a preview) and an optional sandbox adapter that reads keys from `.env.local`. No real sending without `SEND_REAL_SMS=true`.
- Acceptance: test that every generated message is at most 160 characters and ASCII; a CAP file opens in an XML parser.

## M8 Backtest and honesty (60 min)

Goal: find out whether the warnings mean anything.

- Source of events: the HDX OCHA, NEMA and SEMA "Nigeria: Flood data" dataset (flood-affected people and locations, 2022). Check what it actually contains first, and write down its LGA and date coverage.
- Method: for the 2022 flood window, compare LGAs that reported flooding with LGAs that contain facilities at WATCH or higher in the replay. Report hits, misses, false alarms. State the sample size.
- Do not tune thresholds to improve the numbers. If you must, log old and new values.
- If the data cannot be matched within 45 minutes, document why in `docs/BACKTEST.md` and say in the app that no backtest exists yet.
- Acceptance: `docs/BACKTEST.md` exists with the method, numbers or the reason for none; the reliability page links to it.

## M9 Deploy, docs, pitch (60 min)

- GitHub Actions: daily cron runs `npm run refresh` and commits updated `data/latest.json`. Check the free-minutes terms for the repo type.
- Vercel static deploy. Ask the owner for `vercel login` if it is not set up. Do not guess credentials.
- README: what it is, what it is not, setup, data sources, limits, license choice (ask the owner).
- `docs/PITCH.md`: a 3-minute script; 8-slide outline; a demo path (open the 2022 replay first, then switch to today's live state and say it is calm); 6 hard questions judges may ask with honest answers, including: why not just use NIHSA's dashboard, is the facility data reliable, is this a forecast of flooding at the clinic, what happens in the dry season, who acts on the alert, what did you build versus reuse.
- Acceptance: the deployed URL loads on a phone; the README has no claim the claims policy forbids.

## M10 Stretch, only after M9 is done and committed

1. If facility data has a type or level column: for facilities at WARNING or higher, suggest the nearest higher-level facility that is not at WARNING. Straight-line distance only. Label it "straight-line distance, not a road route".
2. NIHSA 2026 Annual Flood Outlook overlay: only if the high-risk LGA list can be obtained as a document you can read in full. Do not rebuild it from news snippets.
3. ENSO context banner with static text, source and date (appendix A).
4. A rainfall-based layer from the Open-Meteo forecast API for local flash floods near small streams, labelled experimental.
5. A small server for SMS subscriptions.

## Appendix A: sources and status

Verified means I read the page or ran the call. Anything marked unverified needs a check before it goes in a slide.

El Niño and climate context
- NOAA CPC forum, September 2026: strong to very strong El Niño likely through January to March 2027, more than 83 percent. https://cpc.ncep.noaa.gov/products/CDB/Forecast/forecast.shtml
- WMO ENSO update, August 2026: near 100 percent chance El Niño persists through December 2026 to February 2027, no sign of La Niña. https://wmo.int/sites/default/files/2026-08/Factsheet-ENSO-Update-August-2026-en.pdf
- One model dissent (GFDL SPEAR, July 2026) shows weakening through winter. https://www.gfdl.noaa.gov/prediction/july-2026-el-nino-predictions/
- WMO Global Annual to Decadal Update 2026 to 2035, 28 May 2026: annual global temperature 1.3 to 1.9 C above 1850 to 1900 for 2026 to 2030; 86 percent chance one year beats 2024; wet anomalies in the Sahel more likely in May to September; skill varies by region. https://wmo.int/news/media-centre/new-report-suggests-more-global-temperature-records-ahead
- East Africa, October to December 2026: wetter and warmer than normal. https://www.icpac.net/news/the-greater-horn-of-africa-is-expected-to-experience-a-wetter-than-normal-october-december-ond-2026-season-as-el-niño-strengthens/
- West Africa and the Sahel: AGRHYMET July 2026 update shows expanding areas at risk of rainfall deficit, and its own note says the El Niño link to Sahel rain is not constant. https://agrhymet.cilss.int/wp-content/uploads/2026/08/Note_technique_AGRHYMET_MAJ-prevision2026_English.pdf
- UNDP calls West and Central Africa a region of genuine forecast disagreement. https://www.undp.org/africa/waca/press-releases/undp-calls-urgent-anticipatory-investment-el-nino-worsens-already-conflict-driven-crisis-west-and-central-africa
- Note the tension: a dry-leaning 2026 Sahel season against wetter-than-normal Sahel anomalies in the five-year outlook. Say both.
- No five-year East Africa rainfall figures were found. Do not invent any.

Nigeria flood and health evidence
- NIHSA 2026 Annual Flood Outlook: 14,118 communities in 266 LGAs in 33 states and the FCT at high risk; 15,597 at moderate risk. https://www.thisdaylive.com/2026/04/16/fg-unveils-2026-outlook-14000-communities-across-266-lgas-in-33-states-face-high-flood-risk/
- NIHSA has a hybrid AI model and a real-time flood dashboard, and introduced community-based forecasting in 2026. This is existing competition. https://guardian.ng/?p=2821634
- Bayelsa PHC study, May 2026: 65 percent of facilities in flood-prone areas, 79 percent of services disrupted during floods, 66 percent of respondents with no preparedness measures. https://www.heraldopenaccess.us/openaccess/assessment-of-climate-resilient-primary-health-care-infrastructure-vulnerability-adaptation-and-cost-effectiveness-in-bayelsa-state-nigeria
- Jigawa 2022: 30 health facilities submerged and over 200 badly damaged (UNICEF figure, via a news report). https://collaborativemedia.wscij.org/?p=3381
- Kogi 2022: over 90 health facilities flooded (WHO). https://www.afro.who.int/fr/node/16889
- Borno: state cold store flooded, over 25 PHCs suspended services. https://www.gavi.org/vaccineswork/once-shuttered-camps-borno-reopen-house-flood-victims
- Argument for service-access impacts, not just flood maps: a 2026 EGU preprint. https://egusphere.copernicus.org/preprints/2026/egusphere-2026-5363/egusphere-2026-5363.pdf
- These show harm to facilities. They do not show that a forecast-to-facility tool is missing. One search found none; say "we did not find one", not "none exists".

Data and tools
- Open-Meteo Flood API docs (GloFAS v4, about 5 km, daily, ensemble statistics, key only for commercial use; licence terms not read). https://open-meteo.com/en/docs/flood-api
- GRID3 Nigeria data page. https://grid3.org/geospatial-data-nigeria
- GRID3 Health Facilities v2.0 on HDX, described as non-exhaustive and non-validated. https://data.humdata.org/dataset/a3b971e7-2f6e-4d1c-b4b2-87698545e5ca
- HDX Nigeria health facilities (fields not verified). https://data.humdata.org/dataset/nigeria-health-facilities
- NCDC facility registry link (WFS CSV, not tested because the sandbox blocked it). https://dataportal.ncdc.gov.ng/dataset/national-health-facility-registry/resource/668feb17-9e2b-4a1e-b553-b8fe8ba68207
- HDX OCHA, NEMA, SEMA Nigeria flood data 2022 (contents not verified). https://data.humdata.org/dataset/4cc05f0e-e794-4541-8e99-2073ace1f237
- UNICEF and NEMA risk analysis, 12 hazards at LGA level (downloadability not verified). https://www.unicef.org/nigeria/nigeria-risk-analysis and https://nema-risk-analysis-unicef.hub.arcgis.com/
- ICPAC FloodWatch (design reference, includes CAP alerts). https://icpac-igad.github.io/flood_watch_system/
- CoS-IT-FloWS docs. https://cos-it-flows-documentation.readthedocs.io/en/latest/
- CLIMADA (GPL-3.0). https://github.com/CLIMADA-project/climada_python
- ECMWF Code for Earth Africa stream. https://codeforearth.ecmwf.int/stream/africa-stream

## Appendix B: known weaknesses to state openly in the pitch

1. River discharge in a 5 km cell is not water at a clinic door. Terrain and roads decide that.
2. Small streams and hill towns, including Enugu and Nsukka in our tests, return no usable signal.
3. Facility locations are non-validated.
4. Thresholds are percentiles of a model's own history, not gauge levels.
5. An existing national system (NIHSA) already forecasts floods. Our difference is the facility link and the alert, not the forecast.
6. Nothing here has been validated against real facility flooding until M8 says so.