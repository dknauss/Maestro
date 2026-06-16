---
phase: 07-visual-polish-icons
plan: "01"
subsystem: ui
tags: [bootstrap-icons, icon-bundle, tdd, node-test, svg, data-uri, fill-icons]

# Dependency graph
requires:
  - phase: 06-accessibility-interaction
    provides: "node:test JS unit suite via npm run test:js (zero new runtime deps); tests/js/ directory; dual CommonJS/window export pattern"
provides:
  - "resolveIcon(name) -> {file, source:'fill'|'synonym'|'outline'} exported from bin/generate-bootstrap-icons.mjs"
  - "SYNONYM_FILL map (7 validated solid synonyms) exported and validated at load time"
  - "bakeDataUri(name) exported — pure bake function for unit testing"
  - "bin/generate-bootstrap-icons.mjs side-effect-free on import (main() guarded)"
  - "tests/js/icons-bundle.test.mjs — 11 unit tests for fill-resolution policy, data-URI shape, no-drop invariant"
  - "includes/icons-bootstrap.php regenerated: 87 entries, 58 fill + 7 synonym + 22 retained outline, at #a7aaad"
affects:
  - 07-02-PLAN
  - 07-03-PLAN

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fill-resolution policy: resolveIcon prefers <name>-fill.svg, then SYNONYM_FILL map (validated at load), then outline — never drops a CURATED name"
    - "Generator guarded with process.argv[1] === fileURLToPath(import.meta.url) — import is side-effect-free, enables unit testing"
    - "Dynamic ESM import in test: const mod = await import(generatorUrl.href) — avoids CJS createRequire issues with .mjs generator"
    - "SYNONYM_FILL validated at module load with existsSync — missing target throws rather than silently shipping broken output"

key-files:
  created:
    - tests/js/icons-bundle.test.mjs
  modified:
    - bin/generate-bootstrap-icons.mjs
    - includes/icons-bootstrap.php

key-decisions:
  - "journal-text has no journal-fill in Bootstrap Icons v1.13.1 — stays outline (plan's proposed synonym was invalid; not silently dropped)"
  - "graph-up has no graph-up-arrow-fill — stays outline (graph-up-arrow exists but only outline variant)"
  - "SYNONYM_FILL map: 7 entries — files->file-earmark-fill, pencil-square->pencil-fill, images->image-fill, folder2-open->folder-fill, cart3->cart-fill, person-circle->person-fill, person-lock->person-fill-lock"
  - "Integration payload budget (70 KiB lower bound) still holds after fill switch — fill SVGs smaller but total remains above 70 KiB; no PerformanceTest change needed"
  - "Dynamic import (await import()) used in test file to avoid createRequire interop issues with .mjs generator — simpler than dual-export guard for ESM files"

patterns-established:
  - "Generator-as-library: wrap side effects in main() + CLI guard so the same file is testable via import and runnable via CLI"
  - "Synonym map validation at module load: existsSync guard on all targets so broken mappings fail loudly at import time"

requirements-completed: [ICON-01]

# Metrics
duration: 15min
completed: 2026-06-16
---

# Phase 7 Plan 01: Solid-fill Bootstrap Icons Bundle Summary

**resolveIcon() policy TDD-first (RED→GREEN), then regenerated 87-icon bundle with Bootstrap -fill variants: 58 direct fills + 7 solid synonyms + 22 retained outlines at #a7aaad, all tests green (35 JS, 44 PHP unit, 29 integration)**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-16T05:55:59Z
- **Completed:** 2026-06-16T06:11:06Z
- **Tasks:** 3 (Task 1 TDD with RED+GREEN commits, Task 2, Task 3 no-change)
- **Files modified:** 3

## Accomplishments
- Established the fill-resolution policy as tested behavior: `resolveIcon(name)` prefers `-fill` SVG, applies 7 validated solid synonyms via `SYNONYM_FILL`, else retains outline — 87 in, 87 out, zero drops
- Refactored `generate-bootstrap-icons.mjs` to be side-effect-free on import (all file writes guarded behind `main()` / CLI check), enabling unit testing via dynamic ESM import
- Regenerated `includes/icons-bootstrap.php` with solid fill variants: 58 names now use `-fill.svg`, 7 use validated solid synonyms, 22 stay outline where no solid form exists in Bootstrap Icons v1.13.1
- All zero-regression bars confirmed: 35/35 JS unit, 44/44 PHP unit, 29/29 integration, composer lint clean

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing resolveIcon tests** - `15428dd` (test)
2. **Task 1 GREEN: Solid-fill resolution policy** - `73297b6` (feat)
3. **Task 2: Regenerate icon bundle** - `1fa3ae4` (feat)
4. **Task 3: Payload budget confirmed** — no file changed (29/29 passes at > 70 KiB; no bound adjustment needed)

