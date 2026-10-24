# Mobile keyboard and dialog polish implementation plan

> For agentic workers: implement task by task using the executing-plans workflow. Preserve the existing draft and verification evidence below; do not restart or discard another agent's work.

**Goal:** Let phone users select menu items and operate dialogs without an unwanted keyboard, replace mobile Done footers with accessible header close controls, and remove forced empty dialog space in portrait and landscape.

**Architecture:** Preserve the original shared toolbar and autosave model. Centralize mobile dialog entry focus through `focusDialogControl(pop, control)`, and keep a fixed header outside a content-sized scrolling body in `placeMobilePopover(pop, anchorBtn)`. Core keyboard activation continues to support direct text editing; touch/pointer selection does not initiate it.

**Tech stack:** Vanilla JavaScript, CSS, WordPress wp-admin, Playwright, wp-env.

**Spec:** Dan's 2026-10-24 phone findings: Preview and Visibility groups retain unwanted Done footers and large empty sheets; tapping a menu item opens the iPhone keyboard over the UI. Apply the keyboard correction wherever relevant, especially landscape. Related retained design: [contextual controls later pass](../../../.planning/DESKTOP-UX-NEXT-PASS.md).

## Current handoff state

- Repository: `/Users/dan-knauss/Code/dknauss/admin-menu-maestro`, GitHub `dknauss/Maestro`.
- Active isolated worktree: `/tmp/maestro-mobile-dialog` (macOS resolves this to `/private/tmp/maestro-mobile-dialog`). Branch: `fix/mobile-dialog-keyboard`.
- Base: `2bdf8dcf00b134a2484b55529878bd2197b1bd57`, merged #258. #256 and #257 are also on main. Primary checkout remains on main; do not apply this draft there.
- Draft implementation and tests are **uncommitted**, with no PR yet. This plan is the handoff checkpoint requested by Dan. Inspect `git status` and `git diff` before continuing.
- Claude's only open PR at this check: #259, banner explanatory copy. It does not implement this task. Fetch/list PRs again before pushing.
- Changed files: `assets/maestro.js`, `assets/maestro.css`, `docs/user-guide.md`, `.planning/TOUCH-DEVICE-CHECKLIST.md`, `tests/e2e/dialog-close.spec.ts`, `tests/e2e/mobile-usability.spec.ts`, `tests/e2e/specs/phone-layout.spec.ts`, `tests/e2e/specs/role-preview.spec.ts`.
- New untracked test: `tests/e2e/mobile-selection-dialogs.spec.ts`. Preserve it.
- `node_modules` is a temporary symlink to `/tmp/maestro-preview-rebase.cwFlaV/node_modules`; never stage it. Remove only this symlink with `unlink node_modules` after verification if desired.

## Global constraints

- Keep contextual controls inside menu items for the later experiment; do not implement them here.
- Keep real touch-device acceptance **open**. Automated focus/viewport checks cannot prove iOS keyboard behavior on hardware.
- Preserve autosave, Preview's explicit submit action and failed-save guard, accessibility names, focus containment/return, RTL and background scroll lock.
- Close controls have a 44×44 CSS pixel target and a centered icon.
- Menu width stays unavailable below 961 CSS pixels. No dependency or data-model changes.
- Opening Preview must not automatically focus its native select on phones: that can open the platform picker too.
- Keep the final tour Done action: this task removes dialog dismissal footers, not the tour-completion action.
- Before WordPress operations, read `/Users/dan-knauss/AGENTS.md` and `/Users/dan-knauss/Code/WORDPRESS-ACCESS.md`. Work only on the disposable local test site.

## Root causes and draft changes already made

