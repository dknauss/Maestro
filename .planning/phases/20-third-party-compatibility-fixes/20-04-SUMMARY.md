---
phase: 20-third-party-compatibility-fixes
plan: 04
subsystem: menu-config
tags: [php, phpunit, dom, replay, badge-preservation, text-node-replacement]

# Dependency graph
requires:
  - phase: 20-third-party-compatibility-fixes (20-02)
    provides: "Replay::replay()'s qualified-key/legacy-bare-fallback title-write seams ($menu[pos][0], $submenu[parent][pos][0]) this plan hooks without altering resolution logic"
provides:
  - "Maestro\\Title::replace_label() — a pure, WP-free text-node label-replacement helper preserving surrounding markup (trailing badges AND wrapping spans), with a null no-text-node signal for wholesale fallback"
  - "Replay::replay()'s two title-write seams (top-level, submenu) re-extract badge/wrapper markup from the LIVE title each request and swap only the human-readable label, falling back to wholesale set when no text node exists"
affects: [22-demo-showcase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure DOM-based text-node extraction: DOMDocument + libxml_use_internal_errors, wrapped in a synthetic <div> with a leading '<?xml encoding=\"UTF-8\"?>' PI (standard UTF-8-safe loadHTML trick), depth-first document-order search for the first non-empty/non-numeric text node"
    - "Prefix/suffix whitespace preservation via /^(\\s*).*?(\\s*)$/s so a trailing badge's separating space survives a label swap"
    - "Caller-owned fallback: the pure helper returns null on no-text-node; the WP-coupled caller (Replay::replay()) decides to wholesale-set, keeping Title itself unit-testable and WP-free"

key-files:
  created:
    - includes/class-title.php
    - tests/unit/TitleTest.php
  modified:
    - includes/class-replay.php
    - tests/integration/ReplayTest.php
    - maestro-menu-editor.php
    - tests/bootstrap-unit.php
    - TESTING.md

key-decisions:
  - "Candidate-node rule: depth-first, document-order; the first text node whose trimmed value is non-empty AND not purely numeric is the label. A bare digit run (count/badge inner text) is never treated as the label, so 'icon + count-only' titles correctly signal no-text-node instead of mistakenly swapping the count."
  - "Title::replace_label() is intentionally WP-free (DOMDocument/libxml only) so it stays in the fast pure-unit suite; registered in maestro-menu-editor.php's require_once list and tests/bootstrap-unit.php's unit-suite require list, alongside Ordering/Slug/Config."
  - "Storage never changes shape: only the LIVE title (read fresh from $row[0] at each seam) is passed through replace_label(); the stored $ovr['title'] stays the plain-text value sanitize_text_field() already guards. Badge HTML is re-extracted every request, never cached/stored."

patterns-established:
  - "Same live-title-swap pattern applied identically at both title-write seams (top-level $menu[pos][0] and submenu $submenu[parent][pos][0]) — no duplication of resolution logic, only of the three-line read-live/replace/fallback sequence."

requirements-completed: [COMPAT-07]

# Metrics
duration: ~30min
completed: 2026-08-01
---

# Phase 20 Plan 04: Badge/HTML Preservation on Rename (COMPAT-07) Summary

**A pure `Title::replace_label()` DOM helper swaps only the human-readable text node in a live rendered menu title — preserving WooCommerce-style trailing count bubbles and WPForms-style wrapping spans — wired into both of `Replay::replay()`'s title-write seams with a wholesale fallback for icon-only/no-text-node titles.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-08-01 (session start, following 20-03)
- **Completed:** 2026-08-01T21:16:28-06:00
- **Tasks:** 2/2 completed
- **Files modified:** 7 (2 created: `includes/class-title.php`, `tests/unit/TitleTest.php`; 5 modified)

## Accomplishments

- `Maestro\Title::replace_label( $live_html_title, $plain_label )` — a pure, WP-free helper that parses the live title with `DOMDocument`, walks it depth-first in document order, and finds the first text node whose trimmed value is non-empty and NOT purely numeric (a bare digit run is a count/badge, never the label). Only that node's content is replaced, with leading/trailing whitespace preserved so a trailing badge keeps its separating space. Returns `null` when no such node exists (icon + badge-only titles), signalling the caller to fall back to a wholesale set.
- Covers all 4/6 R1 fixture shapes required by the plan: WooCommerce trailing count bubble (nested spans, digit-only inner text), Yoast-style trailing notification span, WPForms-style wrapping span (`<span style="color:#f18500">Addons</span>` → label swapped, wrapper kept), and a trailing upsell-badge shape — plus plain-label wholesale, no-text-node null, multiple-text-node (first-candidate-wins, later siblings untouched), and entity round-trip (`&` doesn't double-encode to `&amp;amp;`) edge cases. `class-title.php` registered in both `maestro-menu-editor.php`'s require list and `tests/bootstrap-unit.php`'s pure-unit bootstrap.
- `Replay::replay()`'s two title-write seams (`$menu[pos][0]` top-level, `$submenu[parent][pos][0]` submenu) now read the LIVE current row title, pass it plus the stored plain-text override through `Title::replace_label()`, and write the result — or the stored title wholesale when the helper returns `null`. The 20-02 qualified-key/legacy-bare-fallback resolution logic is completely untouched; only the write step changed.
- Verified with dedicated integration fixtures: top-level rename over a trailing-badge title preserves the badge; submenu rename over a wrapping-span title preserves the wrapper; a no-text-node title falls back to wholesale with no fatal; a badge's count is re-extracted from the LIVE title across two separate replay passes (proving no stale/cached snapshot); and the stored `items[key].title` stays plain text (no `<span`) after a full badge-bearing save+replay round trip.
- Full suite green: PHP unit 114/114 (141 assertions, up from 103/103), PHP integration 65/65 (150 assertions, up from 60/60), phpcs clean, PHPStan clean, `npm run check:doc-links` clean. `TESTING.md` canonical counts and layer descriptions updated in the same commits as each count change.

## Task Commits

Each task was committed atomically:

1. **Task 1: Pure text-node label-replacement helper** - `59364a3` (feat)
2. **Task 2: Wire label-replacement into replay title-write (top + submenu)** - `a6204db` (feat)

**Plan metadata:** (pending — this commit)

_Per this project's test-blocking commit gate (a pre-commit hook runs the test suite), RED was verified in the working tree before each GREEN commit: Task 1 by temporarily replacing `class-title.php` with a null-returning stub and confirming 9/11 `TitleTest` cases failed, then restoring the real implementation; Task 2 by running the new `ReplayTest` badge-preservation cases against `class-replay.php` BEFORE the wiring change (3 failures confirmed) and again AFTER (green). Each task then committed test+impl together as ONE green commit, per CLAUDE.md's test-blocking-gate exception to the standalone-RED-commit rule._

## Files Created/Modified

- `includes/class-title.php` - New pure `Title` class; `replace_label()` (DOMDocument-based text-node swap) + `find_label_node()` (depth-first candidate search)
- `tests/unit/TitleTest.php` - New; 11 test methods covering the fixture-driven markup-preservation cases (dataProvider), whitespace preservation, leading-icon-element shape, no-text-node null, empty-title null, multiple-text-node rule, and entity round-trip
- `includes/class-replay.php` - Both title-write seams (`replay()`'s top-level loop ~L133 and submenu loop ~L235) now call `Title::replace_label()` against the live row title with a wholesale fallback
- `tests/integration/ReplayTest.php` - 5 new `ReplayTest` methods under a "COMPAT-07: badge/HTML preservation on rename (20-04)" section
- `maestro-menu-editor.php` - `require_once` for `includes/class-title.php` added to the plugin's boot require list
- `tests/bootstrap-unit.php` - `require_once` for `includes/class-title.php` added to the pure-unit bootstrap's require list
- `TESTING.md` - Unit count 103/103→114/114 (127→141 assertions), integration count 60/60→65/65 (143→150 assertions); layer descriptions in sections 1 and 2 mention the new `Title`/COMPAT-07 coverage with markdown links (doc-links check passes)

## Decisions Made

- Candidate-node rule (first non-empty, non-numeric text node in document order) chosen over a more elaborate heuristic — it correctly separates "human-readable label" from "digit-only badge inner text" for every fixture shape required by the plan (trailing bubble, wrapping span, notification span, upsell badge) without hardcoding any plugin-specific CSS class names.
- `Title` kept entirely WP-free (no `wp_*` calls) so it lives in the fast pure-unit suite alongside `Ordering`/`Slug`, per the project's established unit/integration split.
- The wholesale-fallback decision stays in the WP-coupled caller (`Replay::replay()`), not inside `Title::replace_label()` — the pure helper only signals `null`; this keeps the helper trivially unit-testable and keeps the "who decides what happens on failure" responsibility at the seam that already owns today's wholesale behavior.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' `must_haves.truths` and `done` criteria were met without any Rule 1-4 fixes; no architectural questions arose.

## Issues Encountered

- Docker/Colima was not running at session start (needed for `composer test:integration`/`npm run test:php` against the real WP test suite). Started Colima (`colima start`, existing VM, disk headroom 17GB — above the 15GB sweep threshold, no recreate needed) and `npx wp-env start`. Tore both down at the end: `npx wp-env destroy` (confirmed via `docker ps -a` showing zero containers) then `colima stop`. Not a plan deviation — standard environment lifecycle per this session's hygiene conventions.
- `composer analyse:phpstan`, `npm run test:php`/`npx wp-env start`/`npx wp-env destroy`, and all `git commit` invocations required the sandbox disabled per this project's established convention (PHPStan's parallel worker binds a local TCP socket; wp-env drives Docker; commit signing reads an SSH key) — all ran clean with the sandbox disabled, no code issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- COMPAT-07 is fully complete: badge/HTML preservation on rename works for all 4/6 R1 fixture shapes at both title-write seams, storage stays plain-text-only, and counts are always re-extracted live (never a stale snapshot). No blockers for Phase 20's remaining COMPAT-10 plan or Phase 22 (demo showcase, which depends on Phase 20's fixes actually existing).
- `Title::replace_label()` is a small, general-purpose, WP-free primitive — reusable if a future phase needs the same "preserve markup, swap only the label" pattern elsewhere (e.g. admin-bar node titles).
- Zero-regression gate confirmed green across this plan's changes: PHP unit 114/114, PHP integration 65/65, phpcs clean, PHPStan clean, doc-links clean. E2E was not required for this plan (server-side-only fix per the plan's `<verification>` section) and was not run.

---

*Phase: 20-third-party-compatibility-fixes*
*Completed: 2026-08-01*

## Self-Check: PASSED

- FOUND: includes/class-title.php
- FOUND: tests/unit/TitleTest.php
- FOUND: includes/class-replay.php
- FOUND: tests/integration/ReplayTest.php
- FOUND: maestro-menu-editor.php
- FOUND: tests/bootstrap-unit.php
- FOUND: TESTING.md
- FOUND: commit 59364a3
- FOUND: commit a6204db
