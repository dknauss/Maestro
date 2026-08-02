---
phase: 20-third-party-compatibility-fixes
plan: 05
subsystem: menu-config
tags: [php, phpunit, cascade-hide, visibility, cosmetic-only-guardrail]

# Dependency graph
requires:
  - phase: 20-third-party-compatibility-fixes (20-01)
    provides: "Config::sanitize() items loop / qualified-key contract this plan's cascade_hide flag plugs into (parent-only, dropped on qualified keys)"
  - phase: 20-third-party-compatibility-fixes (20-04)
    provides: "Replay::replay()'s submenu title-write seam this plan's visibility change sits alongside, untouched"
provides:
  - "Maestro\\Cascade::effective_hidden_roles() — pure, WP-free role-list union (child own ∪ parent's hidden_roles when cascade_hide is on); never touches a capability"
  - "Config::sanitize() cascade_hide flag acceptance (per top-level parent item, normalized bool, default OFF, dropped on qualified submenu keys)"
  - "Replay::replay()'s submenu loop applying the parent cascade to every live child, unioned with each child's own hidden_roles rule"
  - "Replay::get_menu_model() exposing each parent's resolved cascade_hide flag for the editor popover (20-06)"
affects: [20-06-cascade-editor-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure role-list union as the whole cascade contract: Cascade::effective_hidden_roles(child_own, cascade_hide, parent_hidden_roles) — a plain union naturally implements 'rides the parent hide' (empty parent set contributes nothing) and 'role-mirror' (only the parent's actual hidden_roles are added) with no special-casing"
    - "A child with no override of its own is no longer skipped outright in the submenu loop — the parent's cascade may still hide it; is_hidden_for_current_user() is now always called against the UNIONED effective list, not the raw stored override"

key-files:
  created:
    - includes/class-cascade.php
    - tests/unit/CascadeTest.php
  modified:
    - includes/class-config.php
    - includes/class-replay.php
    - tests/unit/ConfigSanitizeTest.php
    - tests/integration/ReplayTest.php
    - maestro-menu-editor.php
    - tests/bootstrap-unit.php
    - TESTING.md

key-decisions:
  - "Cascade home is a new Maestro\\Cascade class (not a Replay method) — mirrors the Title/Ordering/Slug pattern of a pure, WP-free static helper unit-tested without bootstrapping WP; Replay stays the only WP-coupled caller"
  - "The pure function is a single unconditional union (array_unique(array_merge(...))) gated only by the cascade_hide bool — no separate 'rides the parent hide' or 'role-mirror' branches are needed, because merging with an empty/absent role list is naturally a no-op and only the parent's OWN hidden_roles ever enter the union"
  - "Parent lookup for cascade is bare top-level key ONLY, via the same norm_items/norm_skip Axis-1 guard (and the top-level Axis-2 top_skip_rendered guard) already computed in replay() — an ambiguous parent resolves to no override and cascade never fires for it, consistent with the existing 'when resolution is ambiguous, apply nothing' philosophy"
  - "get_menu_model() cascadeHide resolves via a new resolved_cascade_hide() helper mirroring resolved_hidden_roles()'s normalized-lookup pattern, returning false (not merely absent) for an untouched parent"

requirements-completed: [COMPAT-10]

# Metrics
duration: ~55min
completed: 2026-08-01
---

> **SUPERSEDED (2026-08-01, during 20-06 execution).** This plan's boolean
> `cascade_hide` + "rides the parent hide" model was found **inert**:
> WordPress core's `_wp_menu_output()` never renders a hidden parent's
> `<ul class="wp-submenu">` at all, so hiding the parent already removes the
> whole subtree cosmetically — cascading on top of that produced no
> observable difference. It was reworked in the 20-06 rework commits into an
> **independent** per-parent `child_hidden_roles` role set (hides all live
> children from those roles, WITH THE PARENT LEFT VISIBLE — a genuinely
> visible effect). See `20-CONTEXT.md`'s COMPAT-10 REVISION NOTE and
> `20-06-SUMMARY.md` for the final, shipped design. `Maestro\Cascade`,
> `Config::sanitize()`'s flag handling, and every test this summary
> describes were replaced; none of the code below ships as originally
> written.

# Phase 20 Plan 05: Cascade-Hide-to-Children Server (COMPAT-10) Summary

**A pure `Maestro\Cascade::effective_hidden_roles()` role-list union — gated by a new per-parent `cascade_hide` config flag (default OFF) — is wired into `Replay::replay()`'s submenu loop so hiding a parent optionally hides every live child cosmetically, role-mirrored and unioned with each child's own rule, proven cosmetic-only by an explicit capability-unchanged guardrail test.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-08-01 (session start, following 20-04)
- **Completed:** 2026-08-02T04:01:49Z
- **Tasks:** 2/2 completed
- **Files modified:** 9 (2 created: `includes/class-cascade.php`, `tests/unit/CascadeTest.php`; 7 modified)

## Accomplishments

- `Maestro\Cascade::effective_hidden_roles( $child_hidden_roles, $cascade_hide, $parent_hidden_roles )` — a pure, WP-free static helper. Cascade OFF returns the child's own `hidden_roles` unchanged (zero regression); cascade ON returns the deduplicated union with the parent's `hidden_roles`. A plain union alone implements both locked sub-rules: "rides the parent hide" (a parent hidden from nobody contributes nothing) and "role-mirrored" (only the roles the parent is actually hidden from are ever added — never a role the cascade shouldn't reach). The function never calls `current_user_can()` or any capability API.
- `Config::sanitize()` accepts a `cascade_hide` flag on a top-level item only: a truthy value normalizes to a stored bool `true`; absent/falsey emits nothing (default OFF, per the phase's locked success criterion); a qualified `parent>child` submenu key never carries it, mirroring the existing icon-drop rule (cascade is a parent concept).
- `Replay::replay()`'s submenu loop resolves the parent's own bare-key override once per parent (respecting the existing Axis-1/Axis-2 collision guards), then for every child — including one with NO override of its own — unions the child's own `hidden_roles` with the parent's cascade-gated `hidden_roles` via `Cascade::effective_hidden_roles()` before the existing `is_hidden_for_current_user()` check. When cascade is off or the parent has no override, the union collapses to exactly the child's own rule — the pre-existing hide behavior is unchanged by construction.
- `Replay::get_menu_model()` exposes each parent's resolved `cascade_hide` flag (`resolved_cascade_hide()`, mirroring `resolved_hidden_roles()`'s normalized-lookup pattern) so the Plan 20-06 editor popover can reflect it; an untouched parent reports `false`, not merely an absent key.
- **Cosmetic-only guardrail (mandatory, verified):** an explicit integration test snapshots the editor role's entire capabilities map and `current_user_can('edit_posts')`/`current_user_can('manage_options')` before applying a cascade rule, applies the rule (parent hidden + cascade on, a live child cosmetically removed from `$submenu`), and asserts both are **byte-for-byte identical** afterward — proving cascade never grants or removes a capability. A companion assertion confirms the exact capability the hidden child's own page gates direct access on (`edit_posts`) still resolves `true` for the editor, i.e. the page remains directly loadable by URL even though its sidebar row was `unset()`.
- Verified with dedicated fixtures against `seed_menu()`'s three-child `edit.php` parent: cascade OFF leaves all children visible (zero regression); cascade ON hides ALL three live children, not just one; cascade rides the parent hide (flag on, parent hidden from nobody → no-op); role-mirror (an administrator the parent isn't hidden from still sees every child); union (a child's own `hidden_roles` rule for a role the parent's cascade doesn't reach still fires); and the model exposes `cascadeHide` correctly for both a flagged and an untouched parent.
- Full suite green: PHP unit 114/114 → **128/128** (141 → 160 assertions), PHP integration 65/65 → **72/72** (150 → 168 assertions), phpcs clean, PHPStan clean, `npm run check:doc-links` clean. `TESTING.md` canonical counts and layer descriptions updated in the same commits as each count change.

## Task Commits

Each task was committed atomically:

1. **Task 1: Pure cascade computation + sanitize() cascade_hide flag** - `5b575bf` (feat)
2. **Task 2: Wire cascade into replay child-visibility + model + guardrail** - `e740b32` (feat)

**Plan metadata:** (pending — this commit)

_Per this project's test-blocking commit gate (a pre-commit hook runs the test suite), RED was verified in the working tree before each GREEN commit, never committed standalone: Task 1 by temporarily stubbing `Cascade::effective_hidden_roles()` to always return `array()` and blanking the `cascade_hide` sanitize block, confirming 7/9 `CascadeTest` cases and 2/28 `ConfigSanitizeTest` cases failed, then restoring the real implementation (128/128 green). Task 2 by `git stash`-ing the `class-replay.php` changes and re-running the new `ReplayTest` cascade cases against the pre-cascade replay code, confirming 3 failures (all-children-hidden, cosmetic-only-guardrail, model-exposes-flag), then restoring (72/72 green). Each task then committed test+impl together as ONE green commit, per CLAUDE.md's test-blocking-gate exception to the standalone-RED-commit rule._

## Files Created/Modified

- `includes/class-cascade.php` - New pure `Cascade` class; `effective_hidden_roles()` static helper (role-list union, no WordPress calls, no capability checks)
- `tests/unit/CascadeTest.php` - New; 9 test methods covering flag-off passthrough, flag-on union, rides-the-parent-hide, role-mirror, union-with-own-rule, deduplication, and multi-role cascade
- `includes/class-config.php` - `sanitize()` gains a `cascade_hide` block (parent-only, normalized bool, dropped on qualified keys) alongside the existing icon-drop rule
- `tests/unit/ConfigSanitizeTest.php` - 5 new test methods: truthy-normalizes-to-bool, false-not-stored, absent-not-stored, dropped-on-qualified-key, coexists-with-hidden_roles-and-other-caps
- `includes/class-replay.php` - Submenu loop resolves the parent's own bare-key override (`$parent_ovr`/`$parent_cascade_hide`/`$parent_hidden_roles`) once per parent; each child's hide decision now runs `Cascade::effective_hidden_roles()` before `is_hidden_for_current_user()`; the early `continue` on a childless override was removed so cascade can still fire for it; `get_menu_model()` gains `resolved_cascade_hide()` and a `cascadeHide` field per top-level node
- `tests/integration/ReplayTest.php` - 8 new test methods under a "COMPAT-10: cascade-hide to children (20-05)" section, including the mandatory cosmetic-only guardrail
- `maestro-menu-editor.php` - `require_once` for `includes/class-cascade.php` added to the plugin's boot require list
- `tests/bootstrap-unit.php` - `require_once` for `includes/class-cascade.php` added to the pure-unit bootstrap's require list
- `TESTING.md` - Unit count 114/114→128/128 (141→160 assertions), integration count 65/65→72/72 (150→168 assertions); layer descriptions in sections 1 and 2 mention the new `Cascade`/COMPAT-10 coverage and the cosmetic-only guardrail, with markdown links (doc-links check passes)

## Decisions Made

- Cascade lives in its own pure class (`Maestro\Cascade`), not a `Replay` method — matches the established `Title`/`Ordering`/`Slug` pattern of a WP-free static helper carried by the fast unit suite, keeping `Replay` the sole WP-coupled caller.
- The pure computation is a single unconditional role-list union gated only by the `cascade_hide` bool — no separate branches for "rides the parent hide" or "role-mirror" were needed, since those two locked sub-rules fall out for free from a plain union over the parent's OWN `hidden_roles` (an empty/absent parent set contributes nothing; no role outside that set is ever added).
- Cascade's parent lookup reuses the exact same `norm_items`/`norm_skip` (Axis-1) and `top_skip_rendered` (Axis-2) guards `replay()` already computes for the top-level pass — an ambiguous parent simply resolves to no override, so cascade never fires for it, consistent with the project's "when resolution is ambiguous, apply nothing" collision philosophy.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' `must_haves.truths` and `done` criteria were met without any Rule 1-4 fixes; no architectural questions arose. The mandatory cosmetic-only guardrail test was included exactly as specified, asserting both a byte-for-byte-unchanged capabilities map and an unchanged `current_user_can()` result for the exact capability the hidden child's page itself gates on.

## Issues Encountered

- Docker/Colima was not running at session start (needed for `composer test:integration`/`npm run test:php` against the real WP test suite). Started Colima (existing VM, 18GB free — above the 15GB sweep threshold, no recreate needed) and `npx wp-env start`. Tore both down at the end: `npx wp-env destroy` (confirmed via `docker ps -a` showing zero containers) then `colima stop`. Not a plan deviation — standard environment lifecycle per this session's hygiene conventions.
- `git commit` (SSH key signing) and `composer analyse:phpstan` (PHPStan's parallel worker binds a local TCP socket) required the sandbox disabled per this project's established convention; both ran clean with the sandbox disabled, no code issues. `npx wp-env start`/`destroy` also required the sandbox disabled (Docker daemon access).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- COMPAT-10's server-side contract is fully complete and unit/integration-proven: the `cascade_hide` flag round-trips through `Config::sanitize()`, `Replay::replay()` applies it correctly (rides-the-parent-hide, role-mirrored, unioned with each child's own rule, all-live-children), `get_menu_model()` exposes it, and the cosmetic-only guardrail is explicitly proven (capabilities untouched, the hidden child's own page capability requirement still resolves).
- Plan 20-06 (editor UI) can now consume `node['cascadeHide']` from `get_menu_model()` directly to render the "also hide children" checkbox inside the existing visibility popover, per 20-CONTEXT.md's locked decision (shown only on parents with children; always enabled; effect gated at replay, exactly as this plan implements it).
- No blockers. Zero-regression gate confirmed green across this plan's changes: PHP unit 128/128, PHP integration 72/72, phpcs clean, PHPStan clean, doc-links clean. E2E was not required for this plan (server-side-only fix per the plan's `<verification>` section) and was not run.

---

*Phase: 20-third-party-compatibility-fixes*
*Completed: 2026-08-01*

## Self-Check: PASSED

- FOUND: includes/class-cascade.php
- FOUND: tests/unit/CascadeTest.php
- FOUND: includes/class-config.php
- FOUND: includes/class-replay.php
- FOUND: tests/unit/ConfigSanitizeTest.php
- FOUND: tests/integration/ReplayTest.php
- FOUND: maestro-menu-editor.php
- FOUND: tests/bootstrap-unit.php
- FOUND: TESTING.md
- FOUND: commit 5b575bf
- FOUND: commit e740b32
