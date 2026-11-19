# Data audit

## Facility data (M1)

### Source attempts, in the order the build plan specifies

1. GRID3 NGA Health Facilities v2.0 via HDX (data.humdata.org/dataset/a3b971e7-2f6e-4d1c-b4b2-87698545e5ca). Checked via the HDX CKAN API (`package_show`). Resources: a PDF release-notes file and `NGA_health_facilities_v2_0.gpkg` (GeoPackage). No CSV or JSON resource. Parsing a GeoPackage needs a sqlite/GDAL-capable library, which this project does not otherwise depend on. Not used. Logged in DECISIONS.md.
2. HDX `nigeria-health-facilities` (data.humdata.org/dataset/nigeria-health-facilities, internal id `3b4a119a-309c-4d3f-900f-18a1f6ca2dfa`). This is the dataset actually used. License: Creative Commons Attribution International (CC BY). Caveat text on the HDX page: "Dataset extracted from https://africaopendata.org/dataset/nigeria-health-care-facilities-primary-secondary-and-tertiary". Dataset date on HDX: 2020-10-06. This is the same GRID3-derived facility set as source 1, carried in a usable GeoJSON format.
3. NCDC WFS link: not tried, source 2 already gave usable coordinates.

Retrieved: 2026-11-19, from `https://data.humdata.org/dataset/3b4a119a-309c-4d3f-900f-18a1f6ca2dfa/resource/5a3bdd13-3ada-4bf4-ac38-643390bc0562/download/nigeriahealthfacilities.json`, saved to `data/raw/NigeriaHealthFacilities.json` (gitignored, not committed, 25,401,189 bytes).

### Raw file

- Format: GeoJSON FeatureCollection, `totalFeatures: 46146`.
- Columns (properties): `id, name, global_id, alternate_name, functional_status, type, ward_code, category, timestamp, accessibility, lga_name, lga_code, state_code, state_name`, plus a point `geometry`.
- A sibling CSV resource (`NigeriaHealthFacilities.csv`) has the same attribute columns but no coordinates at all, confirming the GeoJSON (or the `.zip` shapefile) is the only coordinate-bearing format HDX offers for this dataset.
- `type` column values seen: `Primary, Secondary, Tertiary, Unknown, Primary Health Clinic, Primary Health Center, Health Post Dispensary`. Inconsistent granularity, so the cleaned file uses the `category` column instead (see below).
- `category` column values seen (22 distinct, including null): `Primary Health Center, Dispensary, Medical Center, Federal Medical Center, Educational Clinic, General Hospital, Veterinary Clinic, Maternity Home, Federal Staff Clinic, Private Non Profit, Military and Paramilitary Clinic, Others, Comprehensive Health Center, Specialist Hospital, Teaching Hospital, Cottage Hospital, Pharmacy, Laboratory, Community Health Center, District Hospital, Research Hospital`, plus `null`.

### Cleaning (`pipeline/ingest-facilities.ts`, run 2026-11-19)

- Read 46,146 raw rows.
- Dropped 0 rows for missing or non-finite coordinates.
- Dropped 6 rows for coordinates outside the Nigeria bounding box (lon 2.7 to 14.6, lat 4.3 to 13.9).
- Kept 46,140 facilities.
- 13 rows share an exact duplicate (lat, lon) pair with another row (5 groups). Not deduplicated by name, since two distinct facilities can legitimately share a digitised point; left in the cleaned file with the duplicate count reported here for transparency.
- Missing LGA: 0. Missing type/category: 34 rows.
- `lga` and `state` come straight from the source's `lga_name` and `state_name` fields, already present on every kept row, so no point-in-polygon join against HDX admin boundaries was needed for this dataset.

### Output

`data/facilities.json`: `{id, name, state, lga, lat, lon, type?, source}`, 46,140 rows, about 11 MB minified. Gitignored (see DECISIONS.md), reproducible with `npm run ingest:facilities` once the raw file is present. Unit test `pipeline/lib/facilities.test.ts` checks the coordinate filter logic (bad coordinates, out-of-bbox, duplicate detection) against hand-built arrays.

### Coverage by state (facility count, all 36 states plus FCT)

| State | Facilities |
|---|---|
| Lagos | 2320 |
| Katsina | 2228 |
| Benue | 2192 |
| Niger | 2010 |
| Ogun | 1721 |
| Oyo | 1713 |
| Imo | 1661 |
| Anambra | 1648 |
| Osun | 1607 |
| Adamawa | 1575 |
| Kano | 1561 |
| Kogi | 1499 |
| Cross River | 1470 |
| Enugu | 1384 |
| Taraba | 1380 |
| Plateau | 1348 |
| Bauchi | 1331 |
| Abia | 1218 |
| Nasarawa | 1126 |
| Ebonyi | 1112 |
| Kaduna | 1103 |
| Kebbi | 1091 |
| Ondo | 1025 |
| Edo | 972 |
| Zamfara | 916 |
| Sokoto | 914 |
| Delta | 909 |
| Kwara | 891 |
| Borno | 880 |
| Akwa Ibom | 870 |
| Gombe | 776 |
| Jigawa | 729 |
| Rivers | 723 |
| Ekiti | 679 |
| Yobe | 597 |
| Fct | 576 |
| Bayelsa | 385 |

All 36 states and the FCT are present. No facility rows outside Nigeria's bounding box remain after cleaning.

## River-cell coverage (M2)

See the "River-cell pilot coverage" section below, added after M2 ran.