1. `bindMenuSelection()` used `{focusPanel: true}` for every click, and `selectItem()` focused `panel.rename`. The draft uses `!isPhoneViewport() || e.detail === 0` for click activation, keeps Enter/Space keyboard selection, and returns phone pointer selection to the row anchor. Explicitly tapping the rename field still focuses it.
2. Dialog entry focused icon search, a group-name/new-group input, or Preview's select. The draft routes those entry calls through `focusDialogControl(pop, control)`: phone dialogs focus Close, desktop dialogs retain the supplied control.
3. `addDialogClose()` used a phone-only Done footer. The draft removes that branch and uses the same close icon everywhere.
4. `placeMobilePopover()` inserted a Done footer and set height equal to all available visual-viewport space. The draft extracts/creates a header title and close button, places them outside `.maestro-mobile-body`, sets `height: auto`, and constrains `maxHeight` to available space. It retains background locking, outside-tap containment and focus trapping.
5. CSS now uses a non-growing scroll body and fixed header; it no longer hides mobile close icons.
6. After the initial green test run, the focus audit also changed group deletion, successful group creation, person removal and successful person selection to call `focusDialogControl()` on phones. These **latest changes have not yet been rerun**. Empty/invalid group creation still focuses the invalid input because the user explicitly requested creation and must correct the field.

## Review focus

1. Landscape with a software keyboard leaves very little vertical room: header and Close must stay reachable, and the active input must scroll into view without moving the page behind it.
2. Selecting another menu item while rename is focused must commit/blur the previous value without launching another text edit.
3. Dynamic group/member additions and removals must not leave focus on a detached node or reopen the keyboard unexpectedly.
4. Dialogs opened before rotating/resizing must retain one header/close control, correct scroll lock and a working focus trap.
5. Keyboard-only and screen-reader activation must preserve access to text fields and core menu selection; pointer detection must not exclude touch laptops/tablets merely because their viewport is wider.

## Task 1 — Complete the focus audit

**Files:** `assets/maestro.js`; `tests/e2e/mobile-selection-dialogs.spec.ts`; existing person/group specs as needed.

**Interfaces:** `selectItem(li, opts)`, `bindMenuSelection()`, `focusDialogControl(pop, control)`; no exported API changes.

- [x] Add a portrait regression: tap parent/child rows, assert row focus and no rename focus; tap the name field to type; Enter on a selected row still enters renaming.
- [x] Route icon/Visibility/groups/Preview dialog entry to Close on phones.
- [x] Extend selection coverage to 667×375 and 844×390 landscape and a wide touch-device viewport. Prefer actual event pointer type for touch where available if the current viewport-only test misses it; keep synthesized keyboard activation supported.
- [x] Verify successful group creation/deletion and person add/remove leave valid non-text focus on phones, including when list rendering removes the clicked node. Preserve desktop behavior and direct text-entry validation.
- [x] Audit remaining `.focus()` calls. Retain focus after explicit typing/validation and keyboard navigation; do not indiscriminately disable focus or mark inputs readonly.
- [x] Check intentional toolbar renaming with keyboard geometry: the name field must remain reachable above the keyboard, especially in landscape. If fixed toolbar positioning hides it, add a bounded visualViewport-aware offset for the editing toolbar and test it; never claim the automatic-focus correction alone proves this case.

## Task 2 — Finish mobile dialog layout and landscape coverage

**Files:** `assets/maestro.js`, `assets/maestro.css`, `tests/e2e/mobile-selection-dialogs.spec.ts`, `tests/e2e/mobile-usability.spec.ts`, `tests/e2e/dialog-close.spec.ts`.

**Interfaces:** `placeMobilePopover(pop, anchorBtn)` returns reposition callback; `addDialogClose(pop, button)` provides the shared close target. Preserve cleanup/restoration behavior.

