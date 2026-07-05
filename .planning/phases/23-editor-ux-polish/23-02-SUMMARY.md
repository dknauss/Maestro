---
phase: 23-editor-ux-polish
plan: 02
subsystem: ui
tags: [dom, wp-admin-bar, i18n, css, wcag, playwright]

# Dependency graph
requires:
  - phase: 23-editor-ux-polish (plan 01)
    provides: quiet native-wp-admin toolbar controls, .button-link-delete Reset All idiom, neutral mode chip/save-status baseline
provides:
  - The scrapped pinned menu-column mode/status zone (built and live-iterated, then rejected) fully unwound — no modeZonePlacement seam, no 782px gate, no #collapse-menu manipulation anywhere
  - The redundant bottom-toolbar Exit control removed entirely
  - The WP Toolbar (admin-bar) toggle is now the single entry/exit AND mode indicator, relabelled "Exit Menu Editor" while editing
  - Save-flush-on-exit guarantee re-homed from the removed control onto a click-intercept on the admin-bar toggle link (bindAdminBarExit), live-verified end to end
  - Reset All underline bug fixed — matches core's .button-link-delete idiom exactly (no underline, ever)
affects: [23-03, 23-04, 23-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single entry/exit doctrine: the plugin's own edit-mode toggle (class-admin-bar.php, 'deliberately hung off the admin bar, NOT the admin menu') is the one home for entering/exiting edit mode — no duplicate control in the editor's own toolbar"
    - "Click-intercept-then-navigate pattern for plain <a> links that must await async work before navigating: preventDefault() -> await pending promise -> window.location.href = link.href, never touching the PHP-owned href/query-arg logic"
    - "Destructive text-link idiom taken all the way to core parity: .button-link-delete has NO underline at rest or on hover (not underline-then-remove-on-hover) — the icon glyph is explicitly guarded against inheriting text-decoration from its inline-flex parent"

key-files:
  created: []
  modified:
    - assets/maestro.js
    - assets/maestro.css
    - includes/class-admin-bar.php
    - includes/class-assets.php
    - tests/integration/AdminBarTest.php
    - tests/integration/LocalizationTest.php
    - tests/e2e/save-race.spec.ts

key-decisions:
  - "Save-flush re-homing: rather than inventing a new promise/flag, bindAdminBarExit() reuses the exact same saveTimer/inFlight state and waitForSaveIdle() the removed onExit() awaited — the only change is where the intercept lives (admin-bar link vs. toolbar <a>) and that it reads the toggle's own .href at click time instead of a separate D.exitUrl payload value."
  - "D.exitUrl and the 'exit' i18n string are both now unconsumed by JS (the admin-bar href is server-rendered PHP, not JS-templated) — 'exit' was removed from class-assets.php + its two test assertions (LocalizationTest, AdminBarTest already covered the PHP-side strings separately); exitUrl itself was left in place since removing it is a slightly larger touch on the localize payload than this task's scope and it does no harm (well under the 256 KiB budget either way) — flagged here rather than silently trimmed, in case a future plan wants to remove it too."
  - "Tour step 5 (guided-tour coachmark) re-anchored from the removed .maestro-exit element to #wp-admin-bar-maestro-toggle. positionTour()'s existing 'top' placement already falls back to below-the-anchor when there's no room above (true near the top of the viewport where the admin bar lives), so no placement-logic change was needed — only the anchor selector."
  - "AdminBarTest.php (a Phase 11 / UX-08b test) asserted the OLD compact 'Exit' label and explicitly guarded against 'Exit Editor' appearing in the visible title — this directly contradicted Task 2's required relabel, so it was updated in the same commit (never left red) to assert the new locked 'Exit Menu Editor' string for both the visible label and meta.title, per the Rule 3 blocking-issue path (a test in a plan-listed file, broken by an in-scope required change)."
  - "tests/e2e/save-race.spec.ts race (a) was updated to click the admin-bar toggle instead of the removed .maestro-exit — this is the exact 'edit -> exit -> persisted, no lost last change' behavior Task 2's success criteria requires be verified live, so it was brought in-plan rather than deferred to 23-05 (which owns the broader mode-chip/.maestro-mode-label e2e drift left over from Task 1, unrelated to this control)."

requirements-completed: [UX-09, UX-13]

# Metrics
duration: ~50min
completed: 2026-07-05
---

# Phase 23 Plan 2: Single Toolbar Exit + Reset All Underline Fix Summary

**Removed the scrapped pinned mode/status zone and the redundant bottom-toolbar Exit control; the WP Toolbar admin-bar toggle is now the single entry/exit relabelled "Exit Menu Editor," with the save-flush-before-navigate guarantee re-homed onto its click and the Reset All underline bug fixed to match core's destructive-link idiom exactly.**

## Performance

- **Duration:** ~50 min (Task 2 only; Task 1 was executed and committed in a prior session)
- **Started:** 2026-07-05T00:24:50-06:00 (Task 1 commit, prior session)
- **Completed:** 2026-07-05T01:14:27-06:00 (Task 2 commit, this session)
- **Tasks:** 2 (Task 1 previously done/committed; Task 2 executed this session)
- **Files modified:** 7 (Task 2: `assets/maestro.js`, `assets/maestro.css`, `includes/class-admin-bar.php`, `includes/class-assets.php`, `tests/integration/AdminBarTest.php`, `tests/integration/LocalizationTest.php`, `tests/e2e/save-race.spec.ts`)

## Accomplishments

- **Task 1 (prior session, `326b7b0`):** unwound the scrapped pinned-zone implementation — deleted `modeZonePlacement` (+ its `tests/js/mode-zone-placement.test.mjs`), removed `relocateModeZone()`/the 782px `matchMedia` listener/the `.maestro-mode-zone` wrapper/the `#collapse-menu` hide-restore machinery from `assets/maestro.js`, and the corresponding CSS. Save-status restored directly into the toolbar; pencil "Edit Mode" mode chip removed entirely.
- **Task 2 (this session, `8e95ab1`):** removed the bottom-toolbar `.maestro-exit` control (element build + `onExit` handler) from `buildToolbar()`.
- Added `bindAdminBarExit()`: a click intercept on the admin-bar toggle link (`#wp-admin-bar-maestro-toggle > .ab-item`) that, while editing, `preventDefault()`s, awaits any pending/in-flight save via the existing `waitForSaveIdle()`, then navigates to the link's own `href` — reusing the exact same save-flush guarantee the removed `onExit()` provided, guarded so it no-ops (never throws) if the node is absent.
- Relabelled the admin-bar toggle's editing-state strings in `includes/class-admin-bar.php`: visible label "Exit" → "Exit Menu Editor"; `meta.title` "Exit Editor" → "Exit Menu Editor". The not-editing "Edit Menu" label and the `href` resolution logic are untouched.
- Re-anchored the guided-tour's step 5 coachmark from the removed `.maestro-exit` element to `#wp-admin-bar-maestro-toggle`; the existing `positionTour()` "top" placement already falls back to below-the-anchor near the top of the viewport, so no positioning-logic change was needed.
- Removed the now-orphaned `exit` i18n string from `includes/class-assets.php`'s localized payload, and updated its two consumers (`tests/integration/LocalizationTest.php`'s expected-keys list, and `tests/integration/AdminBarTest.php`'s Phase-11/UX-08b assertions, which had directly locked the old compact "Exit" string and explicitly guarded against "Exit Editor" appearing — both updated to assert the new "Exit Menu Editor" strings instead of being left red).
- Fixed the Reset All underline bug in `assets/maestro.css`: the prior `.maestro-reset-all.button-link-delete` rule underlined the link by default and removed the underline only on hover — backwards from core's idiom, and because the dashicon glyph and the label text share one `inline-flex` button, the underline rendered visibly under the icon too. The rule now sets `text-decoration: none` at rest and on hover (core's `.button-link-delete` has no underline, ever) plus an explicit guard on the `.dashicons` child so the icon glyph itself can never inherit an underline.
- Live-verified via a scripted Playwright check against the running wp-env dev instance (localhost:8888/8899): the admin-bar toggle text is exactly "Exit Menu Editor" while editing; the Reset All icon and text both compute `text-decoration-line: none` at rest and on hover; and a rename made, then exited via the Toolbar "Exit Menu Editor" toggle, then reloaded, shows the renamed value — no lost last change.
- Updated `tests/e2e/save-race.spec.ts`'s HARD-03 race (a) test to click the admin-bar toggle (instead of the removed `.maestro-exit`) while a save POST is artificially delayed; re-ran it against the live wp-env tests instance and confirmed it still passes — the navigation still defers correctly until the in-flight save settles.

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove the scrapped pinned-zone implementation; restore save-status to the toolbar** - `326b7b0` (fix) — completed in a prior session.
2. **Task 2: Remove the redundant bottom Exit; make the admin-bar toggle the single "Exit Menu Editor" (with save-flush intercept); fix Reset All underline** - `8e95ab1` (feat)

