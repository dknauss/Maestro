---
phase: 11-editor-entry-reorder-fixes
plan: 07
subsystem: editor-js/css
tags: [gap-closure, a11y, reorder, mobile, tdd-green, wcag]

# Dependency graph
requires:
  - phase: 11-editor-entry-reorder-fixes
    plan: 05
    provides: "de-cheated control-driven reorder RED guard (button.maestro-move-down)"
  - phase: 11-editor-entry-reorder-fixes
    plan: 06
    provides: "always-loaded maestro-admin-bar.css (UX-08a Gap 1)"
provides:
  - "button.maestro-move-up / button.maestro-move-down: OS-independent ▲/▼ reorder (Gap 3 / BUG-06)"
  - "icon-only panel button compression at <=600px with 44px tap-target floor (Gap 2 / UX-08b)"
  - "modified-badge bullet at 15px for legibility (Gap 4 / BUG-07 cosmetic)"
  - "iconButton() helper: all five secondary panel buttons carry aria-label + .maestro-btn-label (WCAG 4.1.2)"
  - "moveSelected(dir) shared reorder function: keydown path + button path unified"
affects: [11-08-plan]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "iconButton(btn, glyph, label) helper: aria-label + aria-hidden dashicon span + .maestro-btn-label span — used for all five secondary panel buttons"
    - "moveSelected(dir, opts) shared function: opts.restoreFocusToAnchor=true for keyboard path; omit for button path (button not detached by insertBefore)"
    - "@media (max-width:600px) icon-only compression: .maestro-btn-label { display:none } + button { min-width:44px; justify-content:center }"
    - "localize+test single-commit rule: moveUp/moveDown added to class-assets.php + LocalizationTest.php in same commit so integration never goes red mid-task"

key-files:
  created: []
  modified:
    - assets/maestro.js
    - assets/maestro.css
    - includes/class-assets.php
    - tests/integration/LocalizationTest.php

key-decisions:
  - "moveSelected(dir, opts) shared function: opts.restoreFocusToAnchor=true for keyboard path (insertBefore detaches focus); false/omit for button path (button lives in fixed toolbar, not detached)"
  - "aria-keyshortcuts dropped from selectItem and post-move announce — Alt+Arrow is macOS-broken, ▲/▼ buttons are the discoverable OS-independent affordance"
  - "Move buttons appended after rename input in DOM order (Tab: rename → ▲ → ▼ → Icon → Visibility → Reset Item)"
  - "iconButton() helper routes all five secondary buttons through one function to prevent label/glyph drift"
  - "@media (max-width:600px) is a NEW block separate from the 782px block — UAT specifies <=600px for icon-only; 782px block retains its min-height:44px floor"

requirements-completed: [BUG-06, UX-08b]

# Metrics
duration: ~24min
completed: 2026-06-22
---

# Phase 11 Plan 07: Gap Closure (Gaps 2, 3, 4) Summary

**OS-independent ▲/▼ panel reorder buttons via shared moveSelected(dir), icon-only compression at <=600px via iconButton() helper + CSS media block, and modified-badge bump to 15px — all three gap-closure items without regressing rename auto-focus, tap-target floor, or BUG-06/BUG-07 behavior.**

## Performance

- **Duration:** ~24 min
- **Started:** 2026-06-21T23:59:41Z
- **Completed:** 2026-06-22T00:23:26Z
- **Tasks:** 3 (all auto)
- **Files modified:** 4

## Accomplishments

