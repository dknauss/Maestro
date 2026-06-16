# Requirements: Maestro

**Defined:** 2026-06-13
**Last updated:** 2026-06-14 — v1.0 archived; v1.1 is the active milestone
**Core Value:** Editing the admin menu happens directly on the menu, with zero ceremony and zero risk to access.

## v1.0 Requirements — ✅ shipped & archived

The 20 v1.0 "WordPress.org release readiness" requirements (SEC, A11Y, TEST,
PERF, REL — all Complete) are archived in
[milestones/v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md). v1.0.0 was
submitted to WordPress.org on 2026-06-14 and is awaiting .org review.

## v1.1 Requirements

Milestone: **v1.1 "Polish & Accessibility."** Refine the shipped editor and
finish the accessibility story — no new architecture. Promoted from the v2
backlog (origin IDs noted).

### Icons

- [ ] **ICON-01** (from V2-11): The bundled picker icons read at a weight that mixes with WordPress's solid dashicons — switch to Bootstrap `*-fill` variants (regenerate via `bin/generate-bootstrap-icons.mjs`); fall back to Heroicons Mini (solid, 20px) if still too light.

### Accessibility

- [ ] **A11Y-06** (from V2-03): Menu items can be reordered with the keyboard (move up/down and/or ARIA grab semantics), closing the documented v1 mouse-only gap.

### Editor UX

- [ ] **UX-01** (from V2-04): Each changed item shows a clear "modified" indicator, and per-item reset is a discoverable affordance (not hidden).
- [ ] **UX-02** (from V2-12): The edit-mode UI is visually polished and responsive — control hierarchy, spacing, save/error status clarity, icon-picker scanability, first-run cues — native to WP admin, with no text-overlap or control-resize regressions (deliverables: before/after screenshots + keyboard/mouse walkthrough notes).

### Docs & Assets

- [ ] **DOC-01** (from V2-13): In-prose references to project files are markdown links, not bare paths, across README, readme.txt, user guide, SPEC, TESTING, and planning docs.
- [x] **REL-06** (from V2-14): The wp.org/GitHub banner is rebuilt from an editable SVG master under `.wordpress-org/source/`, the decorative leader line before "ADMIN MENU" removed, with a repeatable `npm run assets:banners` pipeline (Inkscape render → Pillow downscale/crop); public assets replaced only after visual review. — **Done** (shipped during the wp.org rename: brand-first banner with the "THE INLINE ADMIN MENU EDITOR" subtitle).

## v2 Requirements

Post-1.0 backlog (from SPEC.md → Roadmap). Tracked, not in this roadmap.

**Promoted to v1.1 (Polish & Accessibility):** V2-03, V2-04, V2-11, V2-12, V2-13, V2-14 — now tracked as the v1.1 Requirements above; left in this list for lineage.

