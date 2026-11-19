# DECISIONS

Short dated entries, oldest first within each date.

## 2026-11-19

- Repo built from scratch per docs/claude.md and docs/build-plan.md. Working through milestones M0 to M9 in one unattended session.
- COS-IT-FLOWS/cos-it-flows_app clone timed out at 60s (repo is about 490 MB per docs/claude.md). This is the documented size, not a surprise failure. Fallback: did not clone it, reasoning from docs/claude.md's own description of it instead (MIT, Django and React, last commit Feb 2025). No code read or reused from it. Logged per the 20-minute blocked rule.
- CLIMADA (CLIMADA-project/climada_python) not cloned either: GPL-3.0, explicitly not to be added as a dependency, and the plan only needs its hazard/exposure/vulnerability framing, which is general public knowledge, not file contents. Skipped the clone to save time, no code read or reused.
- icpac-igad/flood_watch_system cloned successfully (depth 1) into _refs/. No LICENSE file at top level, confirmed. Read architecture only (next step), no code copied.
- `npm audit` after initial install: 9 vulnerabilities (5 moderate, 1 high, 3 critical). All are in dev tooling (vite, tsx, tinypool, pulled in by vitest) or in fast-xml-parser, where the advisory lists every version up to 5.11.2 as affected, so there is no non-breaking fix in the 4.x line used here for CAP XML tests. Not fixing with `--force` (breaking changes, hackathon time budget) since these are build-time/test-time tools, not exposed in the shipped static site. Revisit if time allows after M9.
