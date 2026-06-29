---
phase: 15-remaining-survey-set
plan: "02"
subsystem: compatibility
tags: [yoast-seo, wordpress-seo, admin-menu, compat-survey, r1-research]

# Dependency graph
requires:
  - phase: 14-woocommerce-survey
    provides: SURV-01 exemplar + finalized SCHEMA.md template for Phase 15 surveys
  - phase: 15-remaining-survey-set (plan 01)
    provides: SURV-02 Jetpack exemplar demonstrating Phase 15 survey format

provides:
  - SURV-03-yoast-seo.md — complete R1 compat survey for Yoast SEO (wordpress-seo 27.9)
  - SURV-03-assets/ — per-role baseline dumps + reusable dump/reorder-probe scripts
  - Dual-slug role-conditional registration finding (key Yoast-specific pattern for Phase 16)
  - 8 classified R1 fixes (I1–I8) covering Yoast's unique menu patterns

affects:
  - 15-remaining-survey-set (plans 03–05 — remaining surveys may share patterns)
  - 16-compatibility-deliverables (DELV-02 synthesis uses SURV-03 classified issues)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual-slug role-conditional menu registration pattern: Yoast registers wpseo_dashboard (admin) and wpseo_page_academy (editor/shop_manager) as distinct top-level entries"
    - "Slug-collision pattern: parent slug shared with first submenu (wpseo_dashboard / General) requires per-slug override scope note"

key-files:
  created:
    - .planning/compat/SURV-03-yoast-seo.md
    - .planning/compat/SURV-03-assets/dump-menu.php
    - .planning/compat/SURV-03-assets/reorder-probe.php
    - .planning/compat/SURV-03-assets/baseline-admin.txt
    - .planning/compat/SURV-03-assets/baseline-compat_editor.txt
    - .planning/compat/SURV-03-assets/baseline-compat_shop_manager.txt
  modified: []

key-decisions:
  - "SURV-03: Yoast SEO dual-slug role-conditional registration (wpseo_dashboard for admin / wpseo_page_academy for editor+shop_manager) means overrides are per-slug and do not cross role tiers — documented as I1 (documented limitation)"
  - "SURV-03: Slug collision between wpseo_dashboard top-level and General submenu (and wpseo_page_academy top-level and Academy submenu) causes simultaneous rename of parent + first-submenu — documented as I2/I3 (documented limitations)"
  - "SURV-03: Rank Math is explicitly out-of-scope/deferred (locked: Yoast SEO is the chosen SEO plugin; Rank Math not loaded in harness)"
  - "SURV-03: 0 broken cells across 13 matrix rows; all issues are degraded-cosmetic or limitations — no later-admin_menu-re-hook fix warranted in R1"

patterns-established:
  - "Dual-slug role-conditional detection: when a plugin registers different top-level slugs for different cap tiers, both slugs get separate matrix rows and are noted as I1 (documented limitation)"

requirements-completed: [SURV-03]

# Metrics
duration: 55min
completed: 2026-06-29
---

# Phase 15 Plan 02: Yoast SEO Compatibility Survey (SURV-03) Summary

**Yoast SEO 27.9 surveyed with role-conditional dual-slug registration as defining finding: 13-row matrix, 8 classified fixes, 0 broken cells, Rank Math noted out-of-scope**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-06-29T00:00:00Z
- **Completed:** 2026-06-29
- **Tasks:** 2 (Task 1: Part 1 + baselines; Task 2: Part 2 + Part 3 + traceability — both authored in one pass)
- **Files modified:** 6 created, 0 modified

## Accomplishments

- Surveyed Yoast SEO (wordpress-seo 27.9) against all four Maestro operations (rename/reorder/hide/re-icon) for all affected menu items across three provisioned roles
- Documented the defining Yoast-specific finding: role-conditional dual-slug registration (`wpseo_dashboard` for admin, `wpseo_page_academy` for editor/shop_manager), which means a single Maestro override does not apply across all roles — requires two separate overrides per configuration
- Confirmed WP_ADMIN=true requirement for Yoast menu registration (same as WooCommerce, Jetpack)
- Produced a 13-row Part 2 matrix (2 top-level + 11 submenus) with 0 broken cells and 8 documented-limitation fix entries in Part 3
- Rank Math explicitly noted out-of-scope/deferred per locked project decision

