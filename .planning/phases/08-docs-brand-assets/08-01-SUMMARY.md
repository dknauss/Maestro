---
phase: 08-docs-brand-assets
plan: "01"
subsystem: testing
tags: [node-test, doc-lint, link-checker, esm, tdd]

requires: []

provides:
  - "bin/check-doc-links.mjs: DOC-01 link checker with findOffenders() and scanText() exports"
  - "tests/js/doc-links.test.mjs: 8 scanText fixture tests (pass) + strict findOffenders()===[] GREEN gate (currently RED)"
  - "npm scripts: check:doc-links (CLI checker) and test:js (runs tests/js/*.mjs)"
  - "RED baseline: 21 bare path refs in README.md, SPEC.md, TESTING.md enumerated for plan 08-02"
affects:
  - "08-docs-brand-assets/08-02 (must drive findOffenders() to [] to turn GREEN gate)"

tech-stack:
  added: []
  patterns:
    - "Dependency-free ESM checker using node:fs + node:path; fence-stripping preserves line numbers for accurate location reporting"
    - "TDD RED/GREEN seam: fixture tests prove parser correctness now; strict contract test is the GREEN gate for 08-02"

key-files:
  created:
    - bin/check-doc-links.mjs
    - tests/js/doc-links.test.mjs
  modified:
    - package.json

key-decisions:
  - "readme.txt added to CORE_EXCLUDE: it appears as a token in README.md prose but per DOC-01 scope readme.txt is excluded entirely (not a linkable repo doc)"
  - "test:js updated from bare 'node --test' to 'node --test tests/js/*.mjs' — Node 24.14 does not support the directory form of node --test; glob pattern is the correct alternative"
  - "STALE_REMAP resolution tries repo-root-relative path in addition to doc-dir-relative, so tokens like 'global-setup.ts' that resolve to 'tests/e2e/global-setup.ts' are correctly flagged as stale-path offenders"

patterns-established:
  - "scanText(text, docPath, repoRoot): pure helper usable in unit tests without touching disk"
  - "findOffenders(repoRoot?): aggregates scanText results across IN_SCOPE docs; default arg uses import.meta.url-derived root"
  - "CLI guarded by 'process.argv[1] === fileURLToPath(import.meta.url)' for side-effect-free import in tests"

requirements-completed: [DOC-01]

duration: 15min
completed: "2026-06-17"
---

# Phase 08 Plan 01: DOC-01 Link Checker (RED Baseline) Summary

**Dependency-free ESM doc-link checker built test-first: scanText() pure parser with fence/link/image exclusion, findOffenders() CLI, and a strict node:test GREEN gate currently RED on 21 bare path refs across README.md, SPEC.md, and TESTING.md**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-17
- **Completed:** 2026-06-17
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Implemented `bin/check-doc-links.mjs` with exports `scanText()`, `findOffenders()`, `IN_SCOPE`, `CORE_EXCLUDE`, `STALE_REMAP` and a `--json` CLI flag
- Created `tests/js/doc-links.test.mjs` with 8 fixture tests proving parser correctness (all pass) plus the strict `findOffenders()===[]` GREEN gate (fails on 21 real offenders — correct RED state)
- Wired `npm run check:doc-links` and updated `npm run test:js` to scan `tests/js/*.mjs`

## RED Offender Baseline (for plan 08-02 to close)

