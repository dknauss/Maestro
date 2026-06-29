---
phase: 11-editor-entry-reorder-fixes
verified: 2026-06-22T00:00:00Z
status: passed
score: 10/10 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 5/5
  gaps_closed:
    - "UX-08a enter-state toggle reachable on mobile (maestro-admin-bar.css always-loaded before is_edit_mode() return)"
    - "OS-independent panel reorder buttons via moveSelected(dir) shared function wired to reorderMove/insertBefore"
    - "Toolbar icon-only compression at <=600px with 44px tap-target floor and WCAG 4.1.2 aria-labels"
    - "Modified badge legible at 15px (was 10px)"
    - "Corrected e2e guards (enter-state UX-08a + control-driven reorder) flipped GREEN at Wave 2 gate"
    - "Enter-state screenshots ux-08a-enter-782.png and ux-08a-enter-600.png captured (valid PNGs)"
  gaps_remaining: []
  regressions: []
---

# Phase 11: editor-entry-reorder-fixes Verification Report (Gap Closure 11-05...11-08)

**Phase Goal:** The editor is reachable and compact on mobile, keyboard reorder preserves separators, and the modified-state badge sits on the changed row — closing the mobile-access gap and two visual defects surfaced by the bot-review audit; PLUS the 4 UAT defects found after ship (gap closure): mobile ENTER toggle reachable, OS-independent reorder affordance, toolbar fits at <=600px, badge legible.
**Verified:** 2026-06-22
**Status:** PASSED
**Re-verification:** Yes — gap-closure round covering plans 11-05...11-08 (builds on initial 11-01...11-04 verification)

---

## Goal Achievement

### Observable Truths (Gap Closure Round — Plans 11-05...11-08)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `assets/maestro-admin-bar.css` exists with the `@media (max-width:782px)` override for `#wpadminbar li#wp-admin-bar-maestro-toggle { display:block }` and `.maestro-ab-label { display:none }` | VERIFIED | File is 9 lines; lines 7-8 contain the correct selectors; specificity (0,2,1); no !important |
| 2 | `includes/class-assets.php` enqueues `maestro-admin-bar` with `dashicons` dependency BEFORE the `is_edit_mode()` early return | VERIFIED | `wp_enqueue_style('maestro-admin-bar', …, array('dashicons'), MAESTRO_VERSION)` at lines 57-62; `if (!is_edit_mode()) return;` guard at line 64 — enqueue unconditionally precedes the gate |
| 3 | `assets/maestro.js` has `function moveSelected(dir, opts)` factoring out the reorder body, calling `window.maestroLogic.reorderMove` + `parentUl.insertBefore` (separator-preserving path, BUG-06) | VERIFIED | `function moveSelected` at line 282; `reorderMove(currentSlugs, selectedSlug, dir)` at line 308; single-node `insertBefore` at lines 331 and 334 |
| 4 | `button.maestro-move-up` and `button.maestro-move-down` are built in `buildToolbar()`, each carrying `aria-label` (I.moveUp / I.moveDown) and a `.maestro-btn-label` span via `iconButton()` | VERIFIED | Lines 476-490: `el('button','button maestro-move-up')` at 476; `iconButton(moveUp,'dashicons-arrow-up-alt2',I.moveUp)` at 478; analogous `moveDown` at 484-490 |
| 5 | All five secondary panel buttons (iconBtn, visBtn, resetItemBtn, moveUp, moveDown) are routed through `iconButton()` — each carrying `aria-label` + aria-hidden dashicon span + `.maestro-btn-label` span (WCAG 4.1.2) | VERIFIED | Lines 478, 486, 494, 502, 510 all invoke `iconButton()`; helper defined at line 405 sets `aria-label`, appends aria-hidden dashicon span, appends `.maestro-btn-label` span |
| 6 | `assets/maestro.css` has a `@media screen and (max-width: 600px)` block hiding `.maestro-btn-label` and setting `button { min-width:44px; justify-content:center }` (UX-08b toolbar fit) | VERIFIED | Block at lines 535-544; `.maestro-toolbar .maestro-panel button .maestro-btn-label { display: none; }` at line 537; `min-width: 44px; justify-content: center` at lines 541-542 |
| 7 | Modified badge `font-size` is 14-16px (Gap 4 / BUG-07 cosmetic) | VERIFIED | `font-size: 15px;` at maestro.css line 84 within `.maestro-editing #adminmenu .maestro-modified-badge`; comment confirms "bumped from 10px" |
| 8 | The `wp-admin-bar-maestro-toggle` override is absent from `assets/maestro.css` (single source of truth in maestro-admin-bar.css) | VERIFIED | `grep "wp-admin-bar-maestro-toggle" assets/maestro.css` returns no output |
| 9 | Enter-state screenshots `ux-08a-enter-782.png` and `ux-08a-enter-600.png` exist as valid PNG images at correct viewport dimensions | VERIFIED | `file` command confirms: `ux-08a-enter-782.png: PNG image data, 782 x 800, 8-bit/color RGB`; `ux-08a-enter-600.png: PNG image data, 600 x 800, 8-bit/color RGB` |
| 10 | No SUMMARY file among 11-05...11-08 contains "Self-Check: FAILED"; all four report successful completion | VERIFIED | All four summaries read in full; none contain the phrase; each reports green gate counts |

