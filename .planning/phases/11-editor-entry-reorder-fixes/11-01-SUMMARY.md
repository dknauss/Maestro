---
phase: 11-editor-entry-reorder-fixes
plan: "01"
subsystem: tests
tags: [wave-0, e2e, integration, tdd, ux-08a, ux-08b, bug-06, bug-07]
dependency_graph:
  requires: []
  provides: [wave-0-guards, ux-08a-e2e, bug-06-e2e, bug-07-e2e, ux-08b-integration]
  affects: [11-02, 11-03, 11-04]
tech_stack:
  added: []
  patterns: [wave-0-tests-first, playwright-probe-and-skip, integration-test-wp-runtime]
key_files:
  created:
    - tests/integration/AdminBarTest.php
  modified:
    - tests/e2e/editor.spec.ts
decisions:
  - "AdminBarTest.php placed in tests/integration (not unit): Admin_Bar::node() depends on WP runtime functions; unit bootstrap is deliberately WP-free"
  - "BUG-06 test uses probe-first + test.skip() when no separators in wp-env — never passes vacuously; fixture added in 11-03"
  - "UX-08a icon-only assertion uses .ab-icon visible + bounding-width proxy (selector-agnostic vs label-wrapper class chosen in 11-02)"
  - "BUG-07 asserts badge as descendant of .wp-menu-name (not just <li>) — encodes the corrected target placement"
  - "UX-08b meta.title assertions guard long-form a11y strings are NOT dropped when visible labels become compact"
metrics:
  duration: "~9m"
  completed: "2026-06-21"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
---

# Phase 11 Plan 01: Wave 0 Test Guards (UX-08a, BUG-06, BUG-07, UX-08b) Summary

Wave 0 red-guard tests for all four Phase 11 requirements — three new Playwright e2e blocks and a PHP integration test — so every Wave 1 implementation plan has a pre-existing automated check before any production code changes.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add three new e2e test() blocks (UX-08a, BUG-06, BUG-07) to editor.spec.ts | 24bf00f | tests/e2e/editor.spec.ts |
| 2 | Create tests/integration/AdminBarTest.php asserting UX-08b label strings | 8c7f749 | tests/integration/AdminBarTest.php |

## What Was Built

### Task 1 — Three new Playwright e2e tests (editor.spec.ts)

Added a new `test.describe('Phase 11 — editor entry & reorder fixes (Wave 0 guards)')` block containing:

**UX-08a** (`test('UX-08a: edit toggle stays visible and icon-only at <=782px and <=600px')`):
- Loops over widths `[782, 600]`, sets viewport, navigates to edit mode
- Asserts `#wp-admin-bar-maestro-toggle` is visible (fails now — core hides it)
- Asserts `.ab-icon` inside the node is visible (dashicon present)
- Asserts node bounding width <=60px (icon-only proxy, selector-agnostic vs the label-wrapper 11-02 will choose)
- NOTE(11-02) comment documents the selector contract for the implementer

**BUG-06** (`test('BUG-06: Alt+Arrow keyboard reorder leaves wp-menu-separator nodes in place')`):
- Probes `#adminmenu > li.wp-menu-separator` count at runtime; records as `test.info().annotations`
- If count is 0: `test.skip()` with message "no wp-menu-separator in wp-env — fixture needed; see 11-03 notes" (never passes vacuously)
- When separators exist: captures child-indices before move, performs keyboard reorder via Alt+ArrowDown across a separator boundary, asserts separator indices are identical after the move
- Guards no separator was pushed to the last position in `#adminmenu`

**BUG-07** (`test('BUG-07: modified badge renders inside .wp-menu-name for an item with a submenu')`):
- Selects Posts (has submenu), renames to 'Articles', awaits autosave
- Asserts `#menu-posts .wp-menu-name .maestro-modified-badge` is visible (descendant of `.wp-menu-name`, not just `<li>`)
- Asserts `#menu-posts .wp-menu-name .maestro-modified-sr` is attached
- Resets via reset-all + awaits navigation reload

### Task 2 — AdminBarTest.php (integration)

