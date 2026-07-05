# Requirements: Maestro — v1.4 Compatibility, Roles & Showcase

**Defined:** 2026-07-03
**Core Value:** Editing the admin menu happens directly on the menu, with zero ceremony and zero risk to access — changes are cosmetic deltas, never a rebuilt menu, and never a security boundary.

**Milestone framing:** v1.3.0 shipped the slug-resolution normalization (FIX-01/02/03).
v1.4 broadens Maestro's real-world reach on four fronts: finish the actionable
third-party compatibility items from the R1 backlog, add **cosmetic** per-user /
cloned-role menu hiding (feasibility-gated, never access control), ship a
Playground demo that actually shows the v1.3.0 fixes working, and polish the
editor surfaces from v1.2/v1.3. Requirements reuse the stable R1 `COMPAT-xx` and
backlog IDs without renumbering.

---

## v1.4 Requirements

### Demo

- [ ] **DEMO-01**: A WordPress Playground demo pre-seeds a `maestro_config` whose override keys are in a *different* slug form than the rendered menu (host-move, `ver=`-stamped, UTM, and `&amp;`-encoded), against a busy menu, so a visitor sees the saved v1.3.0-style overrides still land. Uses a lightweight demo-only **fixture mu-plugin** (registers items with the R1 survey slug shapes; deterministic, near-zero boot cost); an optional **"Try it with WooCommerce"** opt-in blueprint is offered for name recognition but not required.

### Third-Party Compatibility (R1 backlog)

- [ ] **COMPAT-04**: A rename or hide override on a top-level slug does **not** also hit a submenu that renders the same slug — match keys are level-qualified (parent vs submenu), verified against the R1 shared-slug fixtures.
- [ ] **COMPAT-07**: A rename **preserves** a menu item's trailing badge / HTML-in-title (update-count bubble, "NEW"/count spans) instead of stripping it, for the R1 plugins that use them (4/6), verified by fixture.
- [ ] **COMPAT-10**: An admin can **optionally** cascade a parent hide to its children (subtree-hide), off by default; enabling it hides the children cosmetically without affecting access.

### Roles (cosmetic only)

- [x] **ROLE-01**: A feasibility note determines whether per-user and/or cloned-role cosmetic menu hiding can be delivered **without** touching capabilities (stays cosmetic per the core value) within WordPress's role/user model, and specifies the storage shape + resolution seam. **Gates ROLE-02** — if it can't stay cosmetic, ROLE-02 defers. *(Complete 2026-07-05 — Phase 19. Verdict: **partial-go**; both branches clear the cosmetic-only bar. Storage: inline `items[slug].hidden_users` axis + a `profiles` registry compiling onto `items[slug].hidden_profiles`; seam: widen `is_hidden_for_current_user()`. Phase 21 unblocked, per-user first. See `phases/19-cosmetic-hiding-feasibility/19-FEASIBILITY-NOTE.md`.)*
- [ ] **ROLE-02**: An admin can apply cosmetic menu-hiding rules scoped to a **specific user** (or a cloned role), intersected against that user's live roles. The rules never grant or remove a capability; a hidden page still loads by URL for a user who has the capability. *(conditional on ROLE-01)*

### Editor UX

