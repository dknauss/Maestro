---
phase: 20-third-party-compatibility-fixes
plan: 06
subsystem: menu-config
tags: [php, phpunit, playwright, editor-ui, visibility, cosmetic-only-guardrail, child-hidden-roles]

# Dependency graph
requires:
  - phase: 20-third-party-compatibility-fixes (20-01)
    provides: "Config::sanitize() items loop / qualified-key contract child_hidden_roles plugs into (parent-only, dropped on qualified keys)"
  - phase: 20-third-party-compatibility-fixes (20-03)
    provides: "assets/maestro.js qualified-key submenu DOM association the visibility popover's group-scoping relies on"
  - phase: 20-third-party-compatibility-fixes (20-05, SUPERSEDED)
    provides: "The original cascade_hide seam this plan replaced wholesale — Maestro\\Cascade class shape, Config::sanitize() parent-flag pattern, Replay submenu-loop union point"
provides:
  - "Maestro\\Cascade::effective_hidden_roles( $child_hidden_roles, $parent_child_hidden_roles ) — pure, unconditional role-list union; never touches a capability"
  - "Config::sanitize() child_hidden_roles acceptance (per top-level parent item, same shape/caps as hidden_roles, dropped on qualified submenu keys)"
  - "Replay::replay()'s submenu loop unioning each child's own hidden_roles with its parent's child_hidden_roles, fully independent of the parent's own hidden_roles"
  - "Replay::get_menu_model() exposing each parent's childHiddenRoles array (empty, not merely absent, for an untouched parent)"
  - "Two independent role-checkbox groups in the visibility popover — \"Hide this item from:\" (existing) and \"Hide its sub-items from:\" (new) — the second shown ONLY on a top-level parent with children"
  - "tests/e2e/specs/cascade-hide.spec.ts proving the revised, VISIBLE behavior directly against the rendered sidebar (parent stays, children vanish) instead of the inert model's wp-cli/$submenu dump workaround"
affects: [22-demo-playground, 24-release]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Independent role-set union as the whole child-hiding contract: Cascade::effective_hidden_roles(child_own, parent_child_hidden_roles) is a single unconditional array_unique(array_merge(...)) — no flag, no gating on the parent's own hidden_roles at all. The two role sets (parent's own hidden_roles vs parent's child_hidden_roles) are stored, resolved, and applied through completely separate code paths that happen to share the same Axis-1/Axis-2 parent-lookup guard."
    - "buildRoleGroup() helper in assets/maestro.js: one closure builds an arbitrary role-checkbox group bound to any model field via getSet/setSet accessors — the popover now composes N independent groups from one code path instead of hand-rolling a second control shape per feature."
    - "Revised-model verification pattern: when a cosmetic effect becomes genuinely visible in the DOM (unlike the superseded inert cascade), e2e specs assert it DIRECTLY against the rendered sidebar via a second authenticated browser context, rather than reaching for a wp-cli/PHP dump of internal $submenu state."

key-files:
  created:
    - tests/e2e/specs/cascade-hide.spec.ts (rewritten, not created — pre-existing from the superseded plan)
  modified:
    - includes/class-cascade.php
    - includes/class-config.php
    - includes/class-replay.php
    - assets/maestro.js
    - assets/maestro-logic.js
    - assets/maestro.css
    - includes/class-assets.php
    - tests/unit/CascadeTest.php
    - tests/unit/ConfigSanitizeTest.php
    - tests/integration/ReplayTest.php
    - tests/integration/LocalizationTest.php
    - tests/js/modified-diff.test.mjs
    - tests/js/reset-item.test.mjs
    - tests/e2e/editor.spec.ts
    - TESTING.md
  deleted:
    - tests/e2e/fixtures/dump-cascade-submenu.php

key-decisions:
  - "child_hidden_roles is a second, wholly independent role set — not a flag gating a union with the parent's own hidden_roles. Deleting the boolean simplified Cascade::effective_hidden_roles() to a single unconditional union with no special-casing at all (simpler than the already-simple superseded version)."
  - "Kept the Maestro\\Cascade class name and the effective_hidden_roles() method name across the rework (only the signature/semantics changed) rather than renaming to something like ChildVisibility — the class still computes an effective hidden-roles union from two role-list inputs; a rename would have widened the diff without changing the contract's shape."
  - "The visibility popover's two groups share one buildRoleGroup() closure keyed by getSet()/setSet() accessors, rather than duplicating the role-checkbox-rendering logic per group — a toggle in one group never touches the other's model field or the maestro-has-hidden class (which reflects only the item's own hiddenRoles, by design)."
  - "cascade-hide.spec.ts asserts the revised behavior directly against the rendered sidebar (parent visible, child rows gone) via a second authenticated browser context — the wp-cli/$submenu dump technique (tests/e2e/fixtures/dump-cascade-submenu.php) the inert model needed is now unnecessary and was deleted, not kept as dead weight."
  - "editor.spec.ts's pre-existing 'per-role visibility' test (which selects Media, a parent with children) was deliberately reconciled to scope its role checkbox to .maestro-vis-own — Media now has a second 'Editor' checkbox in the new sub-items group, and the fix keeps the existing test's original intent (hide Media itself) rather than silently deleting or loosening the assertion."