## Task Commits

1. **Task 1: Boot harness, copy template, write Part 1 + Method header + baselines** — `53680f0` (feat)
   - (Tasks 1 and 2 were authored together in one pass; commit captures the complete SURV-03 document)

**Plan metadata:** (next commit — docs)

## Files Created/Modified

- `.planning/compat/SURV-03-yoast-seo.md` — complete SURV-03 survey (Parts 1-3, Method header, Interaction Scenarios, traceability, completion check)
- `.planning/compat/SURV-03-assets/dump-menu.php` — adapted dump script (from SURV-01)
- `.planning/compat/SURV-03-assets/reorder-probe.php` — adapted reorder probe (from SURV-01)
- `.planning/compat/SURV-03-assets/baseline-admin.txt` — natural-state admin role dump
- `.planning/compat/SURV-03-assets/baseline-compat_editor.txt` — natural-state editor role dump
- `.planning/compat/SURV-03-assets/baseline-compat_shop_manager.txt` — natural-state shop_manager role dump

## Decisions Made

- **Dual-slug role-conditional registration documented as I1 (documented limitation):** Yoast registers `wpseo_dashboard` (admin) and `wpseo_page_academy` (editor/shop_manager) as two distinct `add_menu_page` entries. Maestro matches by exact slug; cross-role consistent rename requires two overrides. No R1 implementation fix; documented for DELV-02 user guidance.
- **Slug collision I2/I3:** `wpseo_dashboard` slug shared between top-level parent and General first-submenu; `wpseo_page_academy` shared between non-admin top-level and Academy submenu. Documented limitation — safe and recoverable but semantically surprising.
- **Rank Math out-of-scope:** Confirmed in VERSIONS.md: "Yoast SEO is the chosen SEO plugin and Rank Math is not loaded." Stated prominently in survey preamble and completion check.
- **0 broken cells:** All 13 matrix rows classified safe or degraded (cosmetic); no later-admin_menu-re-hook fix warranted from this survey.
- **8 documented limitations (I1–I8):** Dual-slug (I1), slug collisions (I2/I3), badge-in-title on both top-levels (I4), upsell-span loss on 4 submenus (I5), submenu re-icon N/A (I6), cosmetic hide (I7), non-cascading parent-hide (I8). Phase 16 DELV-02 can dedup I4/I6/I7/I8 against SURV-01/02 analogues.

## Deviations from Plan

None — plan executed exactly as written. Tasks 1 and 2 were authored in a single pass (the complete survey document was written together, then committed); no plan-specified tasks were skipped or modified.

## Issues Encountered

None beyond expected findings:
- WP_ADMIN=true requirement confirmed (same as SURV-01/02, expected).
- Yoast dual-slug pattern was anticipated by the plan's `yoast_specifics` section and correctly categorized at runtime.

## User Setup Required

None — harness was already running from SURV-02 (Docker, compat harness at http://localhost:8890). No teardown; three more surveys reuse it.

## Next Phase Readiness

- SURV-03 complete; harness still running for SURV-04 (Elementor) and subsequent surveys.
- Phase 15 progress: SURV-01 (WooCommerce, Phase 14), SURV-02 (Jetpack, 15-01), SURV-03 (Yoast SEO, 15-02) complete.
- No blockers for remaining Phase 15 plans (15-03 through 15-05).

## Self-Check

- [x] SURV-03-yoast-seo.md exists — confirmed
- [x] SURV-03-assets/ exists with 5 files — confirmed
- [x] Commit 53680f0 exists — confirmed
- [x] SCHEMA.md unmodified (git diff = 0 bytes) — confirmed
- [x] No production includes/*.php changed — confirmed
- [x] Rank Math out-of-scope explicitly stated — confirmed
- [x] All 14 Survey Completion Check boxes ticked — confirmed

## Self-Check: PASSED

---
*Phase: 15-remaining-survey-set*
*Completed: 2026-06-29*