**Score: 10/10 truths verified**

---

### Required Artifacts (Gap Closure Plans)

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `assets/maestro-admin-bar.css` | <=782px admin-bar toggle display:block + icon-only override, always loaded | VERIFIED | Exists, correct content, correct selectors, no editor-specific CSS included |
| `includes/class-assets.php` | Unconditional enqueue before is_edit_mode() return; moveUp/moveDown i18n keys | VERIFIED | Enqueue at lines 57-62 precedes guard at line 64; `'moveUp'` at line 132, `'moveDown'` at line 134 in i18n map |
| `assets/maestro.js` | moveUp/moveDown panel buttons + moveSelected(dir) shared function + iconButton() helper; aria-keyshortcuts dropped | VERIFIED | 15 pattern matches across maestro-move-up/down, iconButton, maestro-btn-label, moveSelected; `aria-keyshortcuts` removed from selectItem (line 370 removes it) and no longer set on move |
| `assets/maestro.css` | <=600px icon-only block + badge font-size 15px | VERIFIED | @media (max-width:600px) block at lines 535-544; font-size:15px at line 84 |
| `tests/e2e/editor.spec.ts` | Enter-state UX-08a test (no maestro_edit, 782+600px) + de-cheated control-driven reorder test | VERIFIED | Enter-state test at line 903 (description: "non-edit state"); reorder test at line 355 ("control-driven, OS-independent"); rename-input `toBeFocused()` at line 376; `button.maestro-move-down` selector at line 381; no Alt+ArrowDown in L355-414 range |
| `tests/integration/LocalizationTest.php` | moveUp/moveDown in expected i18n keys | VERIFIED | Lines 76-77 contain `'moveUp'` and `'moveDown'` in the expected keys array |
| `screenshots/ux-08a-enter-782.png` | Regenerable proof the ENTER toggle is icon-only at 782px | VERIFIED | Valid PNG, 782x800 |
| `screenshots/ux-08a-enter-600.png` | Regenerable proof the ENTER toggle is icon-only at 600px | VERIFIED | Valid PNG, 600x800 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `class-assets.php::enqueue()` | `assets/maestro-admin-bar.css` | `wp_enqueue_style('maestro-admin-bar', …, array('dashicons'))` ABOVE `is_edit_mode()` return | WIRED | Lines 57-62 confirmed before line 64 guard — not conditional on edit mode |
| `assets/maestro.js` move buttons | `window.maestroLogic.reorderMove + parentUl.insertBefore` | `moveSelected(dir)` called by button click handlers at lines 481 and 489 | WIRED | Button clicks at 481/489 call `moveSelected('up'/'down')`; `moveSelected` calls `reorderMove` at 308 and `insertBefore` at 331/334 |
| `assets/maestro.css @media (max-width:600px)` | `.maestro-panel button .maestro-btn-label` | `display:none` hides label span; `min-width:44px` keeps tap target | WIRED | Selector `.maestro-toolbar .maestro-panel button .maestro-btn-label { display: none; }` at line 537 |
| `tests/e2e/editor.spec.ts` enter-state test | `#wp-admin-bar-maestro-toggle` | `page.goto('/wp-admin/index.php')` with NO query params + `toBeVisible()` | WIRED | Line 907: `page.goto('/wp-admin/index.php')` (no maestro_edit); line 910: `toBeVisible()`; line 918-923: boundingBox width <= 60 |
| `tests/e2e/editor.spec.ts` reorder test | `button.maestro-move-down` | rename-input focus asserted; L373-374 cheat deleted; `moveDown.click()` | WIRED | Line 376: `.maestro-rename-input toBeFocused()`; line 381: `page.locator('…button.maestro-move-down')`; lines 387/394: `moveDown.click()` — no re-focus cheat, no Alt+Arrow |

