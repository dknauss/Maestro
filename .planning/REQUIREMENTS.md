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

- [x] **COMPAT-04**: A rename or hide override on a top-level slug does **not** also hit a submenu that renders the same slug — match keys are level-qualified (parent vs submenu), verified against the R1 shared-slug fixtures.
- [x] **COMPAT-07**: A rename **preserves** a menu item's trailing badge / HTML-in-title (update-count bubble, "NEW"/count spans) instead of stripping it, for the R1 plugins that use them (4/6), verified by fixture.
- [x] **COMPAT-10**: An admin can **optionally** hide all of a parent's live sub-items from specific roles — independent of whether the parent itself is hidden — cosmetically, without affecting access. *(Revised 2026-08-01: the original "cascade rides the parent hide" design was found inert — WordPress core already hides a hidden parent's whole rendered subtree, so cascading on top of that produced no observable difference. Delivered instead as an independent per-parent `child_hidden_roles` role set, exposed as a second "Hide its sub-items from:" role group in the visibility popover, so hiding sub-items is a genuinely visible, standalone effect.)*

### Roles (cosmetic only)

- [x] **ROLE-01**: A feasibility note determines whether per-user and/or cloned-role cosmetic menu hiding can be delivered **without** touching capabilities (stays cosmetic per the core value) within WordPress's role/user model, and specifies the storage shape + resolution seam. **Gates ROLE-02** — if it can't stay cosmetic, ROLE-02 defers. *(Complete 2026-07-05 — Phase 19. Verdict: **partial-go**; both branches clear the cosmetic-only bar. Storage: inline `items[slug].hidden_users` axis + a `profiles` registry compiling onto `items[slug].hidden_profiles`; seam: widen `is_hidden_for_current_user()`. Phase 21 unblocked, per-user first. See `phases/19-cosmetic-hiding-feasibility/19-FEASIBILITY-NOTE.md`.)*
- [~] **ROLE-02**: An admin can apply cosmetic menu-hiding rules scoped to a **specific user** (or a cloned role), intersected against that user's live roles. The rules never grant or remove a capability; a hidden page still loads by URL for a user who has the capability. *(conditional on ROLE-01)* — **PARTIALLY DELIVERED (Phase 21, v1.5).** The **per-user** half is complete: `items[slug].hidden_users` + `child_hidden_users`, resolved through the same single `is_hidden_for_current_user()` seam as the role axes, with the cosmetic invariant enforced by `tests/integration/CosmeticInvariantUsersTest.php` and the effect proven in a targeted user's real sidebar by `tests/e2e/specs/hidden-users.spec.ts`. The **cloned-role "profiles"** half is NOT delivered and remains a v1.5 backlog item — see `todos/pending/2026-08-02-cloned-role-hiding-profiles.md`; the seam is built as an OR of independent terms so `hidden_profiles` lands as a third term without rework. Known limitation: on multisite, network super admins are exempt from the per-user axis only (the role axes keep their v1.4.1 behaviour) — an intentional asymmetry, now covered by a dedicated multisite CI lane (`npm run test:php:multisite`). SHIPPED in v1.5.0 (tag `v1.5.0` on `694b1bf`, 2026-08-09).

### Editor UX

- [x] **UX-09**: The toolbar "Edit Mode" zone is pinned to the admin-menu **column width** so it visually aligns with the menu it edits (distinct from the shipped UX-10 toolbar). *(Re-scoped in live iteration 2026-07-05: the pinned menu-column zone was built and tried against a running site, then **scrapped** as non-viable (misaligned, read as a stray element). UX-09's intent — a clear, native edit-mode indicator — is delivered instead by consolidating onto the WP Toolbar (admin-bar) toggle, relabelled **"Exit Menu Editor"** while editing, which names the mode and is the single entry/exit; a click-intercept flushes any pending auto-save before navigating. Decisions in `phases/23-editor-ux-polish/23-CONTEXT.md` §UX-09 geometry.)*
- [x] **UX-12**: The toolbar's semantic-colour borders are refined — clearer or replaced with a more legible signal — via a discuss-and-refine pass, keeping the colour mapping accessible (not colour-only). *(Discuss-and-refine completed 2026-07-03: verdict is **replace** — the colour-border system is removed outright, superseded by the UX-13 native treatment.)*
- [x] **UX-13**: All edit-mode surfaces (toolbar, shared controls panel, icon/visibility popovers, first-run banner, coachmark, in-menu selection/badges) adopt **native wp-admin idioms** — quiet menu-native controls, Gutenberg-style muted save status, core popover/pointer patterns, colour reserved for errors and destructive actions, admin-colour-scheme inheritance where feasible. Non-colour signals (icons/labels/screen-reader text) remain the primary state carriers. *(Added 2026-07-03 during the Phase 23 discussion — deliberate widening of the v1.4 editor-polish scope; decisions locked in `phases/23-editor-ux-polish/23-CONTEXT.md`.)* *(Delivered across Phases 23-01–23-05; 23-01 converted the bottom toolbar, 23-02 consolidated the toolbar Exit onto the admin-bar toggle, 23-03 aligned the shared panel + icon/visibility popovers to core tokens, 23-04 restyled the coachmark to a locally-replicated wp-pointer look, 23-05 spot-checked Modern/Midnight, reconciled e2e selector/colour assertions to the restyle, and closed the phase with a green full-suite gate (WCAG 1.4.1 accessibility confirmed) — complete 2026-07-05.)*
- [x] **BUG-08**: The first-run banner's text and button are vertically centered (low cosmetic). *(Fixed in Phase 23-04: the coachmark's footer buttons band and content area are vertically centered — confirmed across all 5 tour steps via the human-verify checkpoint.)*