Created `tests/integration/AdminBarTest.php` with `class AdminBarTest extends WP_UnitTestCase` in `Maestro\Tests\Integration` namespace:

- `set_up()`: creates admin user, sets dashboard screen (`is_admin()` = true), unsets `maestro_edit`
- `tear_down()`: cleans `maestro_edit`, calls parent
- `render_toggle_node()` helper: constructs `WP_Admin_Bar`, instantiates `new Admin_Bar()` (hooks `node()` on `admin_bar_menu`), fires action, reads back node by id `maestro-toggle`

Four test methods encoding the UX-08b target contract:
1. `test_enter_label_contains_edit_menu()` — node.title contains 'Edit Menu' + 'dashicons-edit' (RED: current has 'Edit Admin Menu')
2. `test_exit_label_contains_exit()` — node.title contains 'Exit' + 'dashicons-exit', does NOT contain 'Exit Editor' (RED: current has 'Exit Editor')
3. `test_enter_meta_title_is_long_form()` — meta.title contains 'Edit Admin Menu' (a11y guard)
4. `test_exit_meta_title_is_long_form()` — meta.title contains 'Exit Editor' (a11y guard)

## Decisions Made

1. **AdminBarTest.php in `tests/integration/`**: `Admin_Bar::node()` calls `is_admin()`, `current_user_can()`, `capability()`, `is_edit_mode()`, `add_query_arg()`, and takes a `WP_Admin_Bar` instance. The unit bootstrap is WP-free by design, so these tests cannot run there. `LocalizationTest` asserts the JS i18n payload only — does not cover the PHP admin-bar strings.

2. **BUG-06 probe-first approach**: Rather than requiring a fixture for Wave 0, the test probes separator presence at runtime and skips (SKIPPED, not PASSED) if none found. Wave 1 (11-03) adds the fixture mu-plugin so the test actually exercises the separator-preservation behavior. A skipped BUG-06 test does NOT satisfy the phase.

3. **UX-08a selector-agnostic icon-only assertion**: The exact label-wrapper selector (`.ab-label` vs a maestro class) is unconfirmed until 11-02 implements it. The test uses `.ab-icon` visible + bounding-width <=60px as a proxy that works regardless of which wrapper selector 11-02 chooses. A `NOTE(11-02):` comment documents the selector contract.

4. **UX-08b meta.title guards**: Tests 3 and 4 ensure the compact visible labels ('Edit Menu'/'Exit') don't accidentally drop the long-form accessible strings from `meta.title`. These tests are green against current code (current `meta.title` is 'Toggle in-place admin menu editing' — actually a different string; 11-02 must set these long forms in `meta.title` as part of the UX-08b change).

## Deviations from Plan

None — plan executed exactly as written. The one documented plan decision (AdminBarTest as integration vs unit) was pre-resolved in the plan text itself and executed as specified.

## Verification Results

- `playwright test --list | grep -E "UX-08a|BUG-06|BUG-07"` — 3 tests found at lines 858, 894, 977
- `php -l tests/integration/AdminBarTest.php` — No syntax errors
- Existing L301 (`modified indicator`) and L355 (`keyboard-only reorder`) baselines unmodified
- No production source files touched (maestro.js, maestro.css, class-admin-bar.php)

## Wave 0 Status

All four Wave 0 gaps from VALIDATION.md are closed:
- [x] UX-08a e2e guard in editor.spec.ts (red — no CSS override yet)
- [x] BUG-06 e2e guard in editor.spec.ts (skips if no separators, fails if they exist)
- [x] BUG-07 e2e guard in editor.spec.ts (red — badge appends to `<li>` not `.wp-menu-name`)
- [x] UX-08b integration guard in AdminBarTest.php (red — visible labels not yet compact)

`nyquist_compliant: true` — Wave 1 (11-02, 11-03) has a pre-existing automated check for every requirement before any production code changes.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| tests/e2e/editor.spec.ts | FOUND |
| tests/integration/AdminBarTest.php | FOUND |
| 11-01-SUMMARY.md | FOUND |
| Commit 24bf00f (Task 1) | FOUND |
| Commit 8c7f749 (Task 2) | FOUND |