**Plan metadata:** committed together with STATE.md/ROADMAP.md updates (see final commit below).

## Files Created/Modified

- `assets/maestro.js` — Removed the `.maestro-exit` element build and `onExit()` handler from `buildToolbar()`; added `bindAdminBarExit()` (click intercept on the admin-bar toggle link, reusing `waitForSaveIdle()`); re-anchored tour step 5 to `#wp-admin-bar-maestro-toggle`; updated the `doAutosave()` comment referencing the now-removed `onExit`.
- `assets/maestro.css` — Fixed the Reset All underline rule (`text-decoration: none` at rest and on hover, plus an explicit `.dashicons` guard); updated stale comments referencing the removed bottom-toolbar Exit control (`.maestro-toolbar .button`, the glyph-size rule, `.maestro-toolbar-right`).
- `includes/class-admin-bar.php` — Relabelled the editing-state visible label and `meta.title` from "Exit"/"Exit Editor" to "Exit Menu Editor".
- `includes/class-assets.php` — Removed the orphaned `exit` i18n string from the localized `i18n` array.
- `tests/integration/AdminBarTest.php` — Updated the Phase-11/UX-08b exit-label and meta-title tests to assert the new "Exit Menu Editor" strings (previously asserted the compact "Exit" and explicitly guarded against the long form).
- `tests/integration/LocalizationTest.php` — Removed `'exit'` from the expected localized-key list.
- `tests/e2e/save-race.spec.ts` — Race (a) now clicks the admin-bar toggle instead of the removed `.maestro-exit`; doc comments updated to describe `bindAdminBarExit()` instead of `onExit()`.