requirements-completed: [COMPAT-10]

# Metrics
duration: ~2h
completed: 2026-08-02
---

# Phase 20 Plan 06: Independent Child-Hiding Editor UI + Full-Suite Gate (COMPAT-10 Revised) Summary

**Two independent role-checkbox groups in the visibility popover — "Hide this item from:" and, on parents with children, "Hide its sub-items from:" — replace the inert boolean cascade-hide checkbox, wired through a reworked `Maestro\Cascade::effective_hidden_roles()` and a new `child_hidden_roles` config field, proven end-to-end by an e2e spec that asserts the now-genuinely-visible effect directly against the rendered sidebar.**

## Performance

- **Duration:** ~2h (this rework session; supersedes the original 20-06 execution)
- **Completed:** 2026-08-02
- **Tasks:** 4 (server rework, editor UI rework, e2e rework, full gate) — all committed atomically
- **Files modified:** 15 modified, 1 deleted (`dump-cascade-submenu.php`)

## Accomplishments

- **Root cause diagnosed and fixed at the design level, not just the code level.** The boolean `cascade_hide` + "rides the parent hide" model built in 20-05/20-06 was empirically verified inert during checkpoint verification: WordPress core's `_wp_menu_output()` (`wp-admin/menu-header.php`) never renders a parent's `<ul class="wp-submenu">` once the parent's own `$menu` row is `unset()`, so hiding the parent already removes the whole subtree cosmetically regardless of any cascade flag. The fix wasn't a bug patch — it was re-deciding the feature's semantics (locked in `20-CONTEXT.md`'s REVISION NOTE) so child-hiding has an observable effect independent of the parent's own visibility.
- **`Maestro\Cascade::effective_hidden_roles( $child_hidden_roles, $parent_child_hidden_roles )`** — simplified from the superseded 3-argument, flag-gated version to a single unconditional role-list union. Still pure (no WordPress calls, no capability checks); still unit-tested WP-free.
- **`Config::sanitize()`** drops `cascade_hide` entirely and accepts `child_hidden_roles` on a top-level item with the exact same contract as `hidden_roles` (role-intersect against `wp_roles()`, `MAX_HIDDEN_ROLES` cap, dropped on a qualified `parent>child` submenu key, dropped when empty).
- **`Replay::replay()`'s submenu loop** resolves the parent's `child_hidden_roles` (bare-key only, reusing the existing Axis-1/Axis-2 collision guards) and unions it into every child's own `hidden_roles` via `Cascade::effective_hidden_roles()` — completely independent of whether the parent's own `hidden_roles` currently hides the parent row. `get_menu_model()` exposes `childHiddenRoles` (an array, empty — not merely absent — for an untouched parent) in place of the old `cascadeHide` boolean.
- **Editor UI**: `openVisibilityPicker()` now composes the popover from a shared `buildRoleGroup()` closure — Group 1 ("Hide this item from:", existing `hidden_roles`, always shown) and Group 2 ("Hide its sub-items from:", new `child_hidden_roles`, shown only on a top-level parent with children). The two groups are fully independent: toggling one never touches the other's model field, and only Group 1's toggle updates the item's own `maestro-has-hidden` class.
- **e2e proof rewritten to match the now-visible behavior.** Because the revised model leaves the parent visible while hiding its children, `cascade-hide.spec.ts` asserts the effect DIRECTLY against the rendered sidebar in a second authenticated browser context (parent's row present, its child rows gone, role-mirrored — an admin not targeted still sees every child) instead of the inert model's wp-cli `$submenu` dump workaround (`tests/e2e/fixtures/dump-cascade-submenu.php`, deleted). The cosmetic-only guardrail is reconfirmed end-to-end: the hidden child page still loads by direct URL for a capable user.
- **Deliberate e2e reconciliation, not silent deletion.** `editor.spec.ts`'s pre-existing "per-role visibility" test selects Media (`upload.php`), which has children — so the popover now shows a second "Editor" checkbox in the new sub-items group. Scoped the existing assertion to `.maestro-vis-own` so the test still hides Media itself, with the reasoning documented inline and in the commit.
- **Full zero-regression gate, exact counts:**
  - `composer test:unit`: **127/127** (158 assertions)
  - `npm run test:php` (integration): **72/72** (172 assertions)
  - `npm run test:js`: **58/58**
  - `npm run test:e2e` (full): **35 passed, 28 capture-gated skipped, 0 failed**
  - `composer lint` (WPCS): clean
  - `composer analyse:phpstan`: 0 errors
  - Plugin Check against the built shippable ZIP (`bin/build.sh`, scanned with `--slug=maestro-menu-editor` so the temp-folder-name workaround doesn't trip the text-domain check): **0 errors**, 1 pre-existing `readme.txt` warning (`upgrade_notice_limit`)
  - Plugin Check against the dev-tree (`--exclude-directories` per the Phase 17/23 convention): 7 errors / 7 warnings, all against plugin-root dev-tooling files (`.lycheeignore`, `.wp-env.json`, `phpunit-*.xml.dist`, `phpstan.neon.dist`, `phpcs.xml.dist`, `.gitignore`, `.distignore`, non-standard root markdown, `readme.txt`'s upgrade-notice length) — confirmed via `git log --diff-filter=A` that every flagged file predates Phase 20 (oldest: the initial commit; newest: the lychee CI hardening commit). Zero NEW errors on code this phase touched.

## Task Commits

Each task was committed atomically (this rework supersedes, but does not rewrite, the original 20-05/20-06 history):

1. **Server rework — replace cascade_hide boolean with independent child_hidden_roles** - `972fba1` (refactor)
2. **Editor UI rework — two independent role groups replace the cascade-hide checkbox** - `be73fff` (feat)
3. **e2e rework — proof of independent child_hidden_roles** - `10222d2` (test)
4. **Full zero-regression gate + canonical counts** - `de0c998` (docs)

**Plan metadata:** (pending — this commit)

_Per this project's test-blocking commit gate, RED was verified in the working tree before each GREEN commit where the change was TDD-eligible (pure `Cascade` logic, `Config::sanitize()`, JS `diffItem()`/`resetItem()`): the old assertions/signatures were run against the new implementation first (visible failures — signature mismatches and semantic differences), then test bodies were reworked to match the revised, locked contract and re-run to green. Server and editor UI were committed as ONE green commit per logical unit; the e2e spec and the full gate were their own commits._

## Files Created/Modified

- `includes/class-cascade.php` - `effective_hidden_roles()` reworked from a 3-arg flag-gated computation to a 2-arg unconditional union
- `includes/class-config.php` - `cascade_hide` handling removed; `child_hidden_roles` accepted on top-level items, same shape/caps as `hidden_roles`
- `includes/class-replay.php` - submenu loop resolves the parent's `child_hidden_roles` (not `cascade_hide`+`hidden_roles`) and unions it independently of the parent's own hide; `get_menu_model()` exposes `childHiddenRoles`
- `assets/maestro.js` - `openVisibilityPicker()` rebuilt around `buildRoleGroup()`; `init()`/`resetSelected()`/`buildConfig()` swap `cascadeHide` for `childHiddenRoles`
- `assets/maestro-logic.js` - `diffItem()`/`resetItem()` swap `cascadeHide` handling for `childHiddenRoles` (same length-only rule)
- `assets/maestro.css` - `.maestro-vis-cascade` divider renamed `.maestro-vis-children`; new `.maestro-vis-group` spacing rule
- `includes/class-assets.php` - `hideFrom` reworded to "Hide this item from:"; new `hideChildrenFrom` i18n key "Hide its sub-items from:"; `cascadeHide` key removed
- `tests/unit/CascadeTest.php` - reworked for the 2-arg union contract (6 tests, was 9)
- `tests/unit/ConfigSanitizeTest.php` - `cascade_hide` test section replaced with `child_hidden_roles` tests (6 tests, was 5)
- `tests/integration/ReplayTest.php` - COMPAT-10 section reworked: parent-stays-visible-while-children-hide, parent-hide/child-hide independence, role-mirror, union, model exposure, cosmetic-only guardrail (7 tests, was 6)
- `tests/integration/LocalizationTest.php` - asserts the new `hideChildrenFrom` i18n key
- `tests/js/modified-diff.test.mjs`, `tests/js/reset-item.test.mjs` - `cascadeHide` cases replaced with `childHiddenRoles` cases, plus an independence test
- `tests/e2e/specs/cascade-hide.spec.ts` - rewritten to assert the revised, visible behavior directly against the rendered sidebar
- `tests/e2e/editor.spec.ts` - per-role-visibility test scoped to `.maestro-vis-own`
- `tests/e2e/fixtures/dump-cascade-submenu.php` - deleted (superseded workaround, no longer needed)
- `TESTING.md` - canonical counts and layer descriptions updated for the revised model and final totals

## Decisions Made

- The two role sets (`hidden_roles` on the parent, `child_hidden_roles` also on the parent) are fully independent by construction — there is no shared gating logic between them anywhere in the stack (config, replay, model, or UI). This is what makes the feature's effect observable: a parent can stay visible while its children vanish, which the superseded model could never produce.
- Kept the `Cascade` class/method names rather than renaming — the contract ("compute an effective hidden-roles union from two role-list inputs") is unchanged in shape even though the semantics of the second input changed.
- `buildRoleGroup()` in `assets/maestro.js` is the single code path for both popover groups, keyed by `getSet()`/`setSet()` accessors — avoids a second hand-rolled role-checkbox renderer and keeps the two groups' independence enforced by construction (each accessor only ever touches its own model field).
- `dump-cascade-submenu.php` was deleted rather than left as dead code — the wp-cli/`$submenu`-dump workaround it existed for was needed only because the superseded model's effect was invisible in the sidebar; the revised model's effect is directly visible, so a second authenticated browser context (the same pattern `editor.spec.ts`'s existing per-role-visibility test already uses) is both simpler and more genuinely end-to-end.

## Deviations from Plan

None beyond what the orchestrator's prompt explicitly directed — this whole plan IS the deviation (a user-approved design revision superseding 20-05/20-06's original execution), not an unplanned one. Within that reworked scope, no Rule 1-4 auto-fixes were needed; the one out-of-band fix (`editor.spec.ts`'s per-role-visibility test needing `.maestro-vis-own` scoping) was an anticipated, explicitly-licensed reconciliation per the plan's own "reconcile e2e drift caused by the new control" instruction, not an unplanned discovery.

## Issues Encountered

- **Playwright locator ambiguity**: `editor.spec.ts`'s existing "per-role visibility" test broke because Media (`upload.php`) has children, so the popover now shows a second "Editor" checkbox in the new sub-items group. Fixed by scoping the existing assertion to `.maestro-vis-own`, with the reasoning documented inline (see Files Created/Modified above).
- **WP core submenu label drift**: the original e2e draft selected the Posts "Add New" submenu row by label text; this WP install (7.0.2) renders it as "Add Post". Fixed by selecting via `a[href="post-new.php"]` instead of label text, avoiding coupling to wording that varies by WP version.
- **Plugin Check text-domain false positives**: scanning the built shippable ZIP under a differently-named temp folder (to avoid colliding with the live bind-mounted plugin directory) tripped `WordPress.WP.I18n.TextDomainMismatch` on every translation call, since Plugin Check compares the text domain string against the folder slug. Resolved by using `wp plugin check <folder> --slug=maestro-menu-editor` to tell Plugin Check the correct canonical slug independent of the scratch folder's name — confirmed 0 errors, matching the prior gate's result.
- Docker/Colima and wp-env were already running from the prior (superseded) 20-06 session; reused as-is per this plan's environment note. Left running per the checkpoint instructions below.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- COMPAT-10 is now genuinely delivered: an admin can hide a parent's sub-items from specific roles while the parent stays visible — a real, observable feature, not a cosmetic no-op layered on top of an already-total hide.
- All three Phase 20 requirements (COMPAT-04, COMPAT-07, COMPAT-10) are complete. Phase 20 is done pending the human-verify checkpoint below.
- Phase 22 (DEMO-01, Playground demo) can now showcase COMPAT-10 as a real, visible behavior rather than a flag with no observable effect.
- wp-env is left running (per this plan's instructions) for the checkpoint's live verification — do not tear down until the checkpoint is resolved.

---

*Phase: 20-third-party-compatibility-fixes*
*Completed: 2026-08-02*

## Self-Check: PASSED

- FOUND: includes/class-cascade.php
- FOUND: includes/class-config.php
- FOUND: includes/class-replay.php
- FOUND: assets/maestro.js
- FOUND: assets/maestro-logic.js
- FOUND: assets/maestro.css
- FOUND: includes/class-assets.php
- FOUND: tests/unit/CascadeTest.php
- FOUND: tests/unit/ConfigSanitizeTest.php
- FOUND: tests/integration/ReplayTest.php
- FOUND: tests/integration/LocalizationTest.php
- FOUND: tests/js/modified-diff.test.mjs
- FOUND: tests/js/reset-item.test.mjs
- FOUND: tests/e2e/specs/cascade-hide.spec.ts
- FOUND: tests/e2e/editor.spec.ts
- FOUND: TESTING.md
- FOUND: .planning/phases/20-third-party-compatibility-fixes/20-05-SUMMARY.md
- FOUND: .planning/REQUIREMENTS.md
- CONFIRMED DELETED: tests/e2e/fixtures/dump-cascade-submenu.php
- FOUND: commit 972fba1
- FOUND: commit be73fff
- FOUND: commit 10222d2
- FOUND: commit de0c998
