---
phase: 09-editor-ux-polish
plan: "05"
subsystem: ui
tags: [css, mobile, responsive, wcag, tap-target, e2e, density]

# Dependency graph
requires:
  - phase: 09-editor-ux-polish/02
    provides: toolbar structure + split mode-indicator post-status-split
  - phase: 09-editor-ux-polish/03
    provides: first-run cue + dismiss() cleanup
  - phase: 09-editor-ux-polish/04
    provides: rename input rebuild with id="maestro-rename-field"
provides:
  - "@media (max-width:782px) density rules: .maestro-toolbar gap/padding, .button padding 4px 8px + font-size 12px, .maestro-rename-input padding 0 6px + font-size 12px"
  - "min-height:44px floor on .maestro-toolbar .button and .maestro-rename-input at <=782px (WCAG 2.5.5 AAA)"
  - "e2e boundingBox().height >= 44 assertion for every toolbar button + rename input at 700px viewport"
  - "700px density screenshot (toolbar-700.png) approved — no structural restructure needed"
affects: [09-06, 09-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "min-height (not height) for tap-target floors — content sets real height, 44px is a floor not a cap"
    - "Density-first mobile pass — shrink padding/font inside existing flex-wrap; restructure only if screenshot demands it"
    - "e2e tap-target gate via boundingBox().height — pixel-proof, viewport-locked assertion"
    - "Full-suite gate at wave boundary to catch regressions when per-task e2e is sandbox-blocked"

key-files:
  created: []
  modified:
    - assets/maestro.css
    - tests/e2e/editor.spec.ts

key-decisions:
  - "Density-first honored: 700px screenshot reviewed and APPROVED by user — no toolbar restructure needed. The existing flex-wrap (BUG-03) plus denser sizing fits without overflow"
  - "44px min-height floor is fixed (WCAG 2.5.5 AAA, locked in 09-RESEARCH.md); padding/font values (4px 8px / 12px) are planner-recommended starting values per research"
  - "Rename-input specificity bump (.maestro-toolbar .maestro-rename-input in the media block) required to override the broader .maestro-rename-input rule — caught by the full-suite gate"
  - "e2e couldn't run per-task (sandbox/Docker restriction); full-suite gate at wave boundary is the correct mitigation — recommend running e2e at wave boundaries going forward, not per-plan"

patterns-established:
  - "Specificity discipline in media queries: use .maestro-toolbar .child selectors to override base rules when a media-query scoped rule needs to win"
  - "Wave-boundary e2e gate: when per-task e2e is blocked (Docker/sandbox), run the full Playwright suite once at the end of the wave; document regressions in the closing plan's SUMMARY"

requirements-completed: [UX-07]

# Metrics
duration: ~60min (spread across executor + orchestrator regression gate)
completed: 2026-06-19
---

# Phase 9 Plan 05: Mobile Density + 44px Tap-Target Floor Summary

**Denser toolbar controls at <=782px (padding/font reduction + min-height:44px floor) with e2e bounding-box proof; 700px screenshot reviewed and approved — no structural restructure needed**

## Performance

- **Duration:** ~60 min (implementation + human checkpoint + regression fixes)
- **Started:** 2026-06-19
- **Completed:** 2026-06-19
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 2

## Accomplishments

- Extended the `@media (max-width:782px)` block in `assets/maestro.css` with density rules: `.maestro-toolbar` gap/padding reduction; `.maestro-toolbar .button` padding 4px 8px + font-size 12px + min-height 44px; `.maestro-rename-input` padding 0 6px + font-size 12px + min-height 44px
- Added a Playwright e2e assertion in `editor.spec.ts` that checks `boundingBox().height >= 44` for every `.maestro-toolbar .button` and the `.maestro-rename-input` at a 700px viewport with the panel open; existing 700px no-overflow and no-overlap guards are preserved
- Captured a 700px density screenshot (`toolbar-700.png` and `toolbar-1200.png` at `.planning/phases/09-editor-ux-polish/screenshots/`); user reviewed and **approved density-only** — no restructure warranted
- Repaired two regression categories caught by the full-suite gate: (1) the toolbar e2e was asserting the transient `.maestro-mode-label` text which disappeared after the 09-02 status split — fixed to assert the persistent mode label; (2) the rename-input 44px assertion was failing because the base rule had higher specificity than the media-query rule — fixed by adding `.maestro-toolbar` to the selector in the media block

## Task Commits

1. **Task 1: Density + 44px tap-target floor CSS** — `3012677` (style)
2. **Task 2: e2e >=44px tap-target assertion** — `2e58803` (test)
3. **Task 3 (checkpoint): 700px screenshot + mode-label e2e assertion fix** — `38323c4` (fix)
4. **Post-checkpoint regression fixes (full-suite gate)** — `927b682` (fix) — UX-07 rename-input specificity + two `.maestro-status` idle visibility regressions

## Files Created/Modified

- `assets/maestro.css` — Added density rules inside the `@media (max-width:782px)` block: toolbar gap/padding, button padding/font/min-height, rename-input padding/font/min-height; specificity fix (`.maestro-toolbar .maestro-rename-input`) to override the base rule
- `tests/e2e/editor.spec.ts` — Added `>=44px tap-target` bounding-box assertion; fixed mode-label assertion to use the persistent label (not the transient save-status span); fixed idle visibility assertion for `.maestro-status`

## Decisions Made

- **Density-first checkpoint approved:** User reviewed the 700px screenshot and found the toolbar reads well with density alone. No structural restructure (stacked rows, overflow grouping) is needed. The flex-wrap from BUG-03 handles edge overflow; dense sizing makes each row shorter so the wrap threshold is rarely hit.
- **44px floor fixed:** `min-height: 44px` (not `height`) so real content can grow beyond 44px; the floor is WCAG 2.5.5 AAA (44px) rather than 2.5.8 AA (24px) per the locked research decision.
- **Specificity rule:** When a `@media` block needs to override a base rule on the same element, scope with the parent selector — `.maestro-toolbar .maestro-rename-input` wins over `.maestro-rename-input` without needing `!important`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Toolbar e2e asserting transient mode-label span (post-09-02 status split)**

- **Found during:** Task 3 (700px screenshot step / full-suite gate)
- **Issue:** After the 09-02 status split, `.maestro-mode-label` is a transient span that only appears during save-state transitions; the e2e assertion was checking it as the persistent mode indicator, causing false failures
- **Fix:** Updated the assertion to check the persistent mode-indicator element rather than the transient save-status span
- **Files modified:** `tests/e2e/editor.spec.ts`
- **Verification:** Full e2e suite (24/24) green
- **Committed in:** `38323c4`

**2. [Rule 1 - Bug] Rename-input min-height:44px overridden by higher-specificity base rule**

- **Found during:** Full-suite gate (sandbox-disabled run after checkpoint)
- **Issue:** The base `.maestro-rename-input` rule has higher specificity than the media-query-scoped `.maestro-rename-input` rule, so the 44px floor was silently not applying and the e2e boundingBox assertion was failing on the rename input
- **Fix:** Changed the media-query selector from `.maestro-rename-input` to `.maestro-toolbar .maestro-rename-input` to win the specificity contest without `!important`
- **Files modified:** `assets/maestro.css`
- **Verification:** e2e 44px assertion passes for rename input; full suite 24/24 green
- **Committed in:** `927b682`

**3. [Rule 1 - Bug] `.maestro-status` idle visibility assertions failing**

- **Found during:** Full-suite gate (same run as fix 2)
- **Issue:** Two e2e tests asserting `.maestro-status` idle visibility were failing due to a selector/state mismatch introduced after the 09-02 status restructure
- **Fix:** Corrected the idle-state visibility assertion to match the actual DOM state post-09-02
- **Files modified:** `tests/e2e/editor.spec.ts`
- **Verification:** Full e2e suite (24/24) green
- **Committed in:** `927b682`

---

**Total deviations:** 3 auto-fixed (all Rule 1 — regression bugs from prior phase restructures, caught by the full-suite gate)
**Impact on plan:** All three fixes were necessary for the full test suite to pass. No scope creep — all fixes are directly related to the 09-05 CSS and e2e changes interacting with the 09-02 status split.

## Issues Encountered

- **e2e blocked per-task (sandbox/Docker):** The per-task executor cannot run `npm run test:e2e` because Docker is unavailable in the sandbox environment. This meant regressions introduced by the 09-05 e2e assertions weren't caught until the orchestrator ran the full suite with sandbox disabled. The checkpoint in Task 3 also served as the e2e gate point. **Recommendation:** Run the full Playwright suite at wave boundaries (e.g. after Plan 05 before Plan 06), not per-plan, when per-task e2e is blocked by the environment.
- **Checkpoint artifact location:** The plan spec's `toolbar-700-before.png`/`toolbar-700-after.png` naming was simplified to `toolbar-700.png` and `toolbar-1200.png` in the actual screenshots directory — both are present and served the checkpoint review purpose.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- UX-07 is complete: density CSS in place, 44px floor enforced by both CSS and e2e, screenshot reviewed and approved.
- All three suite layers are green (PHP unit 44/44, integration 29/29, e2e 24/24).
- Ready for Plan 06: zero-regression gate (full suite + Plugin Check) and flip UX-03/04/07 traceability to Complete.

---
*Phase: 09-editor-ux-polish*
*Completed: 2026-06-19*
