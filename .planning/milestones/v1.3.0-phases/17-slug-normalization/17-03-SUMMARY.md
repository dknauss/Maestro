---
phase: 17-slug-normalization
plan: "03"
subsystem: slug-normalization
tags: [zero-regression-gate, phpunit, phpcs, phpstan, playwright, plugin-check, changelog]
dependency_graph:
  requires:
    - phase: 17-01
      provides: "Maestro\\Slug::normalize() pure resolver"
    - phase: 17-02
      provides: "Normalized-key resolution at all three Replay seams with dual-axis collision fail-safe"
  provides:
    - "Full-suite zero-regression gate green at Phase 17 head (unit 88/88, integration 45/45, JS 53/53, e2e 32/32, WPCS clean, PHPStan 0, Plugin Check 0 errors)"
    - "Bug fix: class-slug.php missing from main plugin entry point — Maestro\\Slug now loads correctly in the live WP runtime"
    - "Draft v1.3.0 user-facing changelog note (finalized in Phase 18)"
  affects: [Phase-18-release]
tech_stack:
  added: []
  patterns:
    - "wp-env alternate-port gate pattern: WP_ENV_PORT=8890 WP_ENV_TESTS_PORT=8899 when 8888/8889 held by other projects"
    - "Plugin Check shippable-source exclusion: --exclude-directories with full dev dir list produces 0-error gate"
key_files:
  created:
    - .planning/phases/17-slug-normalization/17-03-SUMMARY.md
  modified:
    - maestro-menu-editor.php
    - readme.txt

key_decisions:
  - "Bug found in gate: class-slug.php missing from require_once list in maestro-menu-editor.php — fixed as Rule 1 (all 16 integration normalization tests failed with 'Class Maestro\\Slug not found'); committed as fix(17-03)"
  - "Plugin Check run with --exclude-directories excluding tests,bin,docs,build,vendor,node_modules,playground,.planning,.claude,.github,test-results — this is the shippable-source gate invocation for this project"
  - "wp-env started on alternate ports 8890/8899 (dev/tests) — 8888 and 8889 both held by other projects; established port-contention pattern (STATE.md note)"
  - "readme.txt changelog note added as plain-language draft; README.md has no changelog section (dev-oriented file), so no mirror needed"

requirements-completed: [FIX-01, FIX-02, FIX-03]

duration: 30min
completed: "2026-06-29"
---

# Phase 17 Plan 03: Zero-Regression Gate + v1.3.0 Changelog Note Summary

**Full-suite gate green at Phase 17 head (88 unit, 45 integration, 53 JS, 32 e2e, WPCS clean, PHPStan 0, Plugin Check 0) after fixing the missing class-slug.php entry-point require that caused all normalization integration tests to error.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-06-29T22:10:13Z (continuing directly from 17-02)
- **Completed:** 2026-06-29
- **Tasks:** 2
- **Files modified:** 2 (+ SUMMARY)

## Accomplishments

- Found and fixed a critical bug: `class-slug.php` was never loaded by the main plugin file — `Maestro\Slug` was only reachable via the unit-test bootstrap stub, not in the real WP runtime or integration environment. All 16 integration ReplayTest normalization methods errored with "Class Maestro\Slug not found". Fixed by adding `require_once MAESTRO_DIR . 'includes/class-slug.php'` before `class-replay.php` in `maestro-menu-editor.php`.
- Ran the complete Phase 17 zero-regression gate with all seven steps passing: PHP unit (88/88), WPCS lint (clean), PHPStan (0 errors), JS (53/53), PHP integration (45/45 — including all 8 new FIX-01/02/03 acceptance methods and collision no-op), Playwright e2e (32 pass / 10 skipped-capture-gated), Plugin Check (0 errors on shippable source).
- Drafted user-facing v1.3.0 changelog note in readme.txt covering host moves, ver= bumps, UTM drift, and &amp;/& taxonomy slug encoding.

## Gate Pass Counts

| Suite | Count | Notes |
|-------|-------|-------|
| PHP unit (`composer test:unit`) | 88/88 | SlugTest, OrderingTest, ReplayTest (unit), ConfigSanitizeTest, IconValidationTest |
| WPCS lint (`composer lint`) | clean | 0 errors, 0 warnings |
| PHPStan (`composer analyse:phpstan`) | 0 errors | sandbox-disabled (TCP socket) |
| JS (`npm run test:js`) | 53/53 | node:test |
| PHP integration (`npm run test:php`) | 45/45 | incl. 8 new FIX-01/02/03 acceptance + collision no-op |
| Playwright e2e (`npm run test:e2e`) | 32 pass, 10 skip | skipped = MAESTRO_CAPTURE-gated screenshot specs |
| Plugin Check | 0 errors | shippable source (dev dirs excluded) |

