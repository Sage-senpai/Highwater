# ATTRIBUTIONS

Every third-party dataset, API, library, or cloned repo used in this project, with its license.

## Data and APIs

- Open-Meteo Flood API (GloFAS v4 reanalysis and forecast). https://open-meteo.com/en/docs/flood-api
  No key required for non-commercial use. Commercial use terms not checked, not needed for this MVP.
- HDX "Nigeria: Flood data" (data.humdata.org/dataset/4cc05f0e-e794-4541-8e99-2073ace1f237), used for the M8 backtest. License: Creative Commons Attribution International (CC BY). Resource used: "NEMA Flood Data 06102022.xlsx" (NEMA, 2022), 840 rows across 32 states and the FCT, state/LGA/community/affected-people. Retrieved 2026-11-20. Attribution: NEMA (National Emergency Management Agency), via the Humanitarian Data Exchange.
- HDX "Nigeria: Health facilities" (data.humdata.org/dataset/nigeria-health-facilities), GRID3-derived facility points. License: Creative Commons Attribution International (CC BY). Dataset date on HDX: 2020-10-06. Retrieved 2026-11-19. Attribution: GRID3, via the Humanitarian Data Exchange.

## Reference repos (read-only, in _refs/, gitignored, not committed)

- COS-IT-FLOWS/cos-it-flows_app: MIT license.
- icpac-igad/flood_watch_system: orchestration repo, no top-level LICENSE file. Treated as read-only reference, no code copied.
- CLIMADA-project/climada_python: GPL-3.0. Not added as a dependency, read for framing only.

## Map tiles

- CARTO basemap tiles (light_all raster tiles, a.basemaps.cartocdn.com etc.) were tried first and recorded here as free and keyless. On 2026-11-20, the deployed site showed every tile as a fixed "API KEY REQUIRED" placeholder image (confirmed: two different tile coordinates returned byte-identical images), so CARTO's anonymous access to this endpoint is no longer usable. See DECISIONS.md.
- Replaced with Esri's World_Light_Gray_Base raster tiles (services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base), free, no key required for this kind of light, non-commercial use. Verified live: different tile coordinates return different image bytes (not a placeholder). Attribution shown in the map's attribution control at all times: "Esri, DeLorme, NAVTEQ, OpenStreetMap contributors". Used instead of tile.openstreetmap.org per docs/claude.md's instruction not to use that host for a public deployment without checking its usage policy.

## Libraries

- React 18.3.1, MIT license.
- MapLibre GL JS 4.7.1, BSD-3-Clause license.
- @fontsource/public-sans 5.1.0 (self-hosted Public Sans font), OFL-1.1 license.
- Vite 6, @vitejs/plugin-react, TypeScript: standard build tooling, see web/package.json for exact pinned versions.
- Pipeline: tsx, vitest, fast-xml-parser (MIT). See root package.json for exact pinned versions.