---

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| UX-08a | 11-05, 11-06, 11-08 | Editor ENTER toggle visible and icon-only at <=782px in non-edit state | SATISFIED | maestro-admin-bar.css always-loaded; e2e navigates /wp-admin/index.php (no maestro_edit) at 782+600px and asserts toBeVisible + boundingBox.width <= 60; screenshots captured; Wave 2 gate: 32/32 e2e passed |
| UX-08b | 11-07, 11-08 | Toolbar fits at <=600px — panel buttons collapse to icon-only with 44px tap targets | SATISFIED | @media (max-width:600px) block in maestro.css; iconButton() gives all five secondary buttons aria-label + .maestro-btn-label; min-width:44px at <=600px; 44px tap-target e2e (editor.spec.ts:1008) still green |
| BUG-06 | 11-05, 11-07, 11-08 | Keyboard reorder preserves separators; OS-independent reorder affordance delivered | SATISFIED | moveSelected(dir) reuses reorderMove + single-node insertBefore (separator-preserving path from 11-03); button.maestro-move-up/down in panel Tab-reachable from rename input; e2e drives button clicks and asserts two-step move + persistence + separator baseline |
| BUG-07 | 11-07, 11-08 | Modified badge legible (bumped to 14-16px) | SATISFIED | font-size: 15px in maestro.css line 84; DOM position (on .wp-menu-name from 11-03) unchanged; BUG-07 placement e2e still green |

Note: REQUIREMENTS.md uses `UX-08` as the canonical ID (with sub-items a and b described inline); the plan frontmatter splits these as `UX-08a`/`UX-08b`. The canonical entry is marked Complete in the v1.2 traceability table. No orphaned requirement IDs found.

---

### HARD-03 Race(b) Hardening Confirmation

Commit `2eb2a2d` hardened (not weakened) the `save-race.spec.ts` race(b) test after 11-07's enlarged flex-wrap toolbar caused Playwright click-delivery fragility:

- The test still waits for and asserts a DELETE response (line 236: `await deleteDone`).
- The test still asserts the rename did NOT persist after reload (lines 243-244: `toContainText('Posts')` and `not.toContainText('ArticlesRaceB')`).
- The only structural change: the rename is committed (blur) before clicking Reset All, so the flex-wrap toolbar settles to its final layout before the synthetic click. This makes click delivery deterministic without affecting the race scenario under test.
- A genuine reset-loses regression (rename persisting after Reset All) would still fail the no-persist assertions. The test is not masked.

---

### Anti-Patterns Found

No blockers or warnings in any gap-closure file.

Apparent "placeholder" matches in maestro.js and maestro.css are all legitimate:
- `.ui-sortable-placeholder` — jQuery UI sortable visual affordance (correct use)
- `rename.placeholder = I.renamePlaceholder` — standard HTML input placeholder attribute
- `::placeholder` — CSS pseudo-element for input placeholder styling

No TODO/FIXME/XXX/HACK in any of the gap-closure files (`maestro-admin-bar.css`, `maestro.js` gap-closure sections, `maestro.css` new blocks, `class-assets.php` enqueue addition, `editor.spec.ts` new/converted tests).

---

### Human Verification Required

The following items cannot be verified from source inspection alone. The Wave 2 gate (Docker suite, sandbox-disabled, JS 53/53, PHP 37/37, e2e 32 passed / 4 capture-skipped / 0 failed) was confirmed green per 11-08 SUMMARY and established session context. These are noted for completeness only.

1. **Mobile admin-bar visual appearance (enter state)**
   - Test: Open the WP admin on a real phone or browser resized to 375px in the non-edit state; confirm the Maestro "Edit Menu" toggle is visible and shows only the dashicon (no text label).
   - Expected: Toggle visible, dashicon only, no horizontal overflow.
   - Why human: Visual rendering on real device; the committed enter-state PNGs provide photographic evidence but a live check at narrow widths is the definitive test.

2. **Toolbar icon-only layout at <=600px with item selected**
   - Test: Resize browser to <=600px, click a menu item, confirm all panel buttons show only dashicons (no text), toolbar fits without horizontal scroll, buttons are at least 44px wide.
   - Expected: No overflow, all controls accessible and tap-target compliant.
   - Why human: Visual layout and overflow behavior.

3. **Modified badge legibility at 15px**
   - Test: In edit mode, modify a menu item; confirm the bullet marker next to the row label is visibly larger than before (was 10px, now 15px) and reads at a glance.
   - Expected: Bullet is clearly visible without zooming in.
   - Why human: Perceptual legibility judgment.

---

### Gaps Summary

No gaps. All 10 must-haves from plans 11-05 through 11-08 are satisfied in the actual codebase. All four gap-closure requirement IDs (UX-08a, UX-08b, BUG-06, BUG-07) are implemented, covered by the corrected e2e guards, and confirmed green at the Wave 2 zero-regression gate (JS 53/53, PHP integration 37/37, Playwright e2e 32/32 non-capture tests, 4/4 screenshot captures).

---

_Verified: 2026-06-22_
_Verifier: Claude Sonnet 4.6 (gsd-verifier)_