- **Task 1 (Gap 3 / BUG-06):** Refactored the keydown reorder body into `moveSelected(dir, opts)` shared function. Built `button.maestro-move-up` / `button.maestro-move-down` in `buildToolbar()` via new `iconButton()` helper. Each button carries `aria-label` (I.moveUp / I.moveDown), an `aria-hidden` dashicon span, and a `.maestro-btn-label` text span. Button click calls `moveSelected(dir)` without `restoreFocusToAnchor` — focus stays on the button naturally (it lives in the fixed toolbar, not in `#adminmenu`). Keyboard path calls `moveSelected(dir, { restoreFocusToAnchor: true })` preserving prior focus-restoration behavior. Removed `aria-keyshortcuts` advertising macOS-broken `Alt+ArrowUp Alt+ArrowDown`. Added `moveUp` / `moveDown` i18n keys in `class-assets.php` + `LocalizationTest.php` in same commit (localize+test single-commit rule). Rename auto-focus-on-select preserved.

- **Task 2 (Gap 2 / UX-08b):** Added `@media screen and (max-width: 600px)` block hiding `.maestro-btn-label` and setting `button { min-width:44px; justify-content:center }`. Added `.maestro-panel button { display:inline-flex; align-items:center; gap:4px }` base rule for glyph+label alignment. The `iconButton()` helper from Task 1 already gave all five secondary buttons the required structure.

- **Task 3 (Gap 4 / BUG-07 cosmetic):** Changed `maestro-modified-badge` font-size from `10px` to `15px`. All other badge properties unchanged. BUG-07 placement e2e unaffected (DOM unchanged).

## Task Commits

1. **Task 1: ▲/▼ panel reorder buttons** — `bff7d7b`
2. **Task 2: icon-only compression at <=600px** — `5ffa795`
3. **Task 3: badge bump to 15px** — `16f80e3`

## Files Created/Modified

- `assets/maestro.js` — moveSelected(dir) refactor, iconButton() helper, button.maestro-move-up/down, aria-keyshortcuts removed (154 insertions, 70 deletions)
- `assets/maestro.css` — .maestro-panel button base rule, @media (max-width:600px) block, badge font-size 15px (31 insertions, 1 deletion)
- `includes/class-assets.php` — moveUp/moveDown i18n keys in wp_localize_script (4 insertions)
- `tests/integration/LocalizationTest.php` — moveUp/moveDown in expected_i18n_keys() (2 insertions)

## Decisions Made

- `opts.restoreFocusToAnchor` flag on `moveSelected`: keyboard path sets `true` (insertBefore detaches the anchor from focus); button path omits it (button in fixed toolbar is not detached)
- `aria-keyshortcuts` dropped entirely from `selectItem` — the ▲/▼ buttons are the OS-independent discoverable affordance; no accelerator is advertised (Alt+Arrow keyboard path is retained but undiscoverable, consistent with Phase 11 gap analysis)
- Move buttons positioned after rename input in panel DOM order so Tab order flows: rename → ▲ → ▼ → Icon → Visibility → Reset Item
- `iconButton()` helper routes all five secondary buttons through one code path to prevent icon/label drift across buttons

## Deviations from Plan

### Auto-fixed Issues

None — the plan's JS structure was followed precisely. The `iconButton()` helper was placed just before `buildToolbar()` as a top-level function, consistent with the file's function organization pattern.

**Note:** Task 2's JS changes (iconButton helper applied to all five buttons) were implemented in Task 1's commit since they were structurally coupled. Task 2's commit contains CSS-only changes. This is documented as a deviation in ordering but not in substance — all plan must_haves are satisfied.

## Issues Encountered

None. PHPStan required `--memory-limit=512M` (pre-existing infrastructure constraint — not caused by this plan's changes). phpcs and JS logic tests clean.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- 11-07 complete: Gaps 2, 3, 4 closed on branch `gsd/phase-11-gap-closure`
- 11-05 control-driven reorder RED guard should now be GREEN (button.maestro-move-down exists; focus on rename input after selectItem preserved; moveSelected reuses reorderMove + insertBefore path)
- 11-08 is the Wave 2 full-suite gate (Docker, sandbox-disabled): runs all e2e including the 11-05 guards; confirms zero regression

---
*Phase: 11-editor-entry-reorder-fixes*
*Completed: 2026-06-22*
