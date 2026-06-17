---
phase: 08-docs-brand-assets
plan: "02"
subsystem: testing
tags: [documentation, doc-links, tdd, markdown]

# Dependency graph
requires:
  - phase: 08-docs-brand-assets
    plan: "01"
    provides: RED baseline — doc-link checker with 21 identified offenders
provides:
  - DOC-01 GREEN: checker returns 0 offenders, node:test 44/44 pass
  - All in-scope file-path refs in README.md, SPEC.md, TESTING.md converted to markdown links
  - Stale path global-setup.ts corrected to tests/e2e/global-setup.ts
affects: [08-04, future doc edits to README/SPEC/TESTING]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Code-formatted link text: [`filename.ext`](path/to/filename.ext) for all project-file refs in prose"
    - "Stale path: link text preserves original token; href points to corrected real path"
    - "WP-core refs (common.js, menu-header.php) and readme.txt stay as bare inline code"

key-files:
  created: []
  modified:
    - README.md
    - SPEC.md
    - TESTING.md

key-decisions:
  - "Link text for stale paths uses original token (global-setup.ts, icon.svg) while href points to real location — preserves prose readability without rewriting it"
  - "phpunit-*.xml.dist glob in README L73 left as glob (not linked) since no single file matches the asterisk; individual xmls in TESTING.md are linked specifically"

patterns-established:
  - "Inline-code file-path refs in prose docs use [`token`](relative/path) — enforced by the DOC-01 checker"

requirements-completed: [DOC-01]

# Metrics
duration: 10min
completed: 2026-06-17
---

# Phase 08 Plan 02: Doc-Link Linkification Summary

**21 bare file-path inline-code refs converted to markdown links across README.md, SPEC.md, and TESTING.md — DOC-01 checker GREEN (0 offenders), node:test 44/44 pass**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-06-17T00:00:00Z
- **Completed:** 2026-06-17T00:10:00Z
- **Tasks:** 1 (task 2 is checkpoint:human-verify)
- **Files modified:** 3

## Accomplishments

- Converted all 21 offenders identified by the plan 08-01 RED baseline checker
- Corrected the one stale path: `global-setup.ts` → `tests/e2e/global-setup.ts` (href only; link text preserves the token)
- Corrected the stale icon path: `icon.svg` → `.wordpress-org/icon.svg` (href only)
- Left WP-core refs (`common.js`, `menu-header.php`) and fenced code blocks untouched
- DOC-01 checker: 21 offenders → 0; all 44 JS tests pass including the GREEN gate test

## Task Commits

1. **Task 1: Convert flagged refs to markdown links** - `8548866` (feat)

## Files Created/Modified

- `README.md` — 10 refs linked: maestro-menu-editor.php, icon.svg (stale), composer.json, package.json, .wp-env.json, playwright.config.ts, bin/build.sh, TESTING.md, playground/blueprint.json, playground/blueprint-hosted.json
- `SPEC.md` — 7 refs linked: six includes/class-*.php table cells + TESTING.md prose ref
- `TESTING.md` — 4 refs linked: phpunit-unit.xml.dist, tests/bootstrap-unit.php, phpunit-integration.xml.dist, global-setup.ts (stale path corrected)

## Decisions Made

- Link text for stale-path refs uses the original display token (e.g. `global-setup.ts`) while the href points to the real location (`tests/e2e/global-setup.ts`). This preserves prose readability without rewriting surrounding sentences.
- The `phpunit-*.xml.dist` glob in README L73 was left as bare inline code since it is a glob pattern covering multiple files and cannot be a single link. The individual XML files are linked where they appear in TESTING.md.

## Deviations from Plan

None - plan executed exactly as written. The live offender list matched the plan's documented 21 offenders precisely.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DOC-01 is GREEN. The checker now serves as a permanent CI-style gate: any future prose edit that introduces a bare path ref will be caught immediately by `npm run check:doc-links`.
- Ready to proceed to 08-04 (the next planned task in this phase).

---
*Phase: 08-docs-brand-assets*
*Completed: 2026-06-17*