_Note: TDD Task 1 has two commits (RED test → GREEN implementation)_

## Files Created/Modified
- `tests/js/icons-bundle.test.mjs` — 11 unit tests: resolveIcon fill/synonym/outline policy, SYNONYM_FILL target existence, 87-name no-drop invariant, bakeDataUri data-URI shape + #a7aaad + no currentColor
- `bin/generate-bootstrap-icons.mjs` — Exports resolveIcon, bakeDataUri, CURATED, SYNONYM_FILL, ICON_DIR, MENU_GREY; all side effects guarded behind CLI entry point
- `includes/icons-bootstrap.php` — Regenerated: 87 entries, 58 fills + 7 synonyms + 22 outlines, all #a7aaad, data:image/svg+xml;base64

## Decisions Made
- **SYNONYM_FILL omits journal-text and graph-up:** The plan proposed `journal-text`→`journal-fill` and `graph-up`→`graph-up-arrow` if a fill existed; neither `journal-fill.svg` nor `graph-up-arrow-fill.svg` is present in Bootstrap Icons v1.13.1. Per plan policy, missing synonym targets are hard errors — both names stay outline rather than mapping to an invalid target.
- **7 validated synonyms (not 8):** The plan listed 8 candidate synonyms; after existsSync validation against the installed version, 7 pass. The 8th (`journal-text`) was omitted. The plan explicitly sanctioned this: "a mapping whose target is missing is a hard error, not a silent skip."
- **No PerformanceTest change:** The integration test's `assertGreaterThan(70 * 1024, ...)` lower bound still passes after the fill switch (fill SVGs are smaller, but the total payload remains above 70 KiB). No adjustment to PerformanceTest.php was needed.
- **Dynamic import in test file:** Used `await import(generatorUrl.href)` rather than `createRequire` interop, which simplifies the import for native ESM modules and avoids CJS wrapper issues.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] journal-fill.svg absent — synonym not added**
- **Found during:** Task 1 (GREEN — SYNONYM_FILL construction)
- **Issue:** Plan's fill_resolution_decision listed `journal-text`→`journal-fill` as a "confirmed candidate." `journal-fill.svg` does not exist in Bootstrap Icons v1.13.1.
- **Fix:** Excluded `journal-text` from SYNONYM_FILL (stays outline). The plan explicitly required hard failure for missing targets — exclusion is the correct behavior, not a deviation from intent.
- **Files modified:** bin/generate-bootstrap-icons.mjs (SYNONYM_FILL map)
- **Verification:** `npm run test:js` — all 11 icon tests pass; SYNONYM_FILL targets all verified existsSync
- **Committed in:** `73297b6` (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (plan candidate list included an unavailable file)
**Impact on plan:** No scope impact. The fill-resolution policy contract is fully satisfied: 87 names in, 87 entries out, every SYNONYM_FILL target validated. journal-text stays as outline (same as before), which the plan explicitly accommodated.

## Issues Encountered
- Docker/Colima socket needed `docker context use colima` before integration tests could reach the wp-env containers. Containers were already running; context switch was the only required step.

## User Setup Required
None — all tooling is local. No new npm dependencies. Docker/Colima must be running for `npm run test:php` (was already up).

## Next Phase Readiness
- `resolveIcon` and `bakeDataUri` are exported and tested — Plan 07-02 (visual review) can import and use them
- Regenerated `includes/icons-bootstrap.php` ships via `bin/build.sh` (includes/ is part of the build copy)
- JS unit 35/35, PHP unit 44/44, integration 29/29, lint clean — zero regression
- 22 retained-outline names are documented: Plan 07-03 side-by-side review determines if any still read too light (Heroicons fallback gated on that review per Claude's Discretion #2)

---
*Phase: 07-visual-polish-icons*
*Completed: 2026-06-16*
