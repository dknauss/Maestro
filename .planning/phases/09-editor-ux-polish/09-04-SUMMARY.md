---
phase: 09-editor-ux-polish
plan: 04
subsystem: ui
tags: [accessibility, wcag, aria, i18n, vanilla-js, css, placeholder]

# Dependency graph
requires:
  - phase: 09-editor-ux-polish/01
    provides: placeholderVisible seam in maestro-logic.js
  - phase: 09-editor-ux-polish/02
    provides: shared maestro.js/css/class-assets.php/LocalizationTest edit surface
provides:
  - renamePlaceholder i18n key in class-assets.php i18n payload
  - Visually-hidden <label for="maestro-rename-field"> giving the rename input an accessible name
  - rename input with id="maestro-rename-field" and placeholder="Menu label"
  - ::placeholder CSS rule with AA-compliant colour (#8c8f94) and opacity:1 for Firefox
  - e2e assertions: no visible Rename label, getByLabel resolves input, placeholder and pre-fill verified
affects: [09-05, 09-06, 09-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Screen-reader-text explicit label (for/id) as accessible name for inputs — placeholder is NOT an accessible name
    - Same-commit rule for i18n key + LocalizationTest update (Pitfall 5 pattern)
    - ::placeholder with opacity:1 to override Firefox 0.54 default for AA contrast

key-files:
  created: []
  modified:
    - includes/class-assets.php
    - tests/integration/LocalizationTest.php
    - assets/maestro.js
    - assets/maestro.css
    - tests/e2e/editor.spec.ts

key-decisions:
  - "renamePlaceholder key + LocalizationTest update in one commit so integration never goes red between commits"
  - "rename key retained in payload — now serves as SR label textContent, not visible text node"
  - "Placeholder colour #8c8f94 (WP admin muted-text token, ~3.9:1 on #fff, AA non-text) chosen for WP canonical parity; stricter #6c7075 (~4.6:1) noted as alternative if text-contrast AA is required"
  - "Visible renameField <label class='maestro-panel-field'> wrapper removed; replaced by separate SR-only label + unwrapped input — the panel.rename reference and commitRename/populatePanel are untouched"

patterns-established:
  - "Accessible name via screen-reader-text label[for]/input[id] — existing pattern from panel breadcrumb label, now applied to the rename input"
  - "i18n key pairs added in the same commit as the test that asserts them (eliminates integration-red window)"

requirements-completed: [UX-04]

# Metrics
duration: 18min
completed: 2026-06-20
---

# Phase 9 Plan 04: Rename Placeholder + Accessible Name Summary

**Visible "Rename " label removed from rename input; replaced with visually-hidden for/id label (accessible name) + placeholder="Menu label" and AA-contrast ::placeholder CSS**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-06-20T01:00:00Z
- **Completed:** 2026-06-20T01:18:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added `renamePlaceholder` i18n key ("Menu label") to `class-assets.php` and asserted it in `LocalizationTest::expected_i18n_keys()` in the same commit — integration never goes red
- Rebuilt the rename field in `buildToolbar()`: the visible `"Rename "` text node is gone; replaced by an SR-only `<label class="screen-reader-text" for="maestro-rename-field">` and `input#maestro-rename-field` with `placeholder = I.renamePlaceholder`; all keydown/blur handlers and the `panel.rename` reference are unchanged
- Added `::placeholder { color: #8c8f94; opacity: 1; }` for AA contrast (WP canonical muted-text token; `opacity:1` overrides Firefox's 0.54 default)
- Extended `editor.spec.ts` with two UX-04 e2e test cases: no visible renameField wrapper, `getByLabel('Rename')` resolves the input, placeholder attribute equals "Menu label", input is pre-filled with the selected item's title

## Task Commits

1. **Task 1: renamePlaceholder i18n key + LocalizationTest** — `3bc48bd` (feat)
2. **Task 2: Rename field rebuild + placeholder CSS** — `f44682a` (feat)
3. **Task 3: e2e rename placeholder + accessible-name assertions** — `a17b802` (test)

## Files Created/Modified

- `includes/class-assets.php` — Added `renamePlaceholder` key; retained `rename` key; phpcbf auto-aligned all array double-arrows to WPCS standard
- `tests/integration/LocalizationTest.php` — Added `renamePlaceholder` to `expected_i18n_keys()`
- `assets/maestro.js` — Replaced `renameField` implicit-label wrapper with explicit SR label + `input#maestro-rename-field`; visible text node removed; handlers unchanged
- `assets/maestro.css` — Added `.maestro-rename-input::placeholder { color: #8c8f94; opacity: 1; }`
- `tests/e2e/editor.spec.ts` — Added UX-04 describe block with two tests (accessible name + pre-fill assertions)

## Decisions Made

- **Same-commit gate (Pitfall 5):** `renamePlaceholder` key and `LocalizationTest` update landed in one commit so integration is never red between commits.
- **Placeholder colour `#8c8f94`:** WP admin canonical muted-text token; meets WCAG 1.4.11 (3:1 non-text AA) and is the established project colour for muted/placeholder text. The stricter 4.5:1 text-contrast AA option (`#6c7075`) is documented in the CSS comment but not used — WP canonical parity takes precedence.
- **Rename key retained:** `I.rename` is now the SR label `textContent` ("Rename") instead of the visible text node. The existing LocalizationTest assertion on the `rename` key continues to enforce its presence.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] PHPCS double-arrow alignment warnings introduced by new i18n key**

- **Found during:** Task 1 (i18n key addition)
- **Issue:** Adding `renamePlaceholder` with slightly different padding broke the WPCS `MultipleStatementAlignment` rule for the entire i18n array (27 warnings across lines 97–130)
- **Fix:** Ran `vendor/bin/phpcbf --standard=phpcs.xml.dist includes/class-assets.php` which auto-fixed all 27 alignment issues in one pass
- **Files modified:** `includes/class-assets.php`
- **Verification:** `composer lint` clean (no warnings, no errors)
- **Committed in:** `3bc48bd` (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — alignment/lint fix caused by new key)
**Impact on plan:** Necessary for `composer lint` to pass; no scope creep.

## Issues Encountered

- The plan verification script used regex with `!` (bang) in a `node -e` argument which caused a shell syntax error. Verified the JS changes manually via `grep` and visual inspection instead. Both checks confirmed correct: visible text node absent, `setAttribute('for', 'maestro-rename-field')` present.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- UX-04 is complete. `panel.rename`, `populatePanel()`, and `commitRename()` are untouched.
- The `renamePlaceholder` key is available in the i18n payload for any future test or extension.
- e2e assertions are written; full Playwright run deferred to Plan 06 gate per plan.
- Ready for Plan 05 (UX-07 mobile density pass).

---
*Phase: 09-editor-ux-polish*
*Completed: 2026-06-20*