- [x] **UX-09**: The toolbar "Edit Mode" zone is pinned to the admin-menu **column width** so it visually aligns with the menu it edits (distinct from the shipped UX-10 toolbar). *(Re-scoped in live iteration 2026-07-05: the pinned menu-column zone was built and tried against a running site, then **scrapped** as non-viable (misaligned, read as a stray element). UX-09's intent — a clear, native edit-mode indicator — is delivered instead by consolidating onto the WP Toolbar (admin-bar) toggle, relabelled **"Exit Menu Editor"** while editing, which names the mode and is the single entry/exit; a click-intercept flushes any pending auto-save before navigating. Decisions in `phases/23-editor-ux-polish/23-CONTEXT.md` §UX-09 geometry.)*
- [x] **UX-12**: The toolbar's semantic-colour borders are refined — clearer or replaced with a more legible signal — via a discuss-and-refine pass, keeping the colour mapping accessible (not colour-only). *(Discuss-and-refine completed 2026-07-03: verdict is **replace** — the colour-border system is removed outright, superseded by the UX-13 native treatment.)*
- [x] **UX-13**: All edit-mode surfaces (toolbar, shared controls panel, icon/visibility popovers, first-run banner, coachmark, in-menu selection/badges) adopt **native wp-admin idioms** — quiet menu-native controls, Gutenberg-style muted save status, core popover/pointer patterns, colour reserved for errors and destructive actions, admin-colour-scheme inheritance where feasible. Non-colour signals (icons/labels/screen-reader text) remain the primary state carriers. *(Added 2026-07-03 during the Phase 23 discussion — deliberate widening of the v1.4 editor-polish scope; decisions locked in `phases/23-editor-ux-polish/23-CONTEXT.md`.)* *(Delivered across Phases 23-01–23-05; 23-01 converted the bottom toolbar, 23-02 consolidated the toolbar Exit onto the admin-bar toggle, 23-03 aligned the shared panel + icon/visibility popovers to core tokens, 23-04 restyled the coachmark to a locally-replicated wp-pointer look, 23-05 spot-checked Modern/Midnight, reconciled e2e selector/colour assertions to the restyle, and closed the phase with a green full-suite gate (WCAG 1.4.1 accessibility confirmed) — complete 2026-07-05.)*
- [x] **BUG-08**: The first-run banner's text and button are vertically centered (low cosmetic). *(Fixed in Phase 23-04: the coachmark's footer buttons band and content area are vertically centered — confirmed across all 5 tour steps via the human-verify checkpoint.)*

### Release

- [ ] **REL-10**: v1.4 is cut and shipped — runtime zip builds clean, Plugin Check 0 errors, full PHP/JS/e2e suites green, tagged `v1.4.0`, deployed to WordPress.org SVN `trunk` following the v1.2/v1.3 pipeline; **directory/editor screenshots recaptured** to show the shipped UX-11 coachmark "?" control and any v1.4 UX changes.

### Cross-cutting (non-functional — applies to every phase)

- **Cosmetic-only guardrail (ROLE + COMPAT-10):** no requirement may grant or remove a capability. Hiding is visibility only, intersected against live roles; a hidden page still loads by URL for a capable user. Verified by an explicit test.
- **Non-destructive:** stored configs are never rewritten at resolve time (same contract as v1.3.0).
- **Zero regression:** existing PHP unit + integration + Playwright e2e stay green; Plugin Check 0 errors; WPCS clean; PHPStan clean.
- **TDD:** pure logic (match-key qualification, badge extraction, role/user resolution) is tested `expect(fn(in)).toBe(out)` before wiring.

---

## Deferred (future milestone)

- **COMPAT-05/06/08/09/11/12/13** — documented WordPress menu-model limitations from R1; docs-only, correct by design (carried as user-guidance, not code).
- **UX-11 follow-ups** beyond the screenshot recapture (the coachmark itself shipped in v1.3.0).

## Out of Scope

| Item | Reason |
|------|--------|
| Real access control / enforced tiers | Visibility is cosmetic by design; the page's own capability is the true gate. Bundling half-enforcement manufactures false security. An *enforced* per-user tier is out of scope entirely — Maestro never enforces and assumes **no dependency** on any other plugin to hold its cosmetic-only guarantee; any enforced tier would be separate work in a separate project, not Maestro core. |
| Front-end / non-admin menu editing | Admin menu only. |
| Reparenting, separators, import/export, multisite defaults, custom-icon upload | Post-1.0 backlog, not this milestone. |

---

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEMO-01 | Phase 22 | Pending |
| COMPAT-04 | Phase 20 | Pending |
| COMPAT-07 | Phase 20 | Pending |
| COMPAT-10 | Phase 20 | Pending |
| ROLE-01 | Phase 19 | ✅ Complete (partial-go) 2026-07-05 |
| ROLE-02 | Phase 21 (unblocked — go, per-user first) | Pending |
| UX-09 | Phase 23 | ✅ Complete 2026-07-05 |
| UX-12 | Phase 23 | ✅ Complete 2026-07-05 |
| UX-13 | Phase 23 | ✅ Complete 2026-07-05 |
| BUG-08 | Phase 23 | ✅ Complete 2026-07-05 |
| REL-10 | Phase 24 | Pending |

**Coverage:**
- v1.4 requirements: 11 total
- Mapped to phases: 11 (roadmap created)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-03*
*Last updated: 2026-07-05 — Phase 23-05 complete: UX-13 marked Complete; Phase 23 fully delivered (UX-09, UX-12, UX-13, BUG-08)*
