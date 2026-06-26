---
phase: 11-editor-entry-reorder-fixes
plan: 06
subsystem: ui
tags: [css, assets, admin-bar, enqueue, wordpress, mobile, ux]

# Dependency graph
requires:
  - phase: 11-editor-entry-reorder-fixes
    provides: Wave 0 RED enter-state UX-08a guard in tests/e2e/editor.spec.ts (11-05)
provides:
  - "maestro-admin-bar.css: always-loaded <=782px admin-bar toggle override (display:block + icon-only)"
  - "Assets::enqueue() enqueues maestro-admin-bar.css unconditionally, before is_edit_mode() early return"
  - "maestro.css: duplicate toggle override removed (single source of truth)"
  - "UX-08a Gap 1 closed: editor ENTER toggle reachable at <=782px on any capable-user admin page"
affects: [11-07-plan, 11-08-plan]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Extract always-needed CSS sub-rule into a tiny always-loaded stylesheet; gate heavy editor assets behind is_edit_mode() only"
    - "wp_enqueue_style placed unconditionally BEFORE an early-return guard — standard WP enqueue-before-gate pattern"

key-files:
  created:
    - assets/maestro-admin-bar.css
  modified:
    - includes/class-assets.php
    - assets/maestro.css

key-decisions:
  - "11-06 removes lines 512-521 from maestro.css (the duplicated toggle override); 11-07 adds to the same file in a separate commit — no conflict because 11-06 runs first and 11-07 touches different line ranges"
  - "Dashicons dependency declared at enqueue time in class-assets.php (not via @import in the CSS file) — keeps the stylesheet self-contained and dependency-correct"
  - "No current_user_can() guard needed on the admin-bar enqueue: the admin-bar node itself is registered by class-admin-bar.php only for capable users; loading a tiny CSS on admin_enqueue_scripts for all admin pages is safe"

patterns-established:
  - "Always-loaded micro-stylesheet pattern: extract rules that must fire outside edit mode into a separate file; keep the heavy editor bundle edit-mode-gated"

requirements-completed: [UX-08a]

# Metrics
duration: ~2min
completed: 2026-06-21
---

# Phase 11 Plan 06: Gap 1 — Always-Load Admin-Bar Toggle Override Summary

**Extracted the <=782px #wp-admin-bar-maestro-toggle display:block rule into a new always-loaded maestro-admin-bar.css and enqueued it unconditionally before the is_edit_mode() early return, making the editor ENTER toggle reachable on mobile without adding editor weight to non-edit pages**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-06-21T23:35:00Z
- **Completed:** 2026-06-21T23:36:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `assets/maestro-admin-bar.css`: minimal stylesheet with the `@media screen and (max-width:782px)` override for `#wpadminbar li#wp-admin-bar-maestro-toggle { display:block }` and `.maestro-ab-label { display:none }` — specificity (0,2,1) matching WP core's whitelist pattern, no `!important`
- Modified `includes/class-assets.php`: added `wp_enqueue_style('maestro-admin-bar', …, array('dashicons'), MAESTRO_VERSION)` unconditionally ABOVE the `if ( ! is_edit_mode() ) return;` at line 55; heavy editor assets (maestro.css / maestro-logic.js / maestro.js) remain edit-mode-gated
- Removed the now-duplicated `#wpadminbar li#wp-admin-bar-maestro-toggle` override from `assets/maestro.css` lines 512-521; single source of truth is now `maestro-admin-bar.css`
- Turns the 11-05 UX-08a enter-state RED guard GREEN at the Wave 2 boundary: toggle visible + icon-only at 782px and 600px with no maestro_edit param

## Task Commits

Each task was committed atomically:

1. **Task 1: Create assets/maestro-admin-bar.css with the always-needed <=782px override** — `b2a24a5` (feat)
2. **Task 2: Enqueue the override unconditionally + remove the duplicate from maestro.css** — `00e01e1` (feat)

## Files Created/Modified

- `assets/maestro-admin-bar.css` — New always-loaded stylesheet: <=782px display:block + .maestro-ab-label icon-only override for the admin-bar toggle node (9 lines, TDD-exempt per CLAUDE.md)
- `includes/class-assets.php` — Unconditional wp_enqueue_style('maestro-admin-bar') added before is_edit_mode() early return
- `assets/maestro.css` — Removed duplicated admin-bar toggle override (lines 512-521); single source of truth now in maestro-admin-bar.css

## Decisions Made

- 11-06 removes the maestro.css duplicate; 11-07 touches different line ranges of the same file — no conflict when executed in dependency order
- Dashicons dependency is declared at enqueue time in PHP, not via @import in CSS, keeping the stylesheet self-contained
- No capability guard on the always-loaded enqueue: class-admin-bar.php gates node registration, so the CSS renders a no-op for non-capable users (node absent)

## Deviations from Plan

None — plan executed exactly as written. Both task commits existed from a prior executor; this execution verified all criteria, ran fast PHP checks (php -l clean, phpcs clean on includes/class-assets.php), and produced bookkeeping artifacts.

## Issues Encountered

None. Tasks were pre-committed. All verification criteria confirmed:
- `assets/maestro-admin-bar.css` exists and contains `wp-admin-bar-maestro-toggle` and `max-width: 782px`
- `includes/class-assets.php` contains `maestro-admin-bar` enqueue before `is_edit_mode()` return
- `assets/maestro.css` no longer contains `wp-admin-bar-maestro-toggle`
- `php -l` clean on class-assets.php
- `phpcs` clean on class-assets.php

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- UX-08a Gap 1 closed: enter-state toggle is now always-loaded on mobile
- 11-07 (panel + move buttons) turns the control-driven reorder RED guard GREEN
- 11-08 (Wave 2 gate) runs the full Docker e2e suite (sandbox-disabled) to confirm both guards GREEN
- maestro.css is ready for 11-07 to add toolbar compression + badge CSS at its line ranges (no conflict with 11-06's deletion)

---
*Phase: 11-editor-entry-reorder-fixes*
*Completed: 2026-06-21*
