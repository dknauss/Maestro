---
phase: 11-editor-entry-reorder-fixes
plan: "03"
subsystem: ui
tags: [bug-fix, dom, keyboard-reorder, modified-indicator, separator, maestro.js]

requires:
  - phase: 11-editor-entry-reorder-fixes/11-01
    provides: wave-0-guards, bug-06-e2e, bug-07-e2e
provides:
  - bug-06-fix: single-node insertBefore DOM move preserving separators
  - bug-07-fix: modified badge appended to label target not <li>
affects: [11-04]

tech-stack:
  added: []
  patterns:
    - "insertBefore(node, null) == appendChild — no-op null-sibling case is handled implicitly"
    - "labelTarget pattern mirrors updateMenuLabel(): .wp-menu-name for top-level, anchor <a> for submenu"

key-files:
  created: []
  modified:
    - assets/maestro.js

key-decisions:
  - "BUG-06: single-node insertBefore keyed off dir and maestroChildren index; no new helper needed (pure DOM glue, not expect(fn(in)).toBe(out) extractable)"
  - "BUG-06: maestroChildren snapshot taken before move so currentIdx reflects pre-move DOM order"
  - "BUG-07: removal code stays li.querySelector() — badge is still a descendant of <li>, so li-scoped cleanup still finds it after the target change"
  - "BUG-07: no CSS change needed; inline margin-left/vertical-align already renders correctly inside .wp-menu-name"

requirements-completed: [BUG-06, BUG-07]

duration: ~8min
completed: 2026-06-21
---

# Phase 11 Plan 03: BUG-06 + BUG-07 DOM Fixes Summary

**Single-node `insertBefore` replaces full-set appendChild loop (BUG-06) and modified badge appended to `.wp-menu-name`/anchor instead of `<li>` (BUG-07), both in `assets/maestro.js`**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-21T21:22:00Z
- **Completed:** 2026-06-21T21:30:09Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- BUG-06: keyboard reorder (Alt+Arrow) now moves only the selected node by one position; `li.wp-menu-separator` and all other non-`maestro-item` children stay physically in place
- BUG-07: modified badge (bullet glyph + screen-reader "(modified)" span) now appends to `.wp-menu-name` for top-level items or the anchor `<a>` for submenu items — badge sits inline beside the label name, not after `<ul.wp-submenu>`
- Zero regressions: JS logic suite stays 53/53 after each commit

## Task Commits

Each task was committed atomically:

1. **Task 1: BUG-06 — single-node insertBefore DOM move** - `5c16c97` (fix)
2. **Task 2: BUG-07 — append modified badge to the row label** - `9f1ac8a` (fix)

## Files Created/Modified

- `assets/maestro.js` - Two contained DOM-application fixes in `refreshModifiedIndicator()` (L89) and the Alt+Arrow keydown handler's DOM-apply step (L289)

## Decisions Made

1. **BUG-06 single-node move keyed off `dir`:** Rather than replaying `newOrder` (which re-appends all maestro items past any separator), snapshot `maestroChildren` (ordered by current DOM position before the move), read `currentIdx`, then `insertBefore(selectedNode, maestroChildren[currentIdx-1])` for up or `insertBefore(selectedNode, afterNode.nextSibling)` for down. `nextSibling === null` gives appendChild semantics for the last-position edge case — no special case needed.

2. **`liForSlug` replaces `slugToNode` map:** The old code built a full `{slug -> node}` map to get the one selected node. `liForSlug(selectedSlug)` (existing helper, L69) is equivalent and simpler; no map needed.

3. **BUG-07 removal code unchanged:** The existing cleanup at L116-120 uses `li.querySelector('.maestro-modified-badge')`. After the fix the badge is a child of `labelTarget` which is a descendant of `li`, so `li.querySelector()` still finds it. Both the new dedup guard (`labelTarget.querySelector(...)`) and the removal (`li.querySelector(...)`) agree — no double-inject risk.

4. **No CSS change for BUG-07:** `.maestro-modified-badge` already uses `margin-left:4px; vertical-align:middle` (maestro.css L82-90), which renders correctly inline inside `.wp-menu-name`. `maestro.css` is owned by 11-02 and left untouched.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `assets/maestro.js` BUG-06 and BUG-07 fixes are committed on `gsd/phase-11-editor-entry-reorder-fixes`
- Wave gate (11-04) runs the full Playwright e2e suite sandbox-disabled; BUG-06 e2e (separator child-index assertion) and BUG-07 e2e (`#menu-posts .wp-menu-name .maestro-modified-badge` visible) should now pass
- BUG-06 e2e still requires the separator fixture (mu-plugin) noted in 11-01 SUMMARY — if `wp-env` still has zero separators the test will skip; confirm fixture is registered before declaring green

---
*Phase: 11-editor-entry-reorder-fixes*
*Completed: 2026-06-21*
