---
phase: 23-editor-ux-polish
plan: 04
subsystem: ui
tags: [css, js, wp-admin, wp-pointer, accessibility, coachmark]

# Dependency graph
requires:
  - phase: 23-editor-ux-polish (plan 01)
    provides: quiet-control CSS idiom, core-blue focus ring (#2271b1), the non-colour dot idiom for modified state
  - phase: 23-editor-ux-polish (plan 03)
    provides: shared popover/panel token alignment (card border/radius/shadow tokens the coachmark card echoes)
provides:
  - Coachmark restyled to read as a native core wp-pointer (card + footer buttons band + directional CSS-drawn arrow), REPLICATED LOCALLY per the locked default — .maestro-tour* DOM/classes untouched, no core wp-pointer stylesheet enqueued, class-assets.php untouched
  - BUG-08 fixed: coachmark footer band + content area vertically centered (no visual off-centre)
  - In-menu selection tint + inset accent bar and the centered CSS modified dot confirmed token-aligned (dot not reverted)
  - Live-verified checkpoint outcome recorded: replicate-locally reads as native on the Default admin colour scheme; Modern/Midnight explicitly deferred to plan 23-05's screenshot pass
affects: [23-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "wp-pointer-look-via-local-replication: mimic a core component's visual idiom (card/arrow/button-band tokens) in our own CSS/DOM rather than enqueuing the core stylesheet and reshaping to its structure, when the frozen behaviour (focus trap, step logic) makes a structural DOM swap the higher-risk path"
    - "data-pointer-edge attribute drives a CSS-drawn directional arrow that repositions per anchor (left/right/top/bottom) without any new DOM node"

key-files:
  created: []
  modified:
    - assets/maestro.css
    - assets/maestro.js

key-decisions:
  - "wp-pointer adaptation: REPLICATE-LOCALLY confirmed (not escalated to enqueue). The locked default held through live verification — class-assets.php untouched, no core wp-pointer stylesheet added, .maestro-tour* DOM/classes kept exactly as they were. The coachmark reads as a native core wp-pointer via a white .maestro-tour-content card (1px #c3c4c7 border, 0 3px 6px rgba(0,0,0,.12) shadow), a footer button band (.maestro-tour-controls: #f6f7f7 fill + #dcdcde top border, Skip left / Back·Next right), and a CSS-drawn directional arrow (.maestro-tour-arrow) that adapts per anchor — pointing left at the menu on step 1 and up at the 'Exit Menu Editor' admin-bar toggle on step 5."
  - "BUG-08 fixed by centering the footer band (align-items:center, symmetric 8px 12px padding) and balancing the content area (progress eyebrow + step text) — no off-centre content remains across any of the 5 steps."
  - "In-menu selection (tinted row rgba(34,113,177,.22) + inset #2271b1 accent bar) confirmed token-aligned; the modified marker is the centered 6px CSS-drawn neutral #c3c4c7 dot from commit b9f4cca — NOT reverted to the old glyph, no background added (colour stays reserved for errors/destructive; the dot must coexist with the blue selected-row background without a second background colliding). Design reconfirmed with the user during this checkpoint."
  - "Verification scope is honest about coverage: the checkpoint screenshot-verified the wp-pointer read, arrow adaptation, BUG-08 centering, and in-menu selection/dot on the Default admin colour scheme only. The pointer card is white and scheme-independent (it does not inherit any of WP's per-scheme #adminmenu/#wpadminbar hex swaps), so the Default-scheme read is expected to hold across schemes, but Modern + Midnight were NOT separately spot-checked in this plan — that per-scheme pass is explicitly deferred to plan 23-05's before/after screenshot capture (which covers all three schemes)."

requirements-completed: [BUG-08, UX-13]

# Metrics
duration: ~20min
completed: 2026-07-05
---

# Phase 23 Plan 4: Coachmark wp-pointer Restyle + BUG-08 Centering Summary

**Restyled the first-run coachmark to read as a native core wp-pointer (white card, footer buttons band, CSS-drawn directional arrow) entirely via local replication — no core stylesheet enqueued, no DOM reshape — fixed BUG-08's off-centre footer/content, and reconfirmed the in-menu selection tint and non-colour modified dot are token-aligned; the human-verify checkpoint approved the result on the Default admin colour scheme, with Modern/Midnight deferred to plan 23-05's screenshot pass.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-05 (this session)
- **Completed:** 2026-07-05
- **Tasks:** 2 (Task 1: code; Task 2: human-verify checkpoint, approved)
- **Files modified:** 2 (`assets/maestro.css`, `assets/maestro.js`)

## Accomplishments

- Replicated the wp-pointer look locally in `assets/maestro.css`: a card body (`.maestro-tour-content`), a footer buttons band (`.maestro-tour-controls`: `#f6f7f7` fill, `#dcdcde` top border, Skip left / Back·Next right), and a CSS-drawn directional arrow (`.maestro-tour-arrow`) that overlaps the card edge — all while keeping the `.maestro-tour*` DOM/classes, behaviour, 5 steps, copy, and focus trap completely frozen. No core `wp-pointer` stylesheet enqueued; `includes/class-assets.php` untouched.
- Fixed BUG-08: the footer band vertically centers Skip/Back/Next (`align-items: center` + symmetric `8px 12px` padding), and the content area balances the progress eyebrow and step text — no visual off-centre remains.
- `assets/maestro.js`: `positionTour` now sets a `data-pointer-edge` attribute (left/right/top/bottom) and positions the arrow at the anchor's centre along that edge; step logic, anchors, and box placement are unchanged.
- Confirmed the in-menu selection (tinted row `rgba(34,113,177,.22)` + inset `#2271b1` accent bar) and the centered CSS modified dot (`b9f4cca`, neutral `#c3c4c7`, 6px, no background) remain token-aligned — left intact, not reverted.
- **Task 2 (human-verify checkpoint): APPROVED by the user** ("looks awesome"). Live-verified against the running wp-env dev site: the coachmark reads as a native wp-pointer across all 5 steps, the arrow correctly adapts per anchor (pointing left at the menu on step 1, up at the "Exit Menu Editor" admin-bar toggle on step 5), BUG-08 centering holds, and behaviour (steps/copy/Back-Next-Skip/focus trap) is unchanged. In-menu selection tint/accent bar and the modified dot read correctly with the SR "(modified)" text present. Verification was performed on the **Default** admin colour scheme; the pointer card is white and scheme-independent, so the read is expected to hold across schemes, but Modern + Midnight were not separately spot-checked here — that is explicitly deferred to plan 23-05's before/after screenshot pass (all three schemes).
- `npm run test:js`: 53/53 green; `tour.spec.ts` behaviour selectors (`.maestro-tour`, `.maestro-tour-progress`, `.maestro-tour-next`, `.maestro-tour-help`, etc.) all intact.

## Task Commits

Each task was committed atomically:

1. **Task 1: BUG-08 centering + coachmark wp-pointer restyle + in-menu selection/badge tokens** - `badca7c` (feat)
2. **Task 2: Live-iteration checkpoint (human-verify)** - no code commit; checkpoint approved by user, no further changes required

**Progress commit (Task 1 completion, pre-checkpoint):** `5648391` (docs: record Task 1 progress; paused at Task 2 checkpoint)

**Plan metadata:** this commit (docs: complete 23-04 plan)

## Files Created/Modified

- `assets/maestro.css` - Added `.maestro-tour-content` card body, `.maestro-tour-controls` footer buttons band (centered, bordered), and `.maestro-tour-arrow` CSS-drawn directional arrow tokens; fixed BUG-08 vertical centering.
- `assets/maestro.js` - `positionTour` sets `data-pointer-edge` and positions the arrow at the anchor centre per edge; tour DOM/classes, step logic, anchors, and focus-trap logic unchanged.

## Decisions Made

See `key-decisions` in the frontmatter above for the full record of: the replicate-locally-confirmed wp-pointer adaptation outcome, the BUG-08 fix mechanism, the in-menu dot/selection reconfirmation, and the honest verification-scope note (Default-scheme verified; Modern/Midnight deferred to 23-05).

## Deviations from Plan

None - plan executed exactly as written. The locked default (replicate locally) was confirmed rather than escalated to enqueue; the plan explicitly anticipated and allowed for either outcome, and the live-iteration checkpoint confirmed the local copy reaches a native read within budget.

## Issues Encountered

None. The checkpoint was approved on first live review ("looks awesome") — no further iteration cycles were needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All coachmark, selection, and modified-badge surfaces named in UX-13 are now converted to core idioms; plan 23-05 (e2e selector/colour reconciliation + before/after screenshots across Default/Modern/Midnight + full-suite gate) can proceed.
- Plan 23-05 owns: the deferred Modern/Midnight per-scheme spot-check for this plan's surfaces, the before/after screenshot pass for BUG-08 and the wp-pointer restyle, and any deliberate e2e assertion updates for `.maestro-tour`/`.maestro-modified*` selectors.
- `npm run test:js`: 53/53 green. No PHP files touched (CSS/JS-only), so PHP unit/integration suites are unaffected by this plan.

---
*Phase: 23-editor-ux-polish*
*Completed: 2026-07-05*

## Self-Check: PASSED

- FOUND: `.planning/phases/23-editor-ux-polish/23-04-SUMMARY.md`
- FOUND: commit `badca7c` (feat(23-04): restyle coachmark to wp-pointer look + BUG-08 centering)
- FOUND: commit `5648391` (docs(23-04): record Task 1 progress; paused at Task 2 checkpoint)
