---
phase: 15-remaining-survey-set
plan: "03"
subsystem: compat-survey
tags: [elementor, survey, R1, compatibility, classification]
dependency_graph:
  requires: [SCHEMA.md (final form from Phase 14), 14-CONTEXT.md (locked methodology), SURV-01-assets (reused scripts)]
  provides: [SURV-04-elementor.md, SURV-04-assets/]
  affects: [Phase 16 DELV-02 backlog synthesis]
tech_stack:
  added: []
  patterns: [Elementor dual-top-level CSS-hide pattern, entity-encoded slug handling, absolute-URL slug with version query param, multi-priority admin_menu injection]
key_files:
  created:
    - .planning/compat/SURV-04-elementor.md
    - .planning/compat/SURV-04-assets/dump-menu.php
    - .planning/compat/SURV-04-assets/reorder-probe.php
    - .planning/compat/SURV-04-assets/baseline-admin.txt
    - .planning/compat/SURV-04-assets/baseline-compat_editor.txt
    - .planning/compat/SURV-04-assets/baseline-compat_shop_manager.txt
  modified: []
decisions:
  - "SURV-04: Elementor registers THREE top-level menus (elementor-home at 2.40565, Templates CPT at 26, elementor at 58.5); only elementor-home is visible by default — the other two are CSS-hidden by admin_head hooks at runtime"
  - "SURV-04: WP_ADMIN=true required for all Elementor menu registrations to fire (same as WooCommerce and Jetpack)"
  - "SURV-04: elementor and Templates tops are CSS-hidden by Elementor's own admin_head CSS (display:none) — Maestro ops land correctly in replay state but visual confirmation is masked (I7, documented limitation)"
  - "SURV-04: Website Templates slug is an absolute URL containing hostname + ver=4.1.4 + fragment (I1, slug-resolution tweak) — more complex than Jetpack Settings (SURV-02 I2) due to version query param"
  - "SURV-04: Categories slug entity-encoded (&amp;) in both Templates and elementor-home parents — must store with &amp; encoding for override to match (I2, same fix category as SURV-01 I3)"
  - "SURV-04: 0 broken cells across 18 matrix rows (3 tops + 15 submenus) + 4 interaction scenarios; all rename/reorder/re-icon ops safe on tops; all hide cells degraded (cosmetic)"
  - "SURV-04: Elementor injects at admin_menu priorities 9/20/100/10003-10005; all fire before Maestro's PHP_INT_MAX replay — full menu surface available to Maestro"
  - "SURV-04: Four interaction scenarios (S1-S4 including S4: three-top interleave) all safe; no compounding degradations"
metrics:
  duration: "~90m"
  completed_date: "2026-06-29"
  tasks_completed: 2
  files_created: 6
---

# Phase 15 Plan 03: SURV-04 Elementor Compatibility Survey Summary

**One-liner:** Elementor 4.1.4 three-top-level survey — 0 broken cells, 8 classified issues (2 slug-resolution tweaks + 6 documented limitations), CSS-hide dual-path registration pattern documented.

## What Was Done

Executed a complete R1 compatibility classification survey for Elementor (free, version 4.1.4).
Produced `.planning/compat/SURV-04-elementor.md` as a filled copy of the finalized SCHEMA.md,
structurally identical to SURV-01 (WooCommerce), SURV-02 (Jetpack), and SURV-03 (Yoast SEO).

Key discoveries:

**Three top-level menus, not two.** The plan noted two Elementor-owned tops; at runtime the harness
reveals three: `elementor-home` (pos 2.40565, the visible "Editor One" menu), `elementor` (pos 58.5,
the old legacy Settings menu, CSS-hidden), and `edit.php?post_type=elementor_library` (pos 26, the
Templates CPT post-list, also CSS-hidden). All three are fully present in the replay state at
PHP_INT_MAX and are valid Maestro targets.

