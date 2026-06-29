---
phase: 15-remaining-survey-set
plan: 05
subsystem: testing
tags: [compat, lifterlms, lms, classification, survey, r1]

# Dependency graph
requires:
  - phase: 13-compatibility-harness-classification-schema
    provides: harness setup, SCHEMA.md template
  - phase: 14-woocommerce-survey
    provides: SURV-01 exemplar, locked methodology, finalized SCHEMA.md
  - phase: 15-remaining-survey-set
    provides: SURV-02..05 completed surveys, consistent cross-plugin classification patterns

provides:
  - SURV-06-lifterlms.md — complete LifterLMS compatibility survey (Parts 1-3)
  - SURV-06-assets/ — LifterLMS-adapted dump-menu.php, reorder-probe.php, per-role baselines
  - Classification of 37 menu items (1 separator + 6 top-level + 30 submenus) across 4 Maestro ops
  - 7 classified R1 fixes (I1-I7): 6 documented limitations + 1 slug-resolution tweak
  - Key cross-plugin findings: F4 (llms-separator no re-clustering), F6 (submenu_order() override)

affects:
  - 16-synthesis — DELV-01/DELV-02 backlog synthesis uses SURV-06's classified fixes

tech-stack:
  added: []
  patterns:
    - "llms-separator uses direct $menu surgery at fixed position (no menu_order re-anchor)"
    - "LifterLMS submenu_order() via custom_menu_order overrides Maestro sub_order at render"
    - "Entity-encoded taxonomy slugs (&amp;) require slug-resolution tweak — cross-plugin pattern (SURV-01, SURV-04, SURV-06)"

key-files:
  created:
    - .planning/compat/SURV-06-lifterlms.md
    - .planning/compat/SURV-06-assets/dump-menu.php
    - .planning/compat/SURV-06-assets/reorder-probe.php
    - .planning/compat/SURV-06-assets/baseline-admin.txt
    - .planning/compat/SURV-06-assets/baseline-editor.txt
    - .planning/compat/SURV-06-assets/baseline-shop-manager.txt
  modified: []

key-decisions:
  - "SURV-06: lms_manager role not provisioned — three baseline roles suffice since lms_manager adds no materially different Hide classification (all lifterlms submenus require manage_lifterlms, same as admin pattern)"
  - "SURV-06: llms-separator does NOT re-cluster on top-level reorder (unlike WooCommerce's separator-woocommerce) — LifterLMS has no menu_order filter; classified as documented limitation (I1)"
  - "SURV-06: lifterlms submenu Reorder is degraded — LifterLMS's submenu_order() hook overwrites $submenu['lifterlms'] at render via custom_menu_order after Maestro's admin_menu PHP_INT_MAX pass (F6); classified as documented limitation (I2)"
  - "SURV-06: entity-encoded taxonomy slugs in Courses and Memberships (course_cat, membership_cat, etc.) require slug-resolution tweak (I3) — cross-plugin pattern confirmed across SURV-01/04/06"
  - "SURV-06: 0 broken cells across all 37 rows; lifterlms top-level uses cap 'read' so editor and shop_manager CAN see it at render (unlike woocommerce which was higher-capped)"

patterns-established:
  - "Separator survey pattern: check whether plugin has a menu_order filter to re-anchor separator — LifterLMS does not, WooCommerce does"
  - "Per-role Hide for cap-'read' top-level: editor and shop_manager render it (unlike higher-capped WooCommerce top-level), so Maestro hide IS cosmetically meaningful for those roles"

requirements-completed: [SURV-06]

# Metrics
duration: 90min
completed: 2026-06-29
---

# Phase 15 Plan 05: LifterLMS Compatibility Survey Summary

**LifterLMS free LMS (10.0.8) surveyed: 37-row classification matrix, 0 broken cells, llms-separator no-re-clustering documented, submenu_order() render-time override classified, entity-encoded taxonomy slugs flagged for slug-resolution tweak**

## Performance

- **Duration:** ~90 min
- **Started:** 2026-06-29T14:00:00Z
- **Completed:** 2026-06-29T15:30:00Z
- **Tasks:** 2 (Task 1: assets + baselines + Part 1; Task 2: matrix + Part 3 + traceability)
- **Files created:** 6