**wp-env port used:** dev 8890 / tests 8899 (8888/8889 held by other projects)

## Task Commits

1. **Task 1 (gate bug fix): require class-slug.php in plugin entry point** - `3d6964e` (fix)
2. **Task 2: draft v1.3.0 changelog note** - `b03455e` (docs)

## Files Created/Modified

- `maestro-menu-editor.php` — Added `require_once MAESTRO_DIR . 'includes/class-slug.php'` before `class-replay.php`
- `readme.txt` — Added `= 1.3.0 =` changelog section (draft; Stable tag not bumped)

## Decisions Made

- **Bug fix target (not test papering):** The `class-slug.php` omission was a real missing-require bug in the plugin entry point — `normalize()` worked only in unit tests because the unit bootstrap loaded it directly. The production plugin runtime never had Slug available. This is a Rule 1 auto-fix.
- **Plugin Check invocation:** `--exclude-directories=tests,bin,docs,build,vendor,node_modules,playground,.planning,.claude,.github,test-results` — this is the correct shippable-source gate invocation for this project's development-tree mapping pattern.
- **readme.txt only (no README.md mirror):** README.md is a developer-facing GitHub file with no changelog section; readme.txt is the WordPress.org-canonical changelog location. No mirror needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing require_once for class-slug.php in maestro-menu-editor.php**
- **Found during:** Task 1 (PHP integration test run)
- **Issue:** All 16 ReplayTest integration methods that use the normalization wiring errored: `Error: Class "Maestro\Slug" not found` in `class-replay.php:95`. The unit tests passed because `bootstrap-unit.php` loads `class-slug.php` directly; the integration bootstrap loads via the main plugin file, which never included it.
- **Fix:** Added `require_once MAESTRO_DIR . 'includes/class-slug.php'` between `class-config.php` and `class-ordering.php` in `maestro-menu-editor.php`.
- **Files modified:** `maestro-menu-editor.php`
- **Verification:** Integration suite went from 16 errors (all normalization tests) to 45/45 green. Unit suite stayed 88/88.
- **Commit:** `3d6964e` fix(17-03)

---

**Total deviations:** 1 auto-fixed (1 missing require / Rule 1 bug)
**Impact on plan:** Critical correctness fix — without this the normalization wiring never ran in production. No scope creep.

## Issues Encountered

- **Port contention (non-blocking):** wp-env default ports 8888 (dev) and 8889 (tests) both held by other projects. Used `WP_ENV_PORT=8890 WP_ENV_TESTS_PORT=8899` per the established Phase 11.1/11.8 alternate-port pattern. All integration + e2e runs used port 8899.
- **PHPStan EPERM in sandbox:** Expected. Ran `composer analyse:phpstan` with `dangerouslyDisableSandbox: true`. Result: 0 errors.
- **Plugin Check working-tree scope:** wp-env maps the full working tree into the container, so `wp plugin check maestro-menu-editor` sees dev dirs. Used `--exclude-directories` to isolate shippable source. Matched Phase 09 gate pattern.

## v1.3.0 Changelog Draft

Added to `readme.txt` under `= 1.3.0 =`:

> Saved overrides now keep applying even when your site moves to a new host, when a plugin updates and changes a version number in its menu URL, when UTM tracking parameters drift on external-tool links, and when a taxonomy slug is stored with `&amp;` encoding instead of `&` (or vice versa) — no manual re-save needed.

Final release copy + version/Stable-tag bump deferred to Phase 18.

## Self-Check: PASSED

Files created/modified:
- FOUND: maestro-menu-editor.php (contains class-slug.php require)
- FOUND: readme.txt (contains 1.3.0 changelog note)
- FOUND: .planning/phases/17-slug-normalization/17-03-SUMMARY.md

Commits:
- FOUND: 3d6964e (fix(17-03): require class-slug.php in plugin entry point)
- FOUND: b03455e (docs(17-03): draft v1.3.0 slug-resilience changelog note)

## Next Phase Readiness

Phase 17 (Slug Normalization) is complete — all three waves delivered:
- Wave 1 (17-01): `Maestro\Slug::normalize()` pure function with 88-test unit suite
- Wave 2 (17-02): Normalized-key resolution wired into all three Replay seams + dual-axis collision fail-safe + 8 integration acceptance methods
- Wave 3 (17-03): Zero-regression gate green, missing entry-point require fixed, v1.3.0 changelog drafted

Ready for `/gsd:verify-work` then Phase 18 (REL-09: build, Plugin Check, tag v1.3.0, SVN deploy).

No blockers.

---
*Phase: 17-slug-normalization*
*Completed: 2026-06-29*