- **V2-01**: Reparenting — move items between top-level and submenu (with `parent_file`/`submenu_file` highlighting)
- **V2-02**: Separator management — add/move/delete with synthetic stable IDs
- **V2-03**: Keyboard-accessible reordering (move up/down, ARIA grab semantics)
- **V2-04**: Per-item reset surfaced as an explicit UI affordance with a "modified" indicator
- **V2-05**: Custom icon upload (dashicons + URL/SVG/none) with strict SVG sanitization
- **V2-06**: Import/export config as JSON (staging→prod parity, version control)
- **V2-07**: Optional enforcement bridge — opt-in, clearly-labelled defense-in-depth with a capability manager
- **V2-08**: Multisite / network-level defaults with per-site override
- **V2-09**: Configurable admin-menu width — a toggle/control to widen the 160px sidebar (long/renamed titles wrap awkwardly at the default). Store a global `menu_width` in config; apply on every admin page via the `#adminmenu/#adminmenuwrap/#adminmenuback` + `#wpcontent/#wpfooter` rules already proven in the folded-mode override. Note: this is the first asset the plugin would load *outside* edit mode; mind folded-mode and `<782px` responsive interaction. (cf. "Wider Admin Menu" plugin, but integrated into the editor.)
- **V2-10**: *Research* — feasibility of editing the top admin **toolbar** (`#wpadminbar`) too: hide/reorder/rename toolbar nodes via the same in-place model, with a better inline interface than existing tools (cf. "Hide Admin Menu"). Investigate `WP_Admin_Bar` node registration, what's safely hideable, front-end vs admin rendering, per-role handling, and whether the click-to-select editor extends to the toolbar. Deliverable is a feasibility note, not a build commitment.
- **V2-11**: Heavier/solid bundled icon set to match dashicons — the bundled Bootstrap Icons are outline-weight and read thin/light next to WordPress's solid dashicons, so the two tabs don't mix well. First try: switch the curated bundle to Bootstrap's `*-fill` variants where they exist (same MIT dependency, regenerate via `bin/generate-bootstrap-icons.mjs`). If still too light, add **Heroicons Mini** (solid, 20px — the dashicons grid; MIT) as the second set. Low-effort and contained; could be pulled into the v1.0 release polish rather than waiting for v2.
  - *Backup solid candidates if neither fits:* **Material Design Icons** (Pictogrammers / `@mdi/svg`, ~7k blocky glyphs, Apache-2.0); **Remix Icon** fill variants (Apache-2.0); **Material Symbols** Filled (Apache-2.0). All are single-fill, so they recolour cleanly as base64 data-URIs the same way the current bundle does. *Skip* the thin outline sets (Tabler, Feather, Lucide) — same mismatch as outline Bootstrap.
- **V2-12**: UI/UX design polish — review the edit-mode surface as a working admin tool, not a marketing screen. Improve control hierarchy, spacing, responsive behavior, modified-state affordances, save/error status clarity, icon-picker scanability, and first-run/onboarding cues while staying visually native to WordPress admin. Deliverables should include before/after screenshots, keyboard/mouse walkthrough notes, and regression checks that text does not overlap or resize controls awkwardly.
- **V2-13**: Documentation link hygiene — whenever docs refer to another project file in prose, link it instead of leaving a bare path. Example: "See [`SPEC.md`](../SPEC.md) for the durable design and [`docs/archive/FIXES.md`](../docs/archive/FIXES.md) for the historical fix log." Apply this consistently across GitHub README, wp.org readme, user guide, SPEC, TESTING, and planning docs where relative links make sense.
- **V2-14**: Brand asset source/regeneration — rebuild the WordPress.org/GitHub banner from an editable source, remove the decorative leader line before "ADMIN MENU" so it does not read like punctuation, and commit a repeatable generation path for `banner-772x250.png` and `banner-1544x500.png`. Follow the Borges repo pattern: keep an SVG master under `.wordpress-org/source/`, render a high-resolution reference PNG with Inkscape, downscale/crop with Pillow, expose `npm run assets:banners`, and replace submitted/public assets only after visual review.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real access control / page locking | Visibility is cosmetic by design; the page's capability is the true gate |
| Front-end or non-admin-menu editing | Admin menu only |
| Rebuilt/stored full menu | Delta-only by design (reset trivially, survive plugin churn) |

## Traceability (v1.1)

| Requirement | Phase | Status |
|-------------|-------|--------|
| A11Y-06 | Phase 6: Accessibility & Interaction | Pending |
| UX-01 | Phase 6: Accessibility & Interaction | Pending |
| ICON-01 | Phase 7: Visual Polish & Icons | Pending |
| UX-02 | Phase 7: Visual Polish & Icons | Pending |
| DOC-01 | Phase 8: Docs & Brand Assets | Pending |
| REL-06 | Phase 8: Docs & Brand Assets | Complete (shipped during wp.org rename) |

**Coverage:**
- v1.1 requirements: 6 total — mapped to phases 6–8 (REL-06 already Complete; 5 Pending)
- Unmapped: 0 ✓
- v1.0 (20 reqs) archived → [milestones/v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)

---
*Requirements defined: 2026-06-13*
*Last updated: 2026-06-14 — v1.0 archived at milestone completion; v1.1 traceability retained*
