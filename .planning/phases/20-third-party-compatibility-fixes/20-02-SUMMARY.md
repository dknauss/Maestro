---
phase: 20-third-party-compatibility-fixes
plan: 02
subsystem: menu-config
tags: [php, phpunit, wp-env, slug-normalization, replay, editor-model, qualified-keys]

# Dependency graph
requires:
  - phase: 20-third-party-compatibility-fixes (20-01)
    provides: "Maestro\\Slug::is_qualified()/split_qualified()/normalize_qualified() and Config::sanitize() qualified-key storage acceptance"
provides:
  - "Replay::replay() submenu loop resolves a rendered parent>child pair against a qualified normalized key first, with a legacy bare-key fallback (COMPAT-04 root fix)"
  - "Both Axis-1 (ambiguous stored keys) and Axis-2 (ambiguous rendered slugs) collision guards extended to cover the qualified-key path independently of the bare path"
  - "get_menu_model() submenu child nodes emit a qualifiedKey field and resolve hiddenRoles through the same qualified-first/bare-fallback lookup as replay(), keeping editor display and apply in lockstep"
affects: [20-03-a1b-client-fix, 22-demo-showcase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-parent qualified lookup: for each rendered $parent => $children submenu block, build norm_parent once and compose norm_parent + '>' + norm_child as the qualified candidate key, checked before the legacy bare child key"
    - "Independent Axis-2 pre-scans per lookup path: a rendered collision on the qualified path never vetoes the bare path and vice versa"
    - "resolved_hidden_roles($slug, ..., $parent_slug = null): null parent_slug = top-level (bare-only); non-null = submenu child (qualified-first, bare-fallback) — one function serves both call sites without duplicating the resolution contract"

key-files:
  created: []
  modified:
    - includes/class-replay.php
    - tests/integration/ReplayTest.php
    - TESTING.md

key-decisions:
  - "normalized_items() switched from Slug::normalize() to Slug::normalize_qualified() for the stored-key half of the Axis-1 lookup — bare keys behave identically (normalize_qualified delegates to normalize() when not qualified), so this extends the Axis-1 guard to qualified keys with zero risk to existing bare-key behavior"
  - "A qualified key's parent-half miss requires no explicit skip check: the qualified candidate key is only ever built from the ACTUAL rendered parent in the current loop iteration, so a stored qualified key whose parent doesn't match any rendered parent simply never produces a matching lookup key — it degrades silently by construction"
  - "qualifiedKey field added alongside slug (not replacing it) in get_menu_model()'s submenu nodes, per plan's explicit discretion grant"

patterns-established:
  - "Qualified-vs-bare resolution order (qualified wins, bare is legacy fallback) is now consistent across all three consumers: normalized_items()/Axis-1, the submenu apply loop in replay(), and resolved_hidden_roles() for the editor model — no drift between apply-time and display-time resolution"

requirements-completed: [COMPAT-04]

# Metrics
duration: 40min
completed: 2026-08-01
---

# Phase 20 Plan 02: Qualified-Key Replay Wiring Summary

**`Replay::replay()`'s submenu loop and `get_menu_model()` now resolve a `parent>child` qualified override for exactly one submenu row (never a same-slug top-level item), with a legacy bare-key fallback that keeps every pre-existing config working unchanged until it is re-saved — closing the COMPAT-04 shared-slug collision (WooCommerce Products top + All Products submenu) at its root cause in the replay seam.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-08-01T19:01:07-06:00 (prior commit baseline)
- **Completed:** 2026-08-01T19:31:36-06:00
- **Tasks:** 2/2 completed
- **Files modified:** 3

## Accomplishments

- `Replay::replay()`'s submenu loop now builds a per-rendered-pair qualified normalized key (`norm(parent) > norm(child)`) and resolves it FIRST against the stored-override lookup; only when no qualified override exists for that exact parent+child pair does it fall back to the legacy bare child key — reproducing today's both-scope behavior exactly for configs that have never stored a qualified key.
- Both existing collision guards were preserved and extended, not replaced: Axis-1 (`normalized_items()`) now normalizes stored keys via `Slug::normalize_qualified()` so two ambiguous qualified keys veto each other exactly like two ambiguous bare keys always have; Axis-2 gained an independent pre-scan/skip-map for the qualified path alongside the existing bare-path pre-scan, so a rendered collision on one path can never falsely veto the other.
- A qualified key whose parent half matches no rendered parent in the current pass needs no special-case skip logic — the qualified candidate key is only ever constructed from the actual rendered parent being iterated, so an orphaned qualified override never produces a matching lookup key and silently degrades by construction (locked CONTEXT rule satisfied for free).
- `get_menu_model()` submenu child nodes now carry a `qualifiedKey` field (in addition to `slug`) so the client and the next full-replace save can address a submenu row independently of a same-slug top-level item; `resolved_hidden_roles()` gained an optional `$parent_slug` parameter so submenu hiddenRoles resolve qualified-first/bare-fallback — the exact same order `replay()` applies — while top-level hiddenRoles stay bare-only and never leak a same-slug submenu's qualified rule.
- Integration suite grew from 51/126 (baseline before this plan, all pre-existing tests still passing under the new resolution logic) to 60/60 (143 assertions) with 9 new `ReplayTest` cases covering shared-slug independence in both directions, legacy zero-regression, parent-half-miss skip, Axis-1-on-qualified-keys, per-half independent normalization, and the editor-model qualifiedKey/hiddenRoles round trip. Unit suite unaffected (103/103, 127 assertions — no unit-tested class touched). `TESTING.md`'s canonical integration count updated in both task commits.

## Task Commits

Each task was committed atomically:

1. **Task 1: Qualified-key submenu resolution in replay() with legacy bare fallback** - `2432aed` (feat)
2. **Task 2: Editor model + resolved_hidden_roles emit/consume qualified keys** - `73e6a6b` (feat)

**Plan metadata:** (pending — this commit)

_Note: per CLAUDE.md's test-blocking commit gate, each task's new `ReplayTest` cases were written and run to failure in the working tree first (confirmed RED by temporarily stashing only the `class-replay.php` implementation change and re-running the filtered test, per-task), then committed together with the GREEN implementation as one commit per task._

## Files Created/Modified

- `includes/class-replay.php` — `replay()`'s submenu loop resolves qualified-first with bare fallback (Task 1); `normalized_items()` uses `Slug::normalize_qualified()` (Task 1); `resolved_hidden_roles()` gained `$parent_slug` for qualified-aware resolution (Task 2); `get_menu_model()` submenu nodes emit `qualifiedKey` and pass the parent slug through (Task 2)
- `tests/integration/ReplayTest.php` — `seed_shared_slug_menu()` fixture (WooCommerce-style Products top-level + same-slug "All Products" submenu) plus 9 new test methods across both tasks
- `TESTING.md` — canonical integration count updated twice: 47/47 → 57/57 (Task 1), 57/57 → 60/60 (Task 2); final assertion count 143

## Decisions Made

- Reused `Slug::normalize_qualified()` inside `normalized_items()` rather than adding a parallel qualified-only lookup table — one normalized map serves both Axis-1 checks and both resolution paths (qualified and bare) without duplicating the ambiguity-veto logic. Zero behavior change for bare keys since `normalize_qualified()` delegates to `normalize()` when the key isn't qualified.
- Left the parent-half-miss rule entirely implicit (no explicit `continue`/skip branch needed) since the qualified candidate key is always constructed from the loop's own rendered parent — an orphaned stored qualified key can never build a key that matches anything in the current pass. Simpler and provably correct by construction rather than an added conditional.
- `qualifiedKey` chosen over `key` for the new model field name (per CONTEXT's granted discretion) — more explicit about what the value represents to any future client consumer.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' `must_haves.truths` and `done` criteria were met without any Rule 1-4 fixes; no architectural questions arose.

## Issues Encountered

- Docker/Colima was not running at session start (needed for `composer test:integration`/`npm run test:php` against the real WP test suite). Started Colima with `colima start` (existing VM, no recreate needed — disk headroom was 19GB, above the 15GB sweep threshold) and `npm run env:start`. Tore both down at the end: `npx wp-env destroy` (confirmed via `docker ps -a` showing zero containers) then `colima stop`. Not a plan deviation — standard environment lifecycle per this session's hygiene conventions.
- `composer analyse:phpstan` and all `git commit` invocations required the sandbox disabled per this project's established convention (PHPStan's parallel worker binds a local TCP socket; commit signing reads an SSH key) — both ran clean with the sandbox disabled, no code issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The qualified-key resolution contract (qualified-first, legacy-bare-fallback, both Axis guards intact, editor model in lockstep) is fully wired and integration-tested. Plan 20-03 (the minimal A1b client fix binding submenu DOM `<li>` elements by resolved slug/href) can now consume `get_menu_model()`'s new `qualifiedKey` field to address a shared-slug submenu row independently in the live inline editor.
- No blockers. The `sub_order` reorder path was deliberately left untouched (still parent-keyed, not qualified) per 20-01's explicit "do not touch it here" instruction — confirmed still passing (`test_sub_order_reorder_on_encoded_child_slugs`, `test_sub_order_reorder_preserves_rows_on_normalized_collision`).
- Icons remain top-level only; no qualified submenu override in this plan's tests carried an `icon` key, matching Config::sanitize()'s Task-2-of-20-01 icon-drop enforcement.

---

*Phase: 20-third-party-compatibility-fixes*
*Completed: 2026-08-01*

## Self-Check: PASSED

- FOUND: includes/class-replay.php
- FOUND: tests/integration/ReplayTest.php
- FOUND: TESTING.md
- FOUND: 20-02-SUMMARY.md
- FOUND: commit 2432aed
- FOUND: commit 73e6a6b
