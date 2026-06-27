# Requirements: Maestro — Milestone R1 (Third-Party Compatibility Research)

**Defined:** 2026-06-22
**Core Value:** Editing the admin menu happens directly on the menu, with zero ceremony and zero risk to access.
**Track:** Research only — non-versioned. No plugin code, no release tag, no SVN deploy. Deliverables are planning artifacts plus a committed test harness.

> R1 documents how Maestro's sparse-delta replay behaves against the six
> highest-impact admin-menu-manipulating plugins and produces a prioritized
> fix/limitation backlog. The fixes it surfaces are **out of scope for R1** and
> ship under a later versioned milestone.

## R1 Requirements

A requirement is **Complete** when its artifact exists, is committed, and contains the specified content. No production menu-handling code is committed in R1 (harness/test scaffolding excepted).

### Test Harness

- [ ] **HARN-01**: A committed, reproducible wp-env configuration loads all six survey plugins alongside Maestro from a single documented command (the default `.wp-env.json` loads `plugins: []` and exercises Maestro alone). **Plugin versions are pinned** (and recorded) so findings are reproducible and dated.
- [ ] **HARN-02**: The harness provisions the admin + at least one lower-privilege role/user so each plugin's menu can be observed and Maestro's per-role hide behavior checked against it.

### Classification Schema

- [x] **SCHM-01**: A consistent classification schema is defined and committed **before any survey** — the manipulation dimensions (custom positions, conditional/late injection, re-registered menus, count badges in titles, custom separators, direct `$menu`/`$submenu` surgery) plus a safe/degraded/broken matrix for each Maestro operation (rename / reorder / hide / re-icon). Every survey fills in this template so DELV-01 synthesis is mechanical.

### Per-Plugin Survey

Each survey requirement documents, for that plugin: **how** it registers/manipulates the admin menu (custom positions, conditional/late injection, re-registered menus, count badges baked into titles, custom separators, direct `$menu`/`$submenu` surgery); **what breaks** under Maestro's rename / reorder / hide / re-icon; and a **classified fix** (slug-resolution tweak / later `admin_menu` re-hook / special-casing / documented limitation).

- [ ] **SURV-01**: WooCommerce surveyed and documented (first priority — heaviest menu manipulator; own top-level + submenus).
- [ ] **SURV-02**: Jetpack surveyed and documented.
- [ ] **SURV-03**: Yoast SEO / Rank Math surveyed and documented.
- [ ] **SURV-04**: Elementor (free; own top-level Elementor + Templates menus) surveyed and documented.
- [ ] **SURV-05**: WPForms surveyed and documented.
- [ ] **SURV-06**: LifterLMS (free LMS; own top-level + submenus) surveyed and documented.

### Synthesized Deliverables

- [ ] **DELV-01**: A consolidated compatibility note presents all six per-plugin findings under one consistent classification schema, with a summary of which Maestro operations (rename / reorder / hide / re-icon) are safe, degraded, or broken per plugin.
- [ ] **DELV-02**: A prioritized fix/limitation backlog ranks every surfaced issue, classifies each (slug-resolution tweak / later `admin_menu` re-hook / special-casing / documented limitation), and assigns forward IDs ready to seed a later versioned milestone.

## Future Requirements

Deferred to a later versioned milestone. Tracked but not in the R1 roadmap.

### Compatibility Fixes

- **FIX-xx**: The actual production menu-handling fixes surfaced and ranked by **DELV-02** (slug-resolution tweaks, later `admin_menu` re-hooks, special-casing). Scoped and shipped under a versioned milestone, not R1.

## Out of Scope

Explicitly excluded from R1. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Production compatibility fixes / menu-handling code | R1 is research only; fixes ship under a later versioned milestone (see DELV-02 output). |
| Release tag / wp.org SVN deploy / version bump | R1 produces no shippable plugin artifact; `vX.Y` numbering stays reserved for releases. |
| Plugins outside the locked set of six | Survey scope is fixed by V2-16's locked priority order; others can be added in a later research pass. |
| Performance benchmarking of the surveyed plugins | Only menu-registration/manipulation behavior is in scope, not runtime cost. |
| Carry-forward cosmetics (UX-09, BUG-08) | Code changes; contradict R1's research-only boundary. Remain in PROJECT.md backlog. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| HARN-01 | Phase 13 | Pending |
| HARN-02 | Phase 13 | Pending |
| SCHM-01 | Phase 13 | Complete |
| SURV-01 | Phase 14 | Pending |
| SURV-02 | Phase 15 | Pending |
| SURV-03 | Phase 15 | Pending |
| SURV-04 | Phase 15 | Pending |
| SURV-05 | Phase 15 | Pending |
| SURV-06 | Phase 15 | Pending |
| DELV-01 | Phase 16 | Pending |
| DELV-02 | Phase 16 | Pending |

**Coverage:**
- R1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-22*
*Last updated: 2026-06-22 — traceability filled in after roadmap creation*
