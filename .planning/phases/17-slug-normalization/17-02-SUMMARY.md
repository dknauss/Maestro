---
phase: 17-slug-normalization
plan: "02"
subsystem: slug-normalization
tags: [replay, normalization, collision-guard, phpunit, phpcs, phpstan, integration]
dependency_graph:
  requires:
    - phase: 17-01
      provides: "Maestro\\Slug::normalize() pure resolver with decode→host-strip→denylist→sort pipeline"
  provides:
    - "Normalized-key resolution at all three replay() seams (items[] top-level :92, items[] submenu :128, sub_order reorder :140)"
    - "Dual-axis collision fail-safe in Replay::replay()"
    - "Integration test coverage for FIX-01/02/03 acceptance cases + collision no-op (deferred Docker run to 17-03)"
  affects: [Wave-3-integration-gate-17-03]
tech_stack:
  added: []
  patterns:
    - "Normalize once per replay() — build norm_items map and norm_skip set before any seam is touched"
    - "Axis-1 collision guard: two stored keys normalizing to same key → mark ambiguous, apply nothing"
    - "Axis-2 collision guard: pre-scan rendered slugs per scope; normalized key matching 2+ distinct rendered items → skip"
    - "Reorder threading: build normalized-slug copies of children for Ordering::submenu matching; map result back to original rows (non-destructive)"
    - "admin_url('') passed as $base from Replay — WP-coupled call stays in Replay, Slug stays WP-free"
key_files:
  created: []
  modified:
    - includes/class-replay.php
    - tests/integration/ReplayTest.php

key_decisions:
  - "Single normalized-key code path (NOT exact-first-then-fallback): always normalize BOTH stored override key and rendered slug"
  - "admin_url('') fetched once at replay() start and passed as $base to all Slug::normalize calls — keeps Slug WP-free"
  - "Ordering::submenu kept pure and untouched: threading via normalized copies of children + normalized desired list; original rows restored from orig_by_norm map"
  - "Sub_order parent key normalized via loop over cfg['sub_order'] keys (handles absolute/encoded parent slugs without changing the data model)"
  - "Axis-2 collision guard implemented as pre-scan pass before any mutation — safe to check rendered slugs against normalized keys without modifying globals"
  - "phpcbf alignment fix applied inline (same Rule-2 deviation pattern as Wave 1)"

requirements-completed: [FIX-01, FIX-02, FIX-03]

duration: 25min
completed: "2026-06-29"
---

# Phase 17 Plan 02: Replay Normalized-Key Resolution Summary

**Three exact-match seams in Replay::replay() converted to Slug::normalize() lookups with dual-axis collision fail-safe; 8 integration acceptance methods added to ReplayTest covering FIX-01/02/03 and collision no-op.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-06-29T21:44:08Z
- **Completed:** 2026-06-29T22:09:00Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Wired `Maestro\Slug::normalize()` into all three resolve seams without modifying `get_menu_model()`, `capture_pristine()`, or any stored config
- Implemented dual-axis collision fail-safe: Axis-1 (two stored keys normalizing to same key → apply nothing) and Axis-2 (one normalized key matching 2+ distinct rendered items in the same pass → apply nothing)
- Normalized the sub_order parent key lookup and child comparison so `Ordering::submenu` reorders by normalized slugs while keeping all rows non-destructive (original `$row[2]` values preserved in output)
- Authored 8 integration test methods in ReplayTest: FIX-01 host move + ver bump, FIX-02 UTM drift, FIX-03 both encoding directions, sub_order encoded-child reorder, collision no-op, and simple-slug anti-regression guard

## Task Commits

Each task was committed atomically:

1. **Task 1: Normalize two items[] seams + collision-skip** - `ea2121c` (feat)
2. **Task 2: Normalize submenu reorder seam** - `58fbda9` (feat)
3. **Task 3: Integration coverage in ReplayTest** - `24e180d` (test)

## Files Created/Modified

- `includes/class-replay.php` — Three seams converted to normalized-key lookups; norm_items map + dual-axis collision guards added; sub_order reorder threading via normalized copies
- `tests/integration/ReplayTest.php` — 8 integration acceptance methods for FIX-01/02/03 and collision no-op (deferred Docker run to 17-03)

## How normalize() Was Threaded Into Each Seam

**Shared setup (once per replay()):**

```php
$base = function_exists( 'admin_url' ) ? admin_url( '' ) : '';

// Build normalized lookup + Axis-1 collision guard
$norm_items = []; // normalized_key => override
$norm_skip  = []; // normalized_key => true (ambiguous)
foreach ( $items as $stored_key => $override ) {
    $nk = Slug::normalize( (string) $stored_key, $base );
    if ( isset( $norm_items[$nk] ) ) {
        $norm_skip[$nk] = true; unset( $norm_items[$nk] );
    } elseif ( ! isset( $norm_skip[$nk] ) ) {
        $norm_items[$nk] = $override;
    }
}
```

