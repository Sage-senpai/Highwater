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
