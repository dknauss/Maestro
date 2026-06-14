# Requirements: Admin Menu Maestro

**Defined:** 2026-06-13
**Core Value:** Editing the admin menu happens directly on the menu, with zero ceremony and zero risk to access.

## v1 Requirements

Milestone: **v1.0 WordPress.org release readiness.** The plugin's features are
already shipped (see PROJECT.md → Validated); these requirements cover what's
left to publish responsibly.

### Security

- [ ] **SEC-01**: REST routes reject non-capable users and missing/invalid nonces (verified, not just asserted)
- [ ] **SEC-02**: `Config::sanitize_icon()` cannot yield an executable/unsafe value for any of the four icon forms (data-URI and URL surfaces confirmed non-executing in render context)
- [ ] **SEC-03**: Slug, title, and role inputs are sanitized server-side with no injection or stored-XSS path
- [ ] **SEC-04**: The `amm_capability` filter and edit-mode gate cannot be used to escalate privileges or act beyond the editor
- [ ] **SEC-05**: Option writes/reads are safe (no unserialize-of-untrusted, no autoload bloat) and documented

### Accessibility

- [ ] **A11Y-01**: The selection model is fully keyboard operable (select, rename, icon, visibility, reset reachable without a mouse)
- [ ] **A11Y-02**: Focus is managed sensibly on select / panel open / popover open+close
- [ ] **A11Y-03**: Save status is announced to assistive tech (e.g. `wp.a11y.speak()` on Saved/Error)
- [ ] **A11Y-04**: Icon picker dialog/tabs/grid expose correct ARIA roles and labels (audit-confirmed)
- [ ] **A11Y-05**: Keyboard-accessible reordering gap is documented as a known limitation (full fix is v2)

### Testing

- [ ] **TEST-01**: E2E proves per-role visibility — hide from a role, switch user, confirm hidden for them and present for admin
- [ ] **TEST-02**: E2E/integration cover reset-this-item and reset-all edge cases
- [ ] **TEST-03**: Icon-form and sanitization edge cases have explicit coverage (rejections + acceptances)

### Performance

- [ ] **PERF-01**: Admin-load overhead is measured and acceptable (single autoload:false option read; replay is O(menu))
- [ ] **PERF-02**: Edit-mode localized payload (menu model + bundled icons) is only loaded in edit mode and is reasonably sized

### Release

- [ ] **REL-01**: readme.txt has a `== Screenshots ==` section matching shipped screenshots
- [ ] **REL-02**: WordPress.org SVN `assets/` graphics exist: `icon-128x128`, `icon-256x256`, `banner-772x250`, `banner-1544x500`
- [ ] **REL-03**: Annotated screenshots captured (from the Playground demo) for the listing
- [ ] **REL-04**: User-facing documentation (how to edit, per-role visibility caveat, icons)
- [ ] **REL-05**: Final Plugin Check + WPCS pass on the build zip, then submit to WordPress.org

## v2 Requirements

Post-1.0 backlog (from SPEC.md → Roadmap). Tracked, not in this roadmap.

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

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real access control / page locking | Visibility is cosmetic by design; the page's capability is the true gate |
| Front-end or non-admin-menu editing | Admin menu only |
| Rebuilt/stored full menu | Delta-only by design (reset trivially, survive plugin churn) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 1: Security Review | Pending |
| SEC-02 | Phase 1: Security Review | Pending |
| SEC-03 | Phase 1: Security Review | Pending |
| SEC-04 | Phase 1: Security Review | Pending |
| SEC-05 | Phase 1: Security Review | Pending |
| A11Y-01 | Phase 2: Accessibility Audit | Pending |
| A11Y-02 | Phase 2: Accessibility Audit | Pending |
| A11Y-03 | Phase 2: Accessibility Audit | Pending |
| A11Y-04 | Phase 2: Accessibility Audit | Pending |
| A11Y-05 | Phase 2: Accessibility Audit | Pending |
| TEST-01 | Phase 3: Verification | Pending |
| TEST-02 | Phase 3: Verification | Pending |
| TEST-03 | Phase 3: Verification | Pending |
| PERF-01 | Phase 3: Verification | Pending |
| PERF-02 | Phase 3: Verification | Pending |
| REL-01 | Phase 4: Release Assets | Pending |
| REL-02 | Phase 4: Release Assets | Pending |
| REL-03 | Phase 4: Release Assets | Pending |
| REL-04 | Phase 4: Release Assets | Pending |
| REL-05 | Phase 5: Submit | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-13*
*Last updated: 2026-06-13 after roadmap creation*