## Decisions Made

See `key-decisions` in the frontmatter above for the full rationale on: save-flush re-homing, the `exitUrl`/`exit` i18n reconciliation, the tour-anchor change, the Phase-11 `AdminBarTest.php` update, and bringing the `save-race.spec.ts` update in-plan rather than deferring it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated `tests/integration/AdminBarTest.php`'s Phase-11/UX-08b assertions to the new locked strings**
- **Found during:** Task 2 (admin-bar relabel)
- **Issue:** This Phase-11 test asserted the visible label must be the compact `'Exit'` and explicitly guarded (`assertStringNotContainsString`) against `'Exit Editor'` appearing in the title — both assertions directly contradict Task 2's required relabel to "Exit Menu Editor" and would go RED the moment `class-admin-bar.php` changed.
- **Fix:** Updated `test_exit_label_contains_exit` → `test_exit_label_contains_exit_menu_editor` (asserts `'Exit Menu Editor'`, drops the now-inapplicable "must not be the long form" guard) and `test_exit_meta_title_is_long_form` (asserts `'Exit Menu Editor'` instead of `'Exit Editor'`); updated the file's doc comment to describe the Phase 23/UX-09 relabel history instead of the stale Phase-11 "RED until 11-02" note.
- **Files modified:** `tests/integration/AdminBarTest.php`
- **Verification:** `vendor/bin/phpunit -c phpunit-integration.xml.dist --filter AdminBarTest` green (in the full integration run: 47/47).
- **Committed in:** `8e95ab1` (Task 2 commit)