- [x] New tests assert Preview/groups are compact (portrait Preview <220px; empty groups <420px), all four dialogs have Close with no Done, header position survives body scrolling, and focus returns on close.
- [x] Update existing phone tests to dismiss via Close and expect phone Preview entry focus on Close.
- [x] Add landscape runs at 667×375 and 844×390 for Preview/groups/Visibility/icons. Assert bounds stay within visible space and short content does not acquire forced blank space.
- [x] Simulate a landscape visualViewport keyboard (e.g. width 667, height 190, offsetTop 32). Assert Close remains visible, focused name/search input stays within the scroll body and viewport, and background scroll remains locked. Explicitly type before simulating the keyboard; opening alone must not focus text.
- [x] Exercise long group/member content and dynamic search results after a compact dialog is opened. Ensure natural growth reaches maxHeight then scrolls; focused content remains reachable. Review whether a ResizeObserver is needed; add it only with a reproducing test.
- [x] Test desktop→phone and portrait→landscape transitions with the dialog open, then Escape/Close and reopen; assert no duplicate wrappers, listeners or stale scroll locks.

## Task 3 — Verify, document and open a PR

- [x] Review the full diff against current main and Claude's latest branch. Do not replace or cherry-pick #259's copy changes unnecessarily.
- [x] Re-run the changed focus and landscape cases, then the existing mobile, dialog, tour and role-preview regressions affected by the new focus expectations.
- [x] Capture and inspect portrait and landscape dialogs on the disposable local site. Real iPhone follow-up remains required.
- [x] Update user-guide and touch checklist to match final behavior. Preserve accepted prior human results and contextual-controls deferral.
- [x] Run JavaScript syntax, unit tests, documentation checks, `git diff --check`; commit only task files, push and open a PR with validation and hardware limitations clearly stated. Attach the PR to this task.
- [x] Do not merge automatically: this task asks for fixes; hand off the reviewable PR and CI status.

## Verification evidence and environment

Before the last focus-audit edits, **28 tests passed**: new mobile selection/dialog tests, `mobile-usability`, `dialog-close`, and portrait/landscape `phone-layout`. This includes compact portrait dialogs, no input autofocus on open, header dismissal, background locking, simulated portrait keyboard, RTL handoff, and desktop→phone resize. It does **not** yet prove the later group/person focus edits or landscape keyboard behavior.

Existing disposable wp-env owning directory: `/tmp/maestro-preview-rebase.cwFlaV`. Test URL: `http://localhost:8893` (IPv4; several other localhost ports have unrelated IPv6 services). Do not stop unrelated sites. Container: `wp-env-maestro-preview-rebasecwflav-22c10b5c-tests-wordpress-1`.

Docker mounts on this host are not live mirrors of the Mac draft. Copy changed runtime files into that **tests** container before browser tests:

```sh
docker cp assets/maestro.js wp-env-maestro-preview-rebasecwflav-22c10b5c-tests-wordpress-1:/var/www/html/wp-content/plugins/maestro-menu-editor/assets/maestro.js
docker cp assets/maestro.css wp-env-maestro-preview-rebasecwflav-22c10b5c-tests-wordpress-1:/var/www/html/wp-content/plugins/maestro-menu-editor/assets/maestro.css
```

Run the following from `/tmp/maestro-preview-rebase.cwFlaV`, so WP-CLI fixtures target the existing disposable environment, while Playwright loads this branch's tests:

```sh
WP_ENV_TESTS_PORT=8893 node node_modules/@playwright/test/cli.js test --config=/tmp/maestro-mobile-dialog/playwright.config.ts mobile-selection-dialogs.spec.ts mobile-usability.spec.ts dialog-close.spec.ts specs/phone-layout.spec.ts specs/role-preview.spec.ts
```

Use normal setup dependencies for fresh authentication. `--project=chromium --no-deps` was used for the prior 28-test run with an existing valid auth state; if login fails, rerun with setup instead of weakening assertions. If this environment is unavailable, create a fresh disposable environment after checking free ports rather than assuming these paths/containers exist.

## Next agent's first actions

1. Read this plan, user-level WordPress policy/access guide, worktree status and diff.
2. Confirm the untracked selection/dialog test and draft files are present; do not reset them.
3. Finish Tasks 1 and 2's unchecked landscape/focus steps before claiming mobile polish complete.
4. Preserve touch acceptance as open and leave contextual menu-item redesign for the later pass.