**Top-level seam (:92):** Pre-scan $menu for Axis-2 collisions (normalized key matching 2+ distinct rendered slugs → add to `$top_skip_rendered`). Then in the main loop: `$nk = Slug::normalize($row[2], $base)`, skip if in norm_skip or top_skip_rendered, look up `$norm_items[$nk]`.

**Submenu seam (:128):** Same Axis-2 pre-scan per parent's `$children`, then `Slug::normalize($row[2], $base)` lookup against `$norm_items`.

**Reorder seam (:140):** Normalize `$parent` key to find the matching `$cfg['sub_order']` entry. Build `$norm_desired` (normalized desired child slugs). Build `$norm_children` (copies with `$row[2]` temporarily normalized) and `$orig_by_norm` (normalized_key → original row). Call `Ordering::submenu($norm_children, $norm_desired)`. Map returned rows back to originals via `$orig_by_norm` — raw `$row[2]` values preserved in final `$submenu[$parent]`.

## Collision-Skip Mechanism (Both Axes)

**Axis-1 (stored-key collision):** During `$norm_items` construction, if two distinct stored keys normalize to the same key, the second one triggers `$norm_skip[$nk] = true` and the entry is removed from `$norm_items`. All subsequent seams check `isset($norm_skip[$nk])` before applying any override.

**Axis-2 (rendered collision):** A pre-scan loop over rendered slugs before any mutation checks whether a normalized key would match 2+ distinct rendered values (different `$row[2]` strings). If so, the key is added to a per-scope `$top_skip_rendered` / `$sub_skip_rendered`. The mutation loop skips these.

Both axes are fail-safe: when in doubt, apply nothing.

## Ordering::submenu Threading Choice

Ordering::submenu was kept completely unchanged. The threading happens entirely within Replay:
1. A temporary copy of children is built with `$row[2]` replaced by its normalized form
2. An `$orig_by_norm` map (normalized_slug → original row) is maintained during this copy
3. `Ordering::submenu` receives the normalized copies and normalized desired list — it performs its exact-match resilience logic on normalized slugs
4. The returned rows (with normalized `$row[2]`) are mapped back to their originals via `$orig_by_norm`

This preserves Ordering's resilience contract (desired-in-order first, newcomers appended, orphans skipped, dup honored once) and keeps OrderingTest entirely green without modification.

## Integration Methods Added

| Method | Fixture | Scenario |
|--------|---------|----------|
| `test_fix01_host_move_submenu_rename_resolves` | Jetpack Settings absolute URL | Different host, same normalized key → rename lands |
| `test_fix01_ver_bump_submenu_rename_resolves` | Elementor Website Templates | ver=4.2.0 vs ver=4.1.4 → same normalized key → rename lands |
| `test_fix02_utm_drift_submenu_rename_resolves` | WPForms upgrade external URL | Different utm_* params → same normalized key → rename lands |
| `test_fix03_ampamp_rendered_plain_stored_submenu_rename_resolves` | WooCommerce Product Categories | &amp;-rendered / &-stored → rename lands |
| `test_fix03_plain_rendered_ampamp_stored_submenu_rename_resolves` | WooCommerce Product Categories | &-rendered / &amp;-stored → rename lands |
| `test_sub_order_reorder_on_encoded_child_slugs` | WooCommerce submenus | &-desired vs &amp;-rendered rows → correct reorder |
| `test_collision_noop_ambiguous_stored_keys_apply_nothing` | WooCommerce Product Categories | Two stored keys collide → neither applied |
| `test_simple_slug_override_still_renames_after_normalization` | Posts (edit.php) | Plain slug override unchanged after normalization wiring |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - WPCS Compliance] phpcbf alignment warnings auto-fixed**
- **Found during:** Task 2 (composer lint)
- **Issue:** `Generic.Formatting.MultipleStatementAlignment.NotSameWarning` on 2 assignment lines in the new reorder block
- **Fix:** Ran `vendor/bin/phpcbf includes/class-replay.php` to auto-fix alignment
- **Files modified:** `includes/class-replay.php`
- **Committed in:** `58fbda9` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 WPCS alignment)
**Impact on plan:** Trivial cosmetic fix; no scope change.

## Issues Encountered

PHPStan sandbox network restriction (EPERM on TCP socket bind) — ran with `dangerouslyDisableSandbox: true`. PHPStan returns 0 errors.

## Next Phase Readiness

- Wave 2 complete: all three seams normalized, collision fail-safe active, integration cases authored
- 17-03 (Wave 3 gate) runs the full Docker integration suite to verify the FIX-01/02/03 acceptance tests pass in a real WP environment
- No blockers; stored config is never rewritten; `get_menu_model()` emits raw slugs; `capture_pristine()` is untouched

---
*Phase: 17-slug-normalization*
*Completed: 2026-06-29*
