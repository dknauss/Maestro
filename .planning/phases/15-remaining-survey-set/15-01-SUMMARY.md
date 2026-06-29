---
phase: 15-remaining-survey-set
plan: "01"
subsystem: compat-survey
tags: [research, jetpack, compatibility, r1, surv-02]
dependency_graph:
  requires: [Phase 13 compat harness, Phase 14 SCHEMA.md finalization]
  provides: [SURV-02 Jetpack survey, Jetpack R1 classification]
  affects: [Phase 16 DELV-01/DELV-02 synthesis]
tech_stack:
  added: []
  patterns: [hybrid-source-runtime-dump, php_int_max-dump, reorder-probe, two-gate-hide-model, cross-cutting-findings]
key_files:
  created:
    - .planning/compat/SURV-02-jetpack.md
    - .planning/compat/SURV-02-assets/dump-menu.php
    - .planning/compat/SURV-02-assets/reorder-probe.php
    - .planning/compat/SURV-02-assets/baseline-admin.txt
    - .planning/compat/SURV-02-assets/baseline-editor.txt
    - .planning/compat/SURV-02-assets/baseline-shop_manager.txt
  modified: []
decisions:
  - "[SURV-02] WP_ADMIN=true required for Jetpack dump too — Jetpack's admin_menu registration is gated on is_admin() via module-load path; without it top-level `jetpack` and all submenus are absent from dump (24 vs 32 top-level rows)"
  - "[SURV-02] Jetpack top-level is admin-only in disconnected state — `jetpack_admin_page` cap not granted to editor/shop_manager; entire Jetpack surface WP cap-gated away for non-admin roles (moot hide, F1)"
  - "[SURV-02] Settings submenu slug is absolute URL (http://[host]/wp-admin/admin.php?page=jetpack#/settings) — environment-specific slug requires slug-resolution tweak (I2) for cross-environment portability"
  - "[SURV-02] Jetpack in disconnected state exhibits only 3 of 6 manipulation dimensions: custom position (pos 3), WP_ADMIN-gated registration (not late injection), direct empty-parent $submenu surgery for hidden/connection-gated pages"
  - "[SURV-02] No separator, no count badges, no re-registered menus, no late injection — simplest manipulator surveyed so far; 0 broken cells across all 3 matrix rows + 3 interaction scenarios"
  - "[SURV-02] Effective render position: Jetpack lands at pos 32 (last) in effective rendered order despite $menu pos 3 — WooCommerce's unconditional menu_order filter pushes items not in its list to the end; Jetpack does not hook custom_menu_order or menu_order (no reorder conflict with Maestro)"
  - "[SURV-02] S2 (rename+reorder) and S3 (re-icon+reorder-across-separator) both safe — no compounding degradations, no separator anchoring artifact (Jetpack owns no separator)"
metrics:
  duration: "12m"
  completed_date: "2026-06-28"
  tasks_completed: 2
  tasks_total: 2
  files_created: 6
  files_modified: 0
---

# Phase 15 Plan 01: SURV-02 Jetpack Compatibility Survey

Jetpack 15.9.1 compatibility survey for Admin Menu Maestro R1 — admin-only in disconnected state, absolute URL Settings slug requires slug-resolution tweak, all other ops safe.

## What Was Done

### Task 1 — Boot harness, assets, baselines, Part 1

- Booted the Phase 13 compat harness (already running, instant start); confirmed jetpack 15.9.1 active + all 3 users provisioned.
- Created `.planning/compat/SURV-02-assets/` with adapted `dump-menu.php` and `reorder-probe.php` (plugin-agnostic scripts, header comments updated for Jetpack).
- Confirmed WP_ADMIN requirement: without `--exec="define('WP_ADMIN', true);"` the jetpack top-level and all submenus vanish from the dump (24 vs 32 top-level rows).
- Captured natural-state baselines for all 3 roles (admin / compat_editor / compat_shop_manager); only admin shows Jetpack items.
- Wrote Part 1 six-dimension checklist: 3 dimensions confirmed present (custom position at `3`, WP_ADMIN-gated registration, direct `$submenu[""]` surgery for hidden pages); 3 confirmed absent (no late injection, no re-registration, no count badges, no custom separator).
- Key Part 1 finding: effective render position is 32 (last), not 3 — WooCommerce's `menu_order` filter places Jetpack at the end of its passthrough list.

### Task 2 — Part 2 matrix, Interaction Scenarios, Part 3, traceability, completion check

**Part 2 — Classification Matrix (3 rows):**
- `jetpack` top-level: Rename safe, Reorder safe, Hide degraded (admin cosmetic, editor/shop_manager moot), Re-icon safe.
- `jetpack-ai` (AI submenu): Rename safe, Reorder N/A→safe (sub_order), Hide degraded, Re-icon N/A (F2).
- Settings submenu (absolute URL slug): Rename safe (with exact URL key), Reorder N/A→safe, Hide degraded, Re-icon N/A.

**Interaction Scenarios:**
- S1 (hide parent with visible children): degraded — parent gone, children remain, subtree cosmetically orphaned, no access break. Same pattern as SURV-01 S1.
- S2 (rename + reorder): safe — both compound cleanly, no badge loss (no badges in Jetpack titles), no separator re-cluster.
- S3 (re-icon + reorder across separator): safe — both apply cleanly, Jetpack owns no separator.

**Part 3 — 5 classified fixes (no broken cells):**
- I1: Submenu re-icon N/A → documented limitation (same as SURV-01 I4)
- I2: Settings absolute URL slug → slug-resolution tweak (environment-portability fix for match path)
- I3: Cosmetic hide page still loads → documented limitation (same as SURV-01 I5)
- I4: Parent-hide non-cascading → documented limitation (same as SURV-01 I6)
- I5: Admin-only in disconnected state (editor/shop_manager moot) → documented limitation

## Deviations from Plan

None — plan executed exactly as written. No auto-fixes needed. R1 boundary held: no production code touched.

## WP_ADMIN Finding

Jetpack's menu registration also requires `WP_ADMIN=true`, same as WooCommerce. The method_inheritance note in the plan correctly flagged this as a runtime-confirm item. Without it, Jetpack's `admin_menu` hook (gated on `is_admin()` via the plugin's module-load path) never fires in the WP-CLI context, making the dump silently incomplete.

## Key Deliverables

- `/Users/danknauss/Developer/GitHub/admin-menu-maestro/.planning/compat/SURV-02-jetpack.md` — complete, schema-faithful survey (SCHEMA.md untouched)
- `/Users/danknauss/Developer/GitHub/admin-menu-maestro/.planning/compat/SURV-02-assets/` — 5 files: dump/probe scripts + 3 role baselines

## Self-Check: PASSED

All key files verified present:
- FOUND: `.planning/compat/SURV-02-jetpack.md`
- FOUND: `.planning/compat/SURV-02-assets/dump-menu.php`
- FOUND: `.planning/compat/SURV-02-assets/reorder-probe.php`
- FOUND: `.planning/compat/SURV-02-assets/baseline-admin.txt`
- FOUND: `.planning/compat/SURV-02-assets/baseline-editor.txt`
- FOUND: `.planning/compat/SURV-02-assets/baseline-shop_manager.txt`

Commits verified:
- `fcecc11`: feat(15-01): complete SURV-02 Jetpack compatibility survey
- `9e41056`: chore(15-01): add SURV-02 dump/probe scripts and per-role baselines