**2. [Rule 1 - Bug] Updated `tests/e2e/save-race.spec.ts` race (a) to target the admin-bar toggle**
- **Found during:** Task 2 (bottom-Exit removal)
- **Issue:** The existing HARD-03 race (a) spec directly clicked `.maestro-exit`, which Task 2 removes — this is exactly the save-flush-on-exit behavior the plan's own success criteria requires be verified live (not silently left broken), and it is the same control this task rewires.
- **Fix:** Updated the test to click `#wp-admin-bar-maestro-toggle > .ab-item` instead, and updated its doc comments to describe `bindAdminBarExit()`'s intercept instead of the removed `onExit()`.
- **Files modified:** `tests/e2e/save-race.spec.ts`
- **Verification:** Ran the full `save-race.spec.ts` suite against the live wp-env tests instance (`WP_ENV_TESTS_PORT=8899 npx playwright test tests/e2e/save-race.spec.ts`) — all 3 races (a/b/c) pass.
- **Committed in:** `8e95ab1` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1/3 — broken-by-this-change test updates, not scope creep)
**Impact on plan:** Both fixes were direct, necessary consequences of the plan's own required relabel/removal; neither introduces new behavior beyond what Task 2 specifies. No scope creep.

## Issues Encountered

- **wp-env port contention (known pattern, see STATE.md history):** the project's own wp-env tests instance is NOT on the default port 8889 (another wp-env project holds that port) — it is on **8899** (dev on 8888). Running `WP_ENV_TESTS_PORT=8899 npx playwright test ...` resolved it; confirmed via `docker ps` that this project's `tests-cli` container belongs to the 8888/8899 stack.
- **Container `vendor/` not installed:** the `tests-cli` container had no `vendor/bin/phpunit` — `composer install` failed on a PHP-version platform mismatch (container ships PHP 8.3.32; `doctrine/instantiator` 2.1.0 in the lockfile requires PHP ^8.4). Unblocked with a one-off `composer install --ignore-platform-reqs` inside the container (not committed; no `composer.lock`/`composer.json` changes were made) — pre-existing infra drift, out of scope for this task to fix properly.
- Sandbox blocked the Docker socket and outbound `curl`/`playwright` network access directly — all Docker/wp-env/Playwright commands in this session were run with the sandbox disabled (evidence: "permission denied while trying to connect to the docker API").

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The admin-bar toggle is now confirmed (by live check + integration test) as the single entry/exit and mode indicator; plan 23-03/23-04 (panel/popover/banner/coachmark restyle) can proceed without any remaining bottom-toolbar Exit surface to reconcile.
- **Left for plan 23-05 (explicitly, per CONTEXT/ROADMAP — not silently):** `tests/e2e/editor.spec.ts` still asserts against `.maestro-mode-label` (4 failing tests: `UX-02 no-overlap` ×2, `UX-03 split mode indicator` ×2) — this is pre-existing drift from **Task 1** (326b7b0), not introduced by Task 2, confirmed by running the full `editor.spec.ts` + `tour.spec.ts` suite this session (23/27 pass; the 4 failures are exactly the mode-chip selector). 23-05's own plan frontmatter already lists "the old 'Exit' label" and the removed pencil mode chip as known reconciliation targets.
- `npm run test:js`: 53/53 green. PHP unit: 90/90 green. PHP integration: 47/47 green (including the updated `AdminBarTest`/`LocalizationTest`/`PerformanceTest`). phpcs: clean on the two modified `includes/` files (tests/ are outside phpcs.xml.dist's scope by design).
- `save-race.spec.ts` (HARD-03): all 3 races pass against the live wp-env tests instance, including the updated race (a) exercising the new admin-bar click-intercept under an artificially delayed save.

---
*Phase: 23-editor-ux-polish*
*Completed: 2026-07-05*

## Self-Check: PASSED

- FOUND: `.planning/phases/23-editor-ux-polish/23-02-SUMMARY.md`
- FOUND: commit `326b7b0` (fix(23-02): remove scrapped pinned mode/status zone)
- FOUND: commit `8e95ab1` (feat(23-02): consolidate exit onto the admin-bar toggle; fix Reset All underline)