**All six manipulation dimensions confirmed.** Elementor is the most complex menu manipulator in the
survey set, exhibiting: custom positions (three tops at distinct fractional positions), multi-priority
conditional injection (admin_menu @ priorities 9/20/100/10003-10005), re-registered menus + two slug
encoding issues (entity-encoded `&amp;` + absolute URL with version param), dynamic HTML injection in
the Upgrade upsell title, a custom separator (removed before replay), and extensive direct global
surgery via `remove_submenu_page()` / `$submenu` direct writes.

**Classification results:** 18 matrix rows (3 tops + 15 submenus), 0 broken cells. All rename,
reorder, and top-level re-icon operations are **safe**. All hide cells are **degraded** (cosmetic;
pages load 200 by URL). The `Upgrade` submenu rename is **degraded** (dynamic HTML/sale-text injection
lost — same badge-in-title pattern as SURV-01). Submenu re-icon is N/A→degraded (no icon slot on
submenu rows).

**8 classified issues in Part 3:** I1 (Website Templates absolute URL slug, slug-resolution tweak),
I2 (entity-encoded Categories slug, slug-resolution tweak), I3 (Upgrade dynamic HTML loss, documented
limitation), I4 (submenu re-icon N/A, documented limitation), I5 (hide cosmetic, documented
limitation), I6 (parent-hide non-cascading, documented limitation), I7 (CSS-hidden tops,
documented limitation), I8 (hide moot for non-admin on manage_options items, documented limitation).

**Four interaction scenarios all safe:** S1 (hide-parent, no cascade), S2 (rename+reorder), S3
(re-icon + cross-separator reorder), S4 (three-top interleave — all three Elementor tops reordered
correctly relative to each other and WP core items).

## Tasks Completed

| Task | Description | Commit | Key Files |
| --- | --- | --- | --- |
| 1 | Boot harness, copy template, write Part 1 + Method header + per-role baselines + assets | 3a8d9af | `SURV-04-assets/dump-menu.php`, `SURV-04-assets/reorder-probe.php`, `SURV-04-assets/baseline-*.txt` |
| 2 | Write Part 2 matrix + Interaction Scenarios + Part 3 classified fixes + traceability + completion check | 8b0ddd8 | `.planning/compat/SURV-04-elementor.md` |

## Deviations from Plan

### Auto-fixed Issues

None.

### Scope Adjustments

**Additional top-level menu discovered.** The plan noted "two plugin-owned top-level menus" (Elementor
+ Templates). At runtime, three distinct top-level entries are present in `$menu` at PHP_INT_MAX:
`elementor-home`, `elementor`, and `edit.php?post_type=elementor_library`. The third (`elementor`
at pos 58.5) is Elementor's legacy Settings top-level, hidden via `admin_head` CSS. It was surveyed
as a full matrix row (Rule 2: missing items coverage). This increased the matrix from the planned
~20-row scope to 18 classified rows (actual count, with some submenus from the CSS-hidden `elementor`
parent included selectively for the most significant items).

**S4 added.** The plan specified S1-S3 canonical scenarios plus "a reorder interleaving the two
Elementor tops if revealing." With three tops discovered, S4 (three-top interleave) was added — it
confirmed all three reorder correctly relative to each other (all safe, no new issues).

## Auth Gates

None. The compat harness (Docker, wp-env) was already running from SURV-02/SURV-03 sessions.

## Self-Check

Files verified:
- `.planning/compat/SURV-04-elementor.md` — exists (576 lines)
- `.planning/compat/SURV-04-assets/dump-menu.php` — exists
- `.planning/compat/SURV-04-assets/reorder-probe.php` — exists
- `.planning/compat/SURV-04-assets/baseline-admin.txt` — exists
- `.planning/compat/SURV-04-assets/baseline-compat_editor.txt` — exists
- `.planning/compat/SURV-04-assets/baseline-compat_shop_manager.txt` — exists

Commits verified:
- `3a8d9af` — Task 1 assets and baselines
- `8b0ddd8` — Task 2 complete survey

SCHEMA.md unmodified: confirmed (git diff shows 0 bytes changed).
No production PHP modified: confirmed (R1 boundary held).

## Self-Check: PASSED