```
README.md:71   `maestro-menu-editor.php` -> maestro-menu-editor.php  (bare-path)
README.md:72   `icon.svg` -> .wordpress-org/icon.svg  (stale-path)
README.md:73   `composer.json` -> composer.json  (bare-path)
README.md:73   `package.json` -> package.json  (bare-path)
README.md:73   `.wp-env.json` -> .wp-env.json  (bare-path)
README.md:73   `playwright.config.ts` -> playwright.config.ts  (bare-path)
README.md:73   `bin/build.sh` -> bin/build.sh  (bare-path)
README.md:95   `TESTING.md` -> TESTING.md  (bare-path)
README.md:99   `playground/blueprint.json` -> playground/blueprint.json  (bare-path)
README.md:116  `playground/blueprint-hosted.json` -> playground/blueprint-hosted.json  (bare-path)
SPEC.md:37     `includes/class-config.php` -> includes/class-config.php  (bare-path)
SPEC.md:38     `includes/class-ordering.php` -> includes/class-ordering.php  (bare-path)
SPEC.md:39     `includes/class-replay.php` -> includes/class-replay.php  (bare-path)
SPEC.md:40     `includes/class-rest.php` -> includes/class-rest.php  (bare-path)
SPEC.md:41     `includes/class-admin-bar.php` -> includes/class-admin-bar.php  (bare-path)
SPEC.md:42     `includes/class-assets.php` -> includes/class-assets.php  (bare-path)
SPEC.md:172    `TESTING.md` -> TESTING.md  (bare-path)
TESTING.md:31  `phpunit-unit.xml.dist` -> phpunit-unit.xml.dist  (bare-path)
TESTING.md:31  `tests/bootstrap-unit.php` -> tests/bootstrap-unit.php  (bare-path)
TESTING.md:48  `phpunit-integration.xml.dist` -> phpunit-integration.xml.dist  (bare-path)
TESTING.md:70  `global-setup.ts` -> tests/e2e/global-setup.ts  (stale-path)

21 offender(s) found.
```

## Task Commits

1. **Task 1: Write the doc-link checker test-first (RED)** - `85013ac` (test)
2. **Task 2: Wire npm scripts and record RED offender baseline** - `619dc16` (chore)

## Files Created/Modified

- `bin/check-doc-links.mjs` — DOC-01 checker: exports findOffenders(), scanText(), IN_SCOPE, CORE_EXCLUDE, STALE_REMAP; CLI exits 1 on offenders; --json flag
- `tests/js/doc-links.test.mjs` — 8 fixture tests (pass) + strict findOffenders()===[] GREEN gate (RED until 08-02)
- `package.json` — added check:doc-links script; updated test:js to tests/js/*.mjs

## Decisions Made

1. Added `readme.txt` to `CORE_EXCLUDE`: it appears as a bare inline-code token in README.md prose but is excluded entirely per DOC-01 scope (it is the wp.org convention file, not a markdown-linkable repo doc).
2. Updated `test:js` from `node --test` to `node --test tests/js/*.mjs`: Node 24.14 rejects the directory form (`node --test tests/js/`), returning `MODULE_NOT_FOUND`. The glob pattern is the correct alternative and matches how the existing tests are discovered in CI.
3. STALE_REMAP resolution resolves against repo root (not just doc dir): tokens like `global-setup.ts` have no literal match relative to TESTING.md's directory, but `STALE_REMAP['global-setup.ts'] = 'tests/e2e/global-setup.ts'` resolves correctly when tried relative to the repo root.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added readme.txt to CORE_EXCLUDE**
- **Found during:** Task 1 (running checker against real docs)
- **Issue:** The plan specified "exclude readme.txt entirely" but the initial CORE_EXCLUDE set only included WP-core refs. readme.txt appeared as a bare ref in README.md and was being flagged, which contradicts the DOC-01 scope exclusion.
- **Fix:** Added `'readme.txt'` to the CORE_EXCLUDE set in bin/check-doc-links.mjs
- **Files modified:** bin/check-doc-links.mjs
- **Verification:** Re-running the checker confirmed readme.txt no longer appears in offender list
- **Committed in:** 85013ac (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing exclusion for readme.txt)
**Impact on plan:** Necessary for correctness per DOC-01 scope. No scope creep.

## Issues Encountered

- `node --test tests/js/` (directory form) fails in Node 24.14 with `MODULE_NOT_FOUND`. Used glob `tests/js/*.mjs` instead — this is how the existing Phase 6/7 tests already run.
- The plan's Task 2 verification command `node -e "...if(!Array.isArray(o))..."` required shell escaping adjustments (`!` triggers history expansion in zsh). Verified JSON output independently.

## Next Phase Readiness

- Plan 08-02 has a clear target: reduce `npm run check:doc-links` from 21 offenders to 0
- The `findOffenders()===[]` test in tests/js/doc-links.test.mjs is the automated GREEN gate — no manual verification needed
- All 21 offender locations are exactly mapped (file, line, token, resolved path, reason)

---
*Phase: 08-docs-brand-assets*
*Completed: 2026-06-17*