### Release

- [x] **REL-10**: v1.4 is cut and shipped — runtime zip builds clean, Plugin Check 0 errors, full PHP/JS/e2e suites green, tagged `v1.4.0`, deployed to WordPress.org SVN `trunk` following the v1.2/v1.3 pipeline; **directory/editor screenshots recaptured** to show the shipped UX-11 coachmark "?" control and any v1.4 UX changes. *(Complete 2026-08-04 — Phase 24. Tag `v1.4.0` on `482510c` (PR #113), GitHub Release published, SVN `trunk` + `tags/1.4.0/` + assets verified; all 11 release gates recorded in STATE.md. Patch **v1.4.1** followed 2026-08-05 (PR #116, tag on `c6cdcbe`) for the shared-slug propagation defect. Shipped without Phases 21/22 per the Release Binding fallback — ROLE-02 deferred to v1.5.)*

### Cross-cutting (non-functional — applies to every phase)

- **Cosmetic-only guardrail (ROLE + COMPAT-10):** no requirement may grant or remove a capability. Hiding is visibility only, intersected against live roles; a hidden page still loads by URL for a capable user. Verified by an explicit test.
- **Non-destructive:** stored configs are never rewritten at resolve time (same contract as v1.3.0).
- **Zero regression:** existing PHP unit + integration + Playwright e2e stay green; Plugin Check 0 errors; WPCS clean; PHPStan clean.
- **TDD:** pure logic (match-key qualification, badge extraction, role/user resolution) is tested `expect(fn(in)).toBe(out)` before wiring.

---

## v1.5 Requirements

**Milestone framing:** v1.4 shipped without ROLE-02, which deferred to v1.5 under
the Release Binding fallback. Phase 21 then built ROLE-02's per-user half
(2026-08-08) — so v1.5 exists primarily to **release work that already exists**
rather than to build new scope. Phases 22 and 25 may ride along if they land
first; neither blocks the cut.

### Release

- [x] **REL-11**: v1.5 is cut and shipped — runtime zip builds clean, Plugin Check 0 errors, full PHP/JS/e2e suites green, tagged `v1.5.0`, deployed to WordPress.org SVN `trunk` following the v1.2/v1.3/v1.4 pipeline (**including the manual `wp-deploy.yml` dispatch**, which has never been automatic); changelog verified against the `v1.4.1..main` diff rather than the phase list; **screenshot 3 recaptured** to show the visibility popover's four groups instead of two; and the multisite super-admin exemption stated as a known limitation.

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
| COMPAT-04 | Phase 20 | ✅ Complete 2026-08-01 |
| COMPAT-07 | Phase 20 | ✅ Complete 2026-08-01 |
| COMPAT-10 | Phase 20 | ✅ Complete 2026-08-01 |
| ROLE-01 | Phase 19 | ✅ Complete (partial-go) 2026-07-05 |
| ROLE-02 | Phase 21 | 🟡 Partial — per-user ✅ (Phase 21, v1.5); cloned-role profiles ⬜ deferred to backlog |
| UX-09 | Phase 23 | ✅ Complete 2026-07-05 |
| UX-12 | Phase 23 | ✅ Complete 2026-07-05 |
| UX-13 | Phase 23 | ✅ Complete 2026-07-05 |
| BUG-08 | Phase 23 | ✅ Complete 2026-07-05 |
| REL-10 | Phase 24 | ✅ Complete 2026-08-04 (v1.4.0; patch v1.4.1 2026-08-05) |
| REL-11 | Phase 26 (v1.5) | ✅ Complete 2026-08-09 (tag v1.5.0 on 694b1bf; SVN verified) |

**Coverage:**
- v1.4 requirements: 11 total
- Mapped to phases: 11 (roadmap created)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-03*
*Last updated: 2026-07-05 — Phase 23-05 complete: UX-13 marked Complete; Phase 23 fully delivered (UX-09, UX-12, UX-13, BUG-08)*
