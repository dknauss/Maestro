---
phase: 23-editor-ux-polish
plan: 01
subsystem: ui
tags: [css, dom, wp-admin, accessibility, wcag]

# Dependency graph
requires:
  - phase: 18-v1.3-release
    provides: shipped v1.3.0 baseline (Phase 23 depends only on this, per ROADMAP)
provides:
  - Quiet, borderless native-wp-admin toolbar controls (core Collapse-menu idiom) replacing the unified grey/green/amber/red outlined-box system
  - Reset All restyled as a red destructive text link (.button-link-delete idiom), visible text kept
  - Neutral mode chip (pencil + "Edit Mode", no green)
  - Gutenberg-muted save status (neutral spinner / muted-grey Saved / red Save failed)
  - Non-colour modified-row dot marker (recoloured neutral, existing bullet glyph kept)
  - Confirmed modeStatusLabel state-mapping seam intact (node:test green, no wording change needed)
affects: [23-02, 23-03, 23-04, 23-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Quiet-control CSS idiom: borderless/transparent .button, hover-lighten via rgba overlay, core-blue focus-visible ring, disabled = dimmed opacity"
    - "Destructive text-link idiom: .button-link-delete class on .maestro-reset-all — red text, underline-on-idle/none-on-hover, no box"
    - "Colour reserved for exactly two meanings project-wide: errors and destructive actions (both red); everything else recolored to the toolbar's neutral #c3c4c7 text tone"

key-files:
  created: []
  modified:
    - assets/maestro.css
    - assets/maestro.js

key-decisions:
  - "Modified-row dot marker: kept the existing bullet '•' badge (assets/maestro.js refreshModifiedIndicator, already implemented pre-Phase-23) and only recoloured it from amber #dba617 to neutral #c3c4c7 (~8.6:1 on #1d2327) — it already matches the Gutenberg unsaved-changes dot idiom the CONTEXT calls for, so no new glyph or DOM change was needed, only a colour swap."
  - "Spinner choice: kept the existing dashicons-update rotating-arrows glyph (font-based, zero extra payload) rather than switching to core's .spinner (a background-image asset — spinner.gif/spinner-2x.gif — that would require enqueuing a separate core stylesheet/asset dependency just for one control). The rotating glyph shape is the whole 'saving' signal per CONTEXT (no colour needed), so recolouring it to neutral #c3c4c7 and keeping the existing animation satisfies the Gutenberg-muted intent without a payload/dependency cost."
  - "No save-status copy reword: the shipped i18n strings ('Saving…' / 'Saved' / 'Save failed. Retrying on next change.' in includes/class-assets.php) already match the CONTEXT-locked Gutenberg-muted idiom verbatim, so Task 1's TDD reconciliation step (reword -> update test first -> GREEN commit) did not apply. Verified all 5 modeStatusLabel node:test cases already pass against the existing strings/logic (idle/saving/saved/error/unknown) — no code change, no new commit for Task 1."
  - "Reset All + Exit text visibility: switched from the universal '.maestro-toolbar .maestro-btn-label { display:none }' rule (which hid every button's text span, including these two) to an explicit per-button list scoping the hide rule to only the five icon-only panel buttons (move-up/down, icon, visibility, reset-item) and the mode indicator — Reset All and Exit now show their visible text label as CONTEXT's 'Label mix preserved' decision requires."

requirements-completed: [UX-12, UX-13]

# Metrics
duration: ~35min
completed: 2026-07-05
---

# Phase 23 Plan 1: Delete Outlined-Box Toolbar System Summary

**Removed the grey/green/amber/red outlined-control system from the bottom toolbar and replaced it with borderless quiet native-wp-admin controls, a neutral mode chip, Gutenberg-muted save status, and a red destructive-text-link Reset All — colour now carries meaning in exactly two places (errors, destructive actions).**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-07-05T04:58:00Z (approx.)
- **Completed:** 2026-07-05T05:33:46Z
- **Tasks:** 2 (Task 1 required no code change; Task 2 delivered the styling work)
- **Files modified:** 2 (`assets/maestro.css`, `assets/maestro.js`)

## Accomplishments

- Deleted the unified outlined-control CSS system (`border:currentColor`, semantic grey/green/amber/red vocabulary, sharp corners, `#2c3338` fill) and replaced it with a borderless, transparent-background quiet-control idiom matching core's Collapse-menu control: neutral glyph, `rgba(255,255,255,0.08)` hover-lighten, `2px solid #2271b1` focus-visible ring, `opacity:0.4` dimmed-disabled.
- Reset All now renders as a red (`#d63638`) destructive text link via a new `.button-link-delete`-scoped rule (no box, underline-on-idle, no-underline-on-hover) while keeping the `.maestro-reset-all` selector e2e/save-race specs already target.
- Mode chip recoloured from green `#6bc187` to the toolbar's neutral `#c3c4c7` text colour — pencil dashicon + "Edit Mode", no colour signal beyond the toolbar's own presence.
- Save status recoloured to the Gutenberg-muted idiom: `saving` neutral `#c3c4c7` (the rotating spinner glyph is the whole signal), `saved` muted grey `#646970`, `error` red `#d63638` — red is now used only for the error state, matching the destructive-red token.
- Modified-row dot marker (`.maestro-modified-badge`, the existing bullet `•` glyph + `(modified)` screen-reader text) recoloured from amber `#dba617` to neutral `#c3c4c7`; Reset Item's enabled-vs-dimmed `:disabled` state now carries the entire "has changes to reset" signal (no amber).
- Removed the now-dead `.wp-core-ui .button .dashicons` specificity hack — it only existed to fight the `.button` box, which is gone.
- Reset All and Exit now show their visible text label (previously hidden by a universal `.maestro-btn-label { display:none }` rule); only the five icon-only panel buttons and the mode indicator still hide their text span.
- Confirmed (no change needed) that `modeStatusLabel`'s five-case state mapping (`idle`→`''`, `saving`, `saved`, `error`→`saveError`, unknown→`''`) is already green in `tests/js/mode-status.test.mjs`, and the shipped i18n copy already matches the Gutenberg-muted "Save failed" idiom locked in CONTEXT.

## Task Commits

Each task was committed atomically:

1. **Task 1: Verify + extend the modeStatusLabel state-mapping seam** — no commit (verification-only; existing code/tests already satisfy the plan's `<done>` criteria, see Deviations below).
2. **Task 2: Delete the outlined-box system; build quiet menu-native controls + muted save status** - `cc00648` (feat)

**Plan metadata:** committed together with STATE.md/ROADMAP.md updates (see final commit below).

_Note: Task 1 required no working-tree change per this repo's TDD gate rule — a commit with no diff would violate the "commit outcomes, not process" convention, so it is documented here instead._

## Files Created/Modified

- `assets/maestro.css` - Removed the unified outlined-control system; added quiet-control rules (`.maestro-toolbar .button`), the `.button-link-delete`-scoped Reset All rule, recoloured mode chip/save-status/modified-dot to neutral/muted/red-only-on-error, removed the dead `.wp-core-ui .button .dashicons` hack, scoped the `.maestro-btn-label` hiding rule to icon-only buttons only.
- `assets/maestro.js` - Added `button-link-delete` class to the Reset All button; updated inline comments describing the mode icon (no longer "green pencil"), the modified-badge contrast rationale (neutral, not amber), and the reset-button enabled/dimmed language (no amber). No logic changes to `buildToolbar()`, `setStatus()`, `refreshModifiedIndicator()`, or any save/reorder/hide/icon/rename behavior.

## Decisions Made

- Modified-dot glyph/placement: kept the existing bullet `•` badge already implemented in `refreshModifiedIndicator()` (appended to the row label, with sibling screen-reader `(modified)` text) — it already matches the Gutenberg unsaved-changes dot idiom the plan calls for. Only recoloured amber → neutral `#c3c4c7`. No new glyph, no DOM/placement change.
- Spinner choice: retained the dashicons-update rotating-arrows glyph (font-based, already a declared style dependency, zero added payload) instead of switching to core's `.spinner` (a `spinner.gif`/`spinner-2x.gif` background-image asset that would require enqueuing an additional core stylesheet/dependency for a single control). The rotating shape itself is the "saving" signal per CONTEXT's Gutenberg-muted spec (no colour required) — recoloring the existing glyph to neutral satisfies the intent without the payload/dependency cost the plan explicitly allows trading off.
- No save-status copy reword: verified the shipped i18n strings already match the CONTEXT-locked wording verbatim ("Saving…" / "Saved" / "Save failed. Retrying on next change."). All 5 `modeStatusLabel` node:test assertions (idle/saving/saved/error/unknown) already pass against this copy — Task 1's RED→GREEN reconciliation step did not apply; documented as "verified, no change" rather than fabricating a no-op commit.
- Reset All + Exit visible text: replaced the universal `.maestro-btn-label { display:none }` rule with an explicit per-selector list (move-up/down, icon, visibility, reset-item, mode-label) so only those five icon-only controls hide their text span — Reset All and Exit now show their labels as the "Label mix preserved" decision in CONTEXT requires.

## Deviations from Plan

None — plan executed exactly as written. Task 1's `<action>` steps were conditional ("If the locked wording differs...") and the condition was false: the shipped copy already matched, so no test/logic/i18n change or new commit was required. This is a planned branch of the task, not a deviation.

## Issues Encountered

None. Line numbers in `assets/maestro.css` had drifted slightly from the plan's cited ranges (file is 615 lines vs. the plan's cited 614; regions shifted by a handful of lines), consistent with the plan's own caveat that ranges "may have drifted" — verified actual content by reading the file directly rather than trusting cited line numbers, no functional impact.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The toolbar's colour vocabulary is now reduced to exactly two meanings (error, destructive action), both red — this is the mechanical foundation Plan 23-02 (pinned UX-09 zone) and 23-03 (panel/popover token alignment) build on.
- `npm run test:js` is green (53/53); no PHP files were touched so the localized-payload-budget integration test is unaffected (verified by inspection — `includes/class-assets.php` has no diff).
- e2e specs that assert against the removed `.button`/colour classes or the is-modified amber styling are NOT updated here — that reconciliation is explicitly scheduled in Plan 23-05 per the plan's own verification note ("mode-chip/`.button`/is-modified e2e updates are scheduled in plan 23-05, NOT silently here"). Flagging this forward so 23-05 knows the selectors it needs to check: `.maestro-toolbar .button`, `.maestro-reset-all` (now `.button-link-delete`), `.maestro-mode-label`, `.maestro-status-*`, `.maestro-modified-badge`, `.maestro-reset-item.is-modified`.

---
*Phase: 23-editor-ux-polish*
*Completed: 2026-07-05*

## Self-Check: PASSED

- FOUND: `.planning/phases/23-editor-ux-polish/23-01-SUMMARY.md`
- FOUND: commit `cc00648` (feat(23-01): delete outlined-box toolbar system for quiet native controls)
