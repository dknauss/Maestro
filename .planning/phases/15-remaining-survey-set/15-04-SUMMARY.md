---
phase: 15-remaining-survey-set
plan: "04"
subsystem: compat-survey
tags: [r1, compatibility, wpforms, survey, documentation]
dependency_graph:
  requires: [SCHEMA.md finalized (Phase 14), compat harness running (Phase 13), SURV-01 exemplar]
  provides: [SURV-05-wpforms.md, SURV-05-assets/]
  affects: [Phase 16 DELV-02 backlog synthesis]
tech_stack:
  added: []
  patterns: [hybrid-source-plus-runtime-dump, reorder-probe, per-role-two-gate-model, config-driven-op-application]
key_files:
  created:
    - .planning/compat/SURV-05-wpforms.md
    - .planning/compat/SURV-05-assets/dump-menu.php
    - .planning/compat/SURV-05-assets/reorder-probe.php
    - .planning/compat/SURV-05-assets/baseline-admin.txt
    - .planning/compat/SURV-05-assets/baseline-compat_editor.txt
    - .planning/compat/SURV-05-assets/baseline-compat_shop_manager.txt
  modified: []
decisions:
  - "SURV-05: WPForms Lite uses manage_options for every menu item — editor and shop_manager have no WPForms surface at all (submenu not even registered for those roles); Maestro hide is moot for both non-admin roles"
  - "SURV-05: WPForms bakes two forms of markup into submenu titles — Payments has a NEW! badge span (F4a) and Addons has an orange color span (F4b) — both are cosmetic-loss-on-rename degraded per convention 3"
  - "SURV-05: Upgrade to Pro slug is a stable absolute external URL (wpforms.com) with UTM params; Maestro must match verbatim; classified slug-resolution tweak (lower priority than Jetpack's environment-specific slug)"
  - "SURV-05: 0 broken cells across 14 matrix rows; no later-admin_menu-re-hook fix warranted in R1"
metrics:
  duration: "~45m"
  completed: "2026-06-29"
  tasks: 2
  files: 6
---

# Phase 15 Plan 04: WPForms Lite Survey (SURV-05) Summary

WPForms Lite (`wpforms-lite` 1.10.2.1) R1 compatibility survey producing a complete 14-row classification matrix with 0 broken cells, two markup-in-title degraded rename cases, one slug-resolution issue for the Lite upsell link, and 7 classified fixes.

## What Was Built

`.planning/compat/SURV-05-wpforms.md` — a complete SCHEMA.md-faithful compatibility survey for
WPForms Lite, structured identically to the SURV-01 exemplar. Covers all four Maestro operations
(rename / reorder / hide / re-icon) against the WPForms top-level menu and all 13 submenus,
including first-run and Lite-vs-Pro feature-gated items tagged `[state]`.

`.planning/compat/SURV-05-assets/` — per-plugin dump and reorder-probe scripts adapted from
SURV-01 assets, plus natural-state baseline dumps for all three provisioned roles.

## Key Findings

**WPForms menu structure (natural state):**
- 1 top-level: `wpforms-overview` at position `58.9` (fractional, in WC 58.x cluster); inline SVG icon
- 13 submenus under `wpforms-overview`: All Forms, Add New Form, Entries, Payments, Form Templates,
  Settings, Tools, Addons, Privacy Compliance, SMTP, About Us, Community, Upgrade to Pro
- All items require `manage_options` — editor and shop_manager have zero WPForms surface rendered
- Effective rendered position: 23 (via WooCommerce's menu_order filter)

**`WP_ADMIN=true` confirmed required.** Without it, WPForms never hooks `admin_menu` and all items
are absent from the dump.

**Two badge/markup cases (F4):**
- `wpforms-payments`: title `Payments<span class="wpforms-menu-new">&nbsp;NEW!</span>` — badge lost on rename (degraded, convention 3)
- `wpforms-addons`: title `<span style="color:#f18500">Addons</span>` — color span lost on rename (degraded, convention 3)

**Slug-resolution issue (I4):** "Upgrade to Pro" uses `https://wpforms.com/lite-upgrade/?utm_campaign=liteplugin&...` as slug — stable across environments (not hostname-dependent like Jetpack's Settings slug) but requires exact verbatim match including UTM params.

**Per-role behavior:** WPForms uses `manage_options` for all items AND conditionally registers submenus only for `manage_options` users. Result: editor and shop_manager have no `$submenu['wpforms-overview']` in the dump at all — submenus are not registered for those roles, and the top-level is cap-gated away at render. Hide is a moot no-op for both non-admin roles (F1).

**0 broken cells.** Rename works cleanly for 12 of 14 items (2 degraded due to markup loss). Top-level reorder safe. All submenus reorder via `sub_order`. Re-icon works on top-level. Interaction scenarios S1/S2/S3 all safe or degraded (no new failure modes from combinations).

## Deviations from Plan

None — plan executed exactly as written. Both tasks delivered in a single atomic write of SURV-05-wpforms.md (all runtime data gathered before writing; single file creation committed in Task 1 commit covers both Tasks 1 and 2).

## Decisions Made

1. **manage_options-only WPForms:** All WPForms caps are `manage_options`; no custom capability introduced. Editor/shop_manager are excluded from the WPForms surface entirely (F1 finding). This differs from Jetpack (which used `jetpack_admin_page`) but produces the same structural outcome: Hide is moot for non-admin roles.

2. **Two markup-in-title types:** The Payments `NEW!` badge span and Addons orange color span are both classified as badge-in-title convention 3 cases (degraded rename), even though the Addons case uses inline styling rather than a semantic badge class. Both are cosmetic HTML lost on wholesale title overwrite.

3. **Upgrade to Pro slug classification:** Classified as `slug-resolution tweak` (like Jetpack's absolute-URL Settings slug), but noted as lower priority because the URL is stable across environments (always wpforms.com). The Jetpack slug was environment-specific (hostname-dependent); this one is stable but parameter-heavy.

4. **No architectural changes:** R1 boundary held throughout. Fixes classified, not implemented.

## Self-Check

### Self-Check: PASSED

Files created and verified:
- `FOUND: .planning/compat/SURV-05-wpforms.md`
- `FOUND: .planning/compat/SURV-05-assets/dump-menu.php`
- `FOUND: .planning/compat/SURV-05-assets/reorder-probe.php`
- `FOUND: .planning/compat/SURV-05-assets/baseline-admin.txt`
- `FOUND: .planning/compat/SURV-05-assets/baseline-compat_editor.txt`
- `FOUND: .planning/compat/SURV-05-assets/baseline-compat_shop_manager.txt`

Commit verified: `0bf14f2` — docs(15-04): WPForms Lite survey Task 1

SCHEMA.md: unmodified (verified via `git diff HEAD`).
No production PHP files modified (R1 boundary confirmed).
All plan verification checks: PASS.