## Accomplishments

- Produced SURV-06-lifterlms.md as a structurally faithful copy of the finalized SCHEMA.md, mirroring SURV-01's format exactly, completing the Phase 15 survey set (SURV-02..06 all done)
- Classified 37 LifterLMS menu items (1 separator, 6 top-level, 30 submenus) with all four Maestro ops — 0 broken cells, consistent with SURV-01..05
- Key LifterLMS-specific findings: (a) llms-separator is a fixed-position direct $menu write with NO menu_order filter — does not re-cluster on reorder (unlike WooCommerce's separator-woocommerce, which does re-cluster via menu_order); (b) LifterLMS's submenu_order() hook rewrites $submenu['lifterlms'] at render time via custom_menu_order, overriding Maestro's sub_order for the lifterlms parent; (c) six taxonomy submenu slugs have entity-encoded &amp; form (cross-plugin slug-resolution pattern confirmed across SURV-01/04/06); (d) lifterlms top-level cap is 'read' — editor and shop_manager render it cosmetically (unlike most other plugin tops)
- Interaction scenarios S1-S3 applied: S3 confirmed crossing llms-separator via Maestro reorder is safe (separator stays at fixed position, item moves correctly); no degradation compounds discovered

## Task Commits

1. **Task 1: Assets, baselines, Part 1 + Method header** - `3b287ab` (feat)
2. **Task 2: Complete survey — matrix, interaction scenarios, Part 3, traceability** - `b32a5f7` (feat)

## Files Created/Modified

- `.planning/compat/SURV-06-lifterlms.md` — Complete 37-row LifterLMS compatibility survey (Parts 1-3 + Method header + Interaction Scenarios + traceability + completion check)
- `.planning/compat/SURV-06-assets/dump-menu.php` — Admin menu dump script adapted from SURV-01, WP_ADMIN required
- `.planning/compat/SURV-06-assets/reorder-probe.php` — Effective top-level order probe adapted from SURV-01
- `.planning/compat/SURV-06-assets/baseline-admin.txt` — Admin natural-state baseline slice
- `.planning/compat/SURV-06-assets/baseline-editor.txt` — Editor natural-state baseline + per-role notes
- `.planning/compat/SURV-06-assets/baseline-shop-manager.txt` — Shop manager natural-state baseline + per-role notes

## Decisions Made

- Three baseline roles suffice for LifterLMS Hide coverage — lms_manager not provisioned (it holds manage_lifterlms but would only replicate the admin pattern for submenus that editor/shop_manager already can't see)
- llms-separator classified as documented limitation (I1) — analogous to WooCommerce's I2 but simpler since there is no plugin menu_order filter at all
- lifterlms submenu Reorder classified as documented limitation (I2) — the submenu_order() override runs at a different filter (custom_menu_order) and cannot be addressed by a later admin_menu re-hook
- Entity-encoded taxonomy slugs classified as slug-resolution tweak (I3) — cross-plugin pattern now confirmed in SURV-01, SURV-04, and SURV-06

## Deviations from Plan

None — plan executed exactly as written. The three-baseline-roles-suffice decision was explicitly covered by the plan's `lifterlms_specifics` section (provision lms_manager only if runtime shows it materially affects Hide — it does not).

## Issues Encountered

None. Harness was already running with all six compat plugins active. WP_ADMIN requirement confirmed identical to SURV-01 and SURV-02.

## User Setup Required

None — R1 boundary held throughout. No production code changes. Compat harness left running per plan instructions (orchestrator handles teardown).

## Next Phase Readiness

- Phase 15 is now complete: all six surveys (SURV-01..06) are committed with 0 broken cells across the entire compat set
- Phase 16 (synthesis, DELV-01/DELV-02) can proceed immediately: each survey's Part 3 provides the classified fix list
- Cross-plugin synthesis notes: slug-resolution tweak is confirmed across SURV-01/04/06; documented limitations for separator behavior (SURV-01/06), submenu ordering overrides (SURV-06), cosmetic hide (all surveys), non-cascading parent hide (SURV-01/06)

---
*Phase: 15-remaining-survey-set*
*Completed: 2026-06-29*
