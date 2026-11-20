# HighWater pitch

Written ahead of the demo. Numbers here must trace to a file in this repo or a URL in docs/build-plan.md
appendix A. If data/latest.json or a replay file is not yet generated when this is read, say so rather
than inventing a number.

Current real coverage (data/pins.json, data/coverage.json, 2026-11-20): 99 facilities with a real pinned
cell and 30-year climatology, across 8 of 9 candidate states (Kogi, Niger, Benue, Kwara, Delta, Anambra,
Bayelsa, Nasarawa; only Jigawa still has none), not the full 150 to 400 facility pilot the build plan
targets. Open-Meteo's undocumented, very tight hourly request limit slowed reaching this; see
docs/DATA_AUDIT.md. A real M8 backtest now exists too (docs/BACKTEST.md): 11 hits, 17 misses, 12 false
alarms over 58 LGAs for the 2022-10-01 week, which is an honest "finds some, misses more, false-alarms
about as often as it hits," not a validated detector. Say both numbers plainly in the demo if asked. Do
not say "150 to 400" or imply full coverage, and do not call the backtest result good or validated.

## 3-minute script

0:00 to 0:30, the problem.
Health facilities in Nigeria get flooded. Bayelsa: 65 percent of facilities in flood-prone areas, 79
percent of services disrupted during floods (Herald Open Access, May 2026). Jigawa 2022: 30 facilities
submerged, over 200 damaged (UNICEF, via WSCIJ). Kogi 2022: over 90 health facilities flooded (WHO). Borno:
a state cold store flooded, over 25 PHCs suspended services (Gavi). The 2026 national flood outlook names
14,118 high-risk communities across 266 LGAs (NIHSA, via ThisDay).

0:30 to 1:15, what we built.
HighWater links each pilot facility to the river cell nearest it in the Open-Meteo Flood API, which serves
GloFAS river discharge. We compare the cell's 7-day forecast against that same cell's own 30-year history:
NORMAL, WATCH above the 95th percentile, WARNING above the 99th, SEVERE above the cell's own 2022 maximum.
It drafts a plain-text alert and a CAP 1.2 XML file for each facility at watch level or above.

1:15 to 2:00, demo.
Open the 2022 replay first (`data/replay-<date>.json`, labelled as a historical replay using reanalysis,
not a past forecast). Show WATCH or higher appearing near the known 2022 flood states. Then switch to
today's live state and say it is calm: late November is outside the main flood season for most of these
corridors, so NORMAL is the expected and honest result, not a sign the tool does nothing.

2:00 to 2:40, limits, said out loud.
Model resolution is about 5 km, not a measurement at the clinic door. Small streams, including Enugu and
Nsukka in our own tests, return no usable signal. Facility data from GRID3 via HDX is not validated.
Thresholds are percentiles of a model's own history, not gauge levels. NIHSA already runs a national flood
forecast and dashboard; we are not replacing that.

2:40 to 3:00, what is different and what is next.
The difference is the facility link and the alert draft, not the forecast itself. Next: native-language
alert text (Hausa, Igbo, Yoruba stubs exist, marked NEEDS NATIVE REVIEW, not machine-translated and shipped
as final), a nearest-alternate-facility suggestion, and a real SMS subscription service.

## 8-slide outline

1. Title and one-line claim: a river-level warning for facilities near large rivers, not a flood map for a
   building.
2. The problem, with the four evidence items above.
3. Why this is hard: 5 km model cells, no gauge network reachable without a key, non-validated facility
   data.
4. Architecture: static pipeline plus static site, GitHub Actions cron, no server, nothing to crash during
   judging.
5. Alert levels, shown as the actual threshold table from docs/claude.md.
6. Demo screenshot: the map with shaped and coloured markers, and the alert panel.
7. The backtest result (docs/BACKTEST.md), stated plainly including its sample size and limits.
8. What is built versus reused (see ATTRIBUTIONS.md), and what is next.

## Demo path

1. Load the deployed URL.
2. Open the 2022 replay view (or the equivalent data file if the UI toggle is not wired up yet: say so).
3. Point at a WATCH or higher marker in a known 2022 flood state, open its detail panel, show the
   hydrograph against p95, p99 and the 2022 line.
4. Switch to live data, point out it is calm, and explain why that is expected for late November.
5. Open the Alerts tab, copy a message, show the CAP XML download.
6. Open "How reliable is this" and read the NO_SIGNAL and 5 km lines out loud.

## Eight hard questions

1. Why not just use NIHSA's dashboard?
   NIHSA already forecasts floods nationally and has a dashboard and a hybrid AI model (Guardian, 2026).
   HighWater does not compete on forecasting. It does one narrow thing NIHSA's public dashboard was not
   found to do: link a forecast directly to a named health facility and draft the alert text and CAP file
   for that facility. We did not find a tool that does this; that is "we did not find one," not "none
   exists."

2. Is the facility data reliable?
   No. GRID3's own HDX page describes the health facility set as non-exhaustive and non-validated. We show
   that limit in the UI on every screen and do not claim otherwise.

3. Is this a forecast of flooding at the clinic?
   No. It is a river discharge forecast for a roughly 5 km model cell near the facility, compared to that
   cell's own history. Terrain, levees and roads decide what water actually reaches a building, and none of
   that is modelled here. We say this explicitly in the app and in this document.

4. What happens in the dry season?
   Most cells should show NORMAL or NO_SIGNAL. That is the expected, correct output, not evidence the tool
   is broken. The live demo in late November is likely to look exactly like this.

5. Who acts on the alert?
   The intended user is an LGA or state health officer or PHC in-charge. The MVP drafts the alert and a CAP
   file; it does not yet deliver SMS for real (mock adapter only, writes to data/outbox.json, gated behind
   SEND_REAL_SMS and owner-provided keys). Real delivery and a subscription list are listed as stretch work.

6. What did you build versus reuse?
   Built: the cell-pinning window search, the climatology and threshold logic, the alert text and CAP
   generator, the web app. Read for ideas, not copied: icpac-igad/flood_watch_system's CAP handling
   approach, read only. Not cloned or used: cos-it-flows_app (size and time), CLIMADA (GPL-3.0, heavy). Full
   list with licenses in ATTRIBUTIONS.md.

7. What about Enugu itself, where this hackathon is happening?
   Enugu, including Nsukka, has no large river in this model's sense: our own tests return no usable
   discharge signal there (docs/claude.md's verified facts, and the Nsukka spot-check in
   docs/DATA_AUDIT.md pins to NO_SIGNAL with a 30-year median of 3.31 m3/s, far below the 100 m3/s floor).
   So the river-level warning has nothing to say about Enugu, and we say that plainly rather than forcing
   a number. That is exactly why the experimental heat/cold layer exists: Enugu sits squarely in Nigeria's
   harmattan-cold and heat-stress picture even without a major river, and that layer covers it (and every
   other facility nationwide) using a different method entirely.

8. Why heat and cold, not just flooding?
   Flooding is not Enugu's main documented climate-health risk; heat and the harmattan cold snap are.
   Building a flood-only tool would have nothing honest to show at the one place judges can check against
   their own experience. The heat/cold layer uses Open-Meteo's standard weather forecast and historical
   archive (temperature and apparent temperature, not GloFAS river discharge), compares each area's 7-day
   forecast against that same area's own historical 95th percentile (heat) or 5th percentile (cold), and
   is labelled experimental everywhere it appears: a separate badge, never blended into the river level's
   NORMAL/WATCH/WARNING/SEVERE colors or claims. It is a smaller, newer piece of this build than the river
   model and should be presented with that in mind, not as equally proven.
