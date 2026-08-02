---
phase: 20-third-party-compatibility-fixes
plan: 01
subsystem: menu-config
tags: [php, phpunit, slug-normalization, config-sanitize, qualified-keys]

# Dependency graph
requires:
  - phase: 17-slug-normalization
    provides: Slug::normalize() (host-move, ver=, utm_*, &amp; contract) and Config::sanitize() items loop
provides:
  - "Maestro\\Slug::is_qualified()/split_qualified()/normalize_qualified() — pure parent>child key parse + per-half normalization"
  - "Config::sanitize() qualified-key acceptance: preserves parent>child items keys, cleans each half independently, drops icon on submenu keys"
affects: [20-02-replay-wiring, 22-demo-showcase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Qualified-key contract: split on first '>' (QUALIFIED_SEPARATOR const), normalize/clean each half independently, reject whole key if either half is empty"

key-files:
  created: []
  modified:
    - includes/class-slug.php
    - includes/class-config.php
    - tests/unit/SlugTest.php
    - tests/unit/ConfigSanitizeTest.php
    - TESTING.md

key-decisions:
  - "Qualified-key home is Maestro\\Slug (not a new class) — keeps all normalization logic in one place, per-half normalize() reuse, zero duplication"
  - "Split on the FIRST '>' only (Slug::QUALIFIED_SEPARATOR) — parent slugs are admin-page slugs and don't themselves contain '>', so first-split is unambiguous"
  - "Icon-drop enforcement lives in Config::sanitize() (not Slug) — Slug stays pure/WP-free; the icon allowlist is Config's existing concern"

patterns-established:
  - "Qualified-key parse/normalize is pure and unit-tested (no WP); Config::sanitize()'s qualified-key handling reuses Slug's split/clean primitives rather than re-implementing string splitting"

requirements-completed: [COMPAT-04]

# Metrics
duration: 21min
completed: 2026-08-01
---

# Phase 20 Plan 01: Qualified-Key Foundation Summary

**Pure `parent>child` submenu-key parser/normalizer added to `Maestro\Slug`, plus `Config::sanitize()` support that round-trips qualified keys while dropping any icon on a submenu row — the storage/normalization contract Plan 20-02's replay wiring will consume.**

## Performance

- **Duration:** 21 min
- **Started:** 2026-08-01T18:35:33-06:00 (prior commit baseline)
- **Completed:** 2026-08-01T18:56:30-06:00
- **Tasks:** 2/2 completed
- **Files modified:** 5

## Accomplishments
- `Maestro\Slug` gained `is_qualified()`, `split_qualified()`, and `normalize_qualified()` — a pure, WP-free helper that normalizes a stored/rendered `parent>child` key by running `Slug::normalize()` on each half independently and rejoining with `>`, rejecting the whole key if either half is empty/unparseable.
- `Config::sanitize()` now detects a qualified items key, cleans each half via `clean_slug()` independently (rather than tag/trim-cleaning the raw joined string), and stores it under the recomposed qualified key — title and `hidden_roles` survive, `icon` is always dropped on a qualified (submenu) key, and a malformed key with an empty half is skipped entirely.
- Zero regression to bare top-level slug behavior in either class.
- Unit suite grew from 90/90 (101 assertions) to 103/103 (127 assertions); `TESTING.md`'s canonical count updated in both task commits.

## Task Commits

Each task was committed atomically:

1. **Task 1: Pure qualified-key parse + per-half normalization helper** - `4ccdc9e` (feat)
2. **Task 2: Config::sanitize() qualified-key acceptance + submenu icon drop** - `d12b954` (feat)

**Plan metadata:** (pending — this commit)

_Note: per CLAUDE.md's test-blocking commit gate, each task's RED test cases were written and run to failure in the working tree (not committed separately), then committed together with the GREEN implementation as one commit per task._

## Files Created/Modified
- `includes/class-slug.php` - Added `QUALIFIED_SEPARATOR` const + `is_qualified()`/`split_qualified()`/`normalize_qualified()` static methods
- `includes/class-config.php` - `sanitize()` items loop now branches on `Slug::is_qualified()`: qualified keys clean each half independently via `clean_slug()` and never emit `icon`; bare keys unchanged
- `tests/unit/SlugTest.php` - 8 new qualified-key test methods (is_qualified, split_qualified, bare passthrough, both-halves-independent, one-half-drift, distinct-children-stay-distinct, empty-half-rejected)
- `tests/unit/ConfigSanitizeTest.php` - 7 new qualified-key test methods (key preserved, bare-key regression guard, icon dropped on qualified/kept on bare, per-half cleaning, caps still apply, empty-half skipped)
- `TESTING.md` - Canonical unit count updated twice: 90/90→97/97 (Task 1), 97/97→103/103 (Task 2)

## Decisions Made
- Extended `Maestro\Slug` rather than creating a new class — keeps normalization logic in one place and reuses `Slug::normalize()` per half with zero duplication (per CONTEXT's executor discretion).
- Single split on the FIRST `>` only, matching the CONTEXT-granted discretion — parent slugs are admin-page slugs (e.g. `edit.php?post_type=product`) and don't themselves contain `>`.
- Icon-drop enforcement placed in `Config::sanitize()`, gated on `Slug::is_qualified()`, rather than in `Slug` itself — keeps `Slug` pure/WP-free and keeps the icon allowlist concern (`sanitize_icon()`/`icon_form()`) inside `Config` where it already lives.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' `must_haves.truths` and `done` criteria were met without any Rule 1-4 fixes; no architectural questions arose.

## Issues Encountered

- `composer install` had not yet been run in this working tree (no `vendor/` dir) — installed dependencies before running the baseline `composer test:unit` (confirmed 90/90 unit tests, 101 assertions pre-existing baseline). Not a plan deviation — standard first-run setup, no code change.
- `composer analyse:phpstan` failed under the default sandbox with `Failed to listen on "tcp://127.0.0.1:0": Operation not permitted` (PHPStan's parallel worker needs a local TCP socket). Re-ran with the sandbox disabled per this session's project conventions; PHPStan then reported `[OK] No errors` for both task commits. No code issue — a sandbox network restriction, not a deviation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The `Slug::normalize_qualified()` / `Config::sanitize()` qualified-key contract is unit-tested and ready for Plan 20-02 to wire into `class-replay.php`'s top-level and submenu resolution loops (per 20-CONTEXT.md's "new saves always qualify submenus" decision) and into `get_menu_model()` for the editor.
- `sub_order` was correctly left untouched (parent-keyed already, not qualified) — matches the CONTEXT's explicit "do not touch it here" instruction.
- No blockers. Task 2's icon-drop and empty-half-skip behavior is exactly what Plan 20-02 and the minimal A1b client fix will depend on.

---
*Phase: 20-third-party-compatibility-fixes*
*Completed: 2026-08-01*

## Self-Check: PASSED

- FOUND: 20-01-SUMMARY.md
- FOUND: includes/class-slug.php
- FOUND: includes/class-config.php
- FOUND: commit 4ccdc9e
- FOUND: commit d12b954
