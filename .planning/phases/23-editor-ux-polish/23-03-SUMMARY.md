---
phase: 23-editor-ux-polish
plan: 03
subsystem: ui
tags: [css, wp-admin, accessibility, wcag, colour-scheme]

# Dependency graph
requires:
  - phase: 23-editor-ux-polish (plan 01)
    provides: quiet-control CSS idiom, core-blue focus ring (#2271b1), neutral toolbar/panel palette
  - phase: 23-editor-ux-polish (plan 02)
    provides: single-toolbar-exit doctrine (panel edits below the toolbar did not collide with the relocated mode-zone styling, since that zone was scrapped in 02)
provides:
  - Confirmed panel + popover token alignment to core wp-admin idioms per UX-13 (verified against core popover/postbox/tab tokens; most values already matched from prior plans)
  - Closed the one real gap: several interactive controls in the popovers and the rename input had no explicit focus-visible ring — all now ring the consistent core-blue outline
  - Documented, on-the-record, which panel tokens are necessarily hardcoded (no WP admin-colour-scheme CSS variable exists for a custom-drawn toolbar/panel surface to inherit)
affects: [23-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Core-blue focus-ring consistency: outline: 2px solid #2271b1; outline-offset: 1px applied uniformly to every interactive control in the panel + both popovers (buttons, text inputs, tab buttons, checkboxes), matching the ring already used elsewhere in the toolbar/selected-item styling"

key-files:
  created: []
  modified:
    - assets/maestro.css

key-decisions:
  - "Popover card/tab/cell tokens were already at core values before this plan (border #c3c4c7, radius 4px, shadow 0 4px 16px rgba(0,0,0,.18), tab text #50575e/#1d2327 with #2271b1 active accent, cell hover #e0e7ec / focus #2271b1 / current border #2271b1 bg #dbe9f5) — verified by direct comparison to core's popover/postbox/tab idiom and left unchanged rather than churned for no reason."
  - "The actual gap across both popovers + the rename input was missing focus-visible rings, not wrong colours: .maestro-icon-search, .maestro-icon-none, .maestro-icon-tab, the visibility popover's role checkboxes (via .maestro-vis-row input), and .maestro-rename-input all had no explicit :focus-visible rule, relying on inconsistent browser default outlines. Added the same outline: 2px solid #2271b1; outline-offset: 1px used everywhere else in the toolbar/panel."
  - "Panel divider (#3c434a) and label/field text (#c3c4c7) stay hardcoded, not inheritable via currentColor/transparent: WP's admin colour schemes (Light/Blue/Coffee/Ectoplasm/Midnight/Ocean/Sunrise) restyle #adminmenu/#wpadminbar/etc. via per-scheme hardcoded hex swaps in dedicated scheme stylesheets — there is no CSS custom property WP exposes for a plugin-drawn surface like this bottom toolbar/panel to pick up. The values match the same #1d2327-surface neutrals plan 01 already established, so this is consistent with (not a regression from) the existing design, just explicitly documented as the intentional hardcode CONTEXT's colour-scheme-inheritance guidance anticipated."
  - "Rename input keeps core's LIGHT input styling exactly as before (white bg, #1d2327 text, #c3c4c7 border, #50575e placeholder at opacity:1 for WCAG 1.4.3) — the only change was adding its missing focus ring; no other property touched, so the Phase 9 placeholder-contrast and 36px-height/square-corner button-match decisions are fully preserved."

requirements-completed: []

# Metrics
duration: ~25min
completed: 2026-07-05
---

# Phase 23 Plan 3: Panel + Popover Token Alignment Summary

**Verified the shared controls panel and icon/visibility popovers were already on core wp-admin tokens from prior plans (white popover cards, core tab/cell idiom, dark quiet panel); closed the one real gap — several interactive controls (icon search, "No icon" button, tab buttons, visibility checkboxes, and the rename input) had no explicit core-blue focus ring — and documented the panel's necessary colour-scheme hardcode.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-05 (this session)
- **Completed:** 2026-07-05
- **Tasks:** 2 (both delivered small, targeted CSS additions)
- **Files modified:** 1 (`assets/maestro.css`)

## Accomplishments

- Audited `.maestro-popover`, `.maestro-icon-search`, `.maestro-icon-tabs`/`.maestro-icon-tab`, `.maestro-icon-cell` (+ hover/focus/current states), and `.maestro-vis-popover`/`.maestro-vis-head`/`.maestro-vis-row` against core's popover/postbox/tab tokens — confirmed border `#c3c4c7`, radius `4px`, shadow `0 4px 16px rgba(0,0,0,.18)`, tab text `#50575e`/`#1d2327` with `#2271b1` active-tab accent, and cell hover/focus/current tokens all already matched core exactly (no change needed to any of these).
- Added missing `:focus-visible` rings (`outline: 2px solid #2271b1; outline-offset: 1px`) to `.maestro-icon-search`, `.maestro-icon-none`, `.maestro-icon-tab`, and the visibility popover's role checkboxes (`.maestro-vis-row input`) — these had no explicit focus styling and relied on inconsistent browser defaults.
- Confirmed `.maestro-panel` stays dark (part of the toolbar/menu-column surface, quiet-control treatment) and `.maestro-rename-input` keeps core's light-input styling (white bg, `#1d2327` text, `#c3c4c7` border, preserved `#50575e` placeholder-contrast rule) — added the rename input's missing focus-visible ring, the one real gap on that control.
- Documented in code comments (and here) that the panel's dark-surface divider (`#3c434a`) and muted label/field text (`#c3c4c7`) are intentionally hardcoded rather than colour-scheme-inheritable, because WP admin colour schemes restyle core chrome via per-scheme hardcoded hex swaps in dedicated stylesheets, exposing no CSS custom property a custom plugin-drawn toolbar surface could pick up.
- Live-verified on the running wp-env dev site (localhost:8888, `?maestro_edit=1`): captured screenshots of the dark panel with the light rename input, the rename input's blue focus ring, the icon-picker popover (white card, core tab treatment), the icon-search field's blue focus ring, and the visibility popover (white card, checkbox focus ring) — all render as intended.
- `npm run test:js`: 53/53 green (this is a pure CSS pass; no logic touched).

## Task Commits

Each task was committed atomically:

1. **Task 1: Align popover (icon + visibility) tokens to core popover/postbox** — `230db30` (fix)
2. **Task 2: Keep the panel dark/quiet; keep the rename input core-light; unify focus rings** — `e2e71e3` (fix)

**Plan metadata:** committed together with STATE.md/ROADMAP.md updates (see final commit below).

## Files Created/Modified

- `assets/maestro.css` — Added `:focus-visible` rules for `.maestro-icon-search`, `.maestro-icon-none`, `.maestro-icon-tab`, `.maestro-vis-row input`, and `.maestro-rename-input` (all `outline: 2px solid #2271b1; outline-offset: 1px`, matching the ring already used elsewhere in the toolbar/panel/selected-item styling); added doc comments on the popover section (documenting the token-alignment audit outcome), the panel section (documenting the colour-scheme-hardcode rationale), and the rename input (documenting that it intentionally stays core-light on the dark panel). No colour, border, radius, shadow, spacing, or touch-target value was changed — this plan closed a focus-ring gap and documented existing alignment, it did not rebuild anything.

## Decisions Made

See `key-decisions` in the frontmatter above for the full rationale on: which tokens were already aligned vs. genuinely gapped, the focus-ring-only nature of the fix, the panel's colour-scheme-hardcode justification, and the rename input's preserved light-input styling.

## Deviations from Plan

None — plan executed as written. The plan's own framing ("mostly a token-alignment pass, not a rebuild... already near core") anticipated that most values would already match; that held true on inspection. The plan's `<done>` criteria for both tasks explicitly called for "every interactive control" to carry the core-blue focus ring, which is what actually needed fixing — this is squarely within the plan's stated scope, not scope creep.

## Issues Encountered

None. Line numbers had drifted further from the plan's cited `:222–324`/`:451–498` ranges (file is 636 lines pre-edit vs. the plan's cited baseline, consistent with the `b9f4cca` modified-dot CSS fix and 23-02's changes landing since the plan was written) — verified all regions by reading the file directly rather than trusting cited ranges, per the plan's own caveat.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Panel + popover surfaces are now confirmed on core tokens with consistent focus-ring behavior across all interactive controls; plan 23-05 (banner/coachmark/in-menu restyle + e2e/screenshot reconciliation) can proceed without any remaining panel/popover token gaps.
- No e2e selector or class-name changes were made in this plan — behavior (icon-pick, visibility-toggle, rename) is completely untouched, so no e2e reconciliation is needed from this plan specifically.
- `npm run test:js`: 53/53 green. No PHP files touched (CSS-only), so PHP unit/integration suites are unaffected by this plan (not re-run here; prior plans' gates already covered them and no PHP diff exists).

---
*Phase: 23-editor-ux-polish*
*Completed: 2026-07-05*

## Self-Check: PASSED

- FOUND: `.planning/phases/23-editor-ux-polish/23-03-SUMMARY.md`
- FOUND: commit `230db30` (fix(23-03): align popover controls to core focus-ring token)
- FOUND: commit `e2e71e3` (fix(23-03): keep panel dark/core-light rename input, add rename focus ring)
