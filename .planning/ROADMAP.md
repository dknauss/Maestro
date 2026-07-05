# Roadmap: Maestro

## Milestones

**Release binding:** GSD milestones are the system of record for their release artifacts. Historical milestones record shipped tags in `.planning/MILESTONES.md`; the active milestone records `release_target`, `release_tag`, release status, cut condition, pipeline, and release checklist in `.planning/STATE.md`.

- ✅ **v1.0 WordPress.org Release Readiness** — Phases 1–5 (shipped 2026-06-14; release tag `v1.0.0`) → [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Polish & Accessibility** — Phases 6–8 (shipped 2026-06-17; release line `1.1.x`, latest shipped `1.1.1`)
- ✅ **v1.2 Editor UX Polish** — Phases 9–12 (shipped 2026-06-22; release tag `v1.2.0`) → [archive](milestones/v1.2-ROADMAP.md)
- ✅ **R1 Third-Party Compatibility Research** — Phases 13–16 (completed 2026-06-29; non-versioned research — no plugin code, no release tag, no SVN deploy) → [archive](milestones/R1-ROADMAP.md)
- ✅ **v1.3.0 Slug-Resolution Hardening** — Phases 17–18 (shipped 2026-06-30; release tag `v1.3.0`) → [archive](milestones/v1.3.0-ROADMAP.md)
- 🚧 **v1.4 Compatibility, Roles & Showcase** — Phases 19–24 (in progress; release tag `v1.4.0`)

## Phases

<details>
<summary>✅ v1.0 WordPress.org Release Readiness (Phases 1–5) — SHIPPED 2026-06-14</summary>

Full phase details, success criteria, and outcomes are archived in
[milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md).

- [x] **Phase 1: Security Review** — REST auth, sanitization, capability filter, option handling confirmed safe
- [x] **Phase 2: Accessibility Audit** — keyboard operability, focus management, ARIA, save announcements
- [x] **Phase 3: Verification** — role-visibility/reset/icon-sanitization coverage; performance measured (unit 44/44, integration 29/29, e2e 9/9)
- [x] **Phase 4: Release Assets** — readme, graphics, screenshots, user docs for the .org listing
- [x] **Phase 5: Submit** — Plugin Check + WPCS clean on the build zip; submitted to WordPress.org

</details>

<details>
<summary>✅ v1.1 Polish & Accessibility (Phases 6–8) — SHIPPED 2026-06-17</summary>

**Milestone Goal:** Refine the shipped editor and finish the accessibility story. No new architecture — keyboard reordering, modified-state indicators, visual polish, heavier icons, documentation link hygiene, and a repeatable banner pipeline.

- [x] **Phase 6: Accessibility & Interaction** — Keyboard-accessible reordering + modified indicator with per-item reset affordance (completed 2026-06-16)
- [x] **Phase 7: Visual Polish & Icons** — Heavier bundled icon set mixed with dashicons + edit-mode UI polish (completed 2026-06-17; includes plan 07-04 defect fixes BUG-01..05 + idle-icon refinement)
- [x] **Phase 8: Docs & Brand Assets** — Documentation link hygiene (test-first checker) + verify/reconcile the shipped banner pipeline + listing polish (readme copy, Playground link, banner, screenshots). Executable scope (DOC-01, REL-06, DOC-02, DOC-03) complete 2026-06-17. REL-07/REL-08 (image work) deferred.

</details>

## Phase Details (v1.1)

### Phase 6: Accessibility & Interaction
**Goal**: The editor is fully keyboard-operable for reordering, and every changed item visibly signals its modified state with a discoverable per-item reset
**Depends on**: Phase 5
**Requirements**: A11Y-06, UX-01
**Success Criteria** (what must be TRUE):
  1. Menu items can be moved up and down using keyboard controls (e.g. modifier+arrow or ARIA grab/drop semantics) without a mouse — confirmed by keyboard-only walkthrough
  2. The keyboard reordering implementation holds at 0 regressions: unit 44/44, integration 29/29, e2e 9/9 green, Plugin Check 0 errors
  3. Each menu item that differs from the default shows a visible "modified" indicator in edit mode — confirmed by before/after screenshot
  4. Per-item reset is a discoverable affordance (visible or keyboard-reachable without prior knowledge), not buried or hidden
**Plans**: 3 plans
  - [x] 06-01-PLAN.md — TDD seam (node:test) + pure reorderMove/diffItem/resetItem helpers [A11Y-06, UX-01]
  - [x] 06-02-PLAN.md — Alt+Arrow keyboard reorder + wp.a11y.speak() move announcements + e2e [A11Y-06]
  - [x] 06-03-PLAN.md — modified indicator (non-color, AA) + discoverable per-item reset + docs + e2e [UX-01]

### Phase 7: Visual Polish & Icons
**Goal**: The bundled icon picker reads at a weight that mixes naturally with WordPress's solid dashicons, and the overall edit-mode UI is visually polished and responsive
**Depends on**: Phase 6
**Requirements**: ICON-01, UX-02, BUG-01, BUG-02, BUG-03, BUG-04, BUG-05
**Reopened 2026-06-16**: UX-02 sign-off is blocked by five edit-mode defects triaged from the wp-sudo thread (see REQUIREMENTS.md → Defects). BUG-01 (double "Saved" check) and BUG-03 (responsive button overlap) directly contradict success criterion 2; BUG-05 swaps the emoji status glyphs for dashicons.
**Success Criteria** (what must be TRUE):
  1. The bundled icon set uses solid/filled variants (Bootstrap `*-fill` or Heroicons Mini fallback) that sit visually alongside dashicons without appearing noticeably lighter — confirmed by side-by-side screenshot of the two tabs
  2. Edit-mode control hierarchy, spacing, and status clarity are improved with no text-overlap or control-resize regressions — confirmed by before/after screenshots and keyboard/mouse walkthrough notes
  3. Icon picker grid is visually scannable at the dashicons grid size (20px glyphs)
  4. UI changes hold at 0 regressions: unit 44/44, integration 29/29, e2e 9/9 green, Plugin Check 0 errors
**Plans**: 4 plans
  - [x] 07-01-PLAN.md — TDD fill-resolution policy + regenerate solid icon bundle [ICON-01]
  - [x] 07-02-PLAN.md — edit-mode polish: toolbar hierarchy, non-color status, ~20px grid, first-run cue [UX-02]
  - [x] 07-03-PLAN.md — e2e regression + side-by-side/before-after screenshots + walkthrough notes [UX-02, ICON-01]
  - [x] 07-04-PLAN.md — edit-mode defect fixes: BUG-01 (drop ✓ from i18n string), BUG-02 (move breadcrumb right of input so it can't shift + relabel "Title"), BUG-03 (toolbar wrap/stack at narrow widths), BUG-04+BUG-05 (replace emoji status glyphs ○⏳✓⚠ with dashicons; idle dot de-emphasised) + regression screenshots at narrow viewport [BUG-01, BUG-02, BUG-03, BUG-04, BUG-05, UX-02]

### Phase 8: Docs & Brand Assets
**Goal**: In-prose file references are live markdown links; the wp.org/GitHub banner is rebuilt from an editable SVG master with a repeatable pipeline; and the live directory listing is polished for the next release (readme copy, Playground demo link, refreshed banner + screenshots)
**Depends on**: Phase 7
**Requirements**: DOC-01, REL-06, DOC-02, DOC-03, REL-07, REL-08
**Listing polish added 2026-06-17** after the 1.0.0 page went live (see REQUIREMENTS.md → Docs & Assets). DOC-03 (Playground demo link) is a quick win and may ship as a standalone 1.0.1.
**Success Criteria** (what must be TRUE):
  1. Bare file-path references in README, readme.txt, user guide, SPEC, TESTING, and planning docs are converted to markdown links — confirmed by a grep for common bare-path patterns returning no results
  2. An editable vector source for the banner exists under `.wordpress-org/source/` with the decorative leader line before "ADMIN MENU" removed — **reconciled 2026-06-17:** the editable source is the in-code SVG master generated by `build_final.py` (the `banner_svg()`/`icon_svg()` builders + the `P = dict(...)` palette), not a standalone `.svg` file; intent met (editable source + leader line removed)
  3. `npm run assets:banners` regenerates `banner-772x250.png` and `banner-1544x500.png` from that source (Inkscape render + Pillow LANCZOS downscale) without manual steps — **verified 2026-06-17:** `build_final.py` builds the SVG in code, rasterizes via Inkscape (`subprocess.run(["inkscape", …])`), then downscales 2× → 1× with Pillow; re-run from committed source reproduced both banners byte-identically at exact dimensions
  4. The public banner files under `.wordpress-org/` are replaced with the regenerated versions after visual review
**Plans**: 4 plans (executable scope); REL-07/REL-08 deferred
  - [x] 08-01-PLAN.md — TDD doc-link checker (RED: enumerate inline-code refs resolving to real repo files, not yet links) [DOC-01]
  - [x] 08-02-PLAN.md — convert flagged refs to markdown links + fix 3 stale paths (GREEN: 0 offenders) [DOC-01]
  - [x] 08-03-PLAN.md — verify `npm run assets:banners` regen + reconcile REL-06 mechanism wording (in-code SVG master + Inkscape + Pillow) [REL-06]
  - [x] 08-04-PLAN.md — zero-regression suite + flip DOC-01 Complete + mark Phase 8 done [DOC-01, REL-06]
  - [x] 08-05-PLAN.md — readme.txt copy rewrite (wp-readme-optimizer) + Playground "Try it first" demo link in readme + GitHub README [DOC-02, DOC-03] — **done in PR #28 (1.1.0 release)**
  - [ ] 08-06-PLAN.md — refreshed banner graphic (REL-06 pipeline) + gallery-optimized screenshots & captions; replace public assets after visual review [REL-07, REL-08] — **deferred (image work)**

<details>
<summary>✅ v1.2 Editor UX Polish (Phases 9–12) — SHIPPED 2026-06-22</summary>

Full phase details, success criteria, and outcomes are archived in
[milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md).

- [x] **Phase 9: Editor UX Polish** — Persistent "Edit Mode" indicator + first-run attention pulse, rename placeholder, auto-clearing "Saved" state, mobile-density controls (UX-03, UX-04, UX-07) — complete 2026-06-19
- [ ] **Phase 10: Third-Party Menu Compatibility Research** — WooCommerce-first compatibility research spike (V2-16); non-blocking, independent of the release cut; not shipped in v1.2 — carry forward
- [x] **Phase 11: Editor Entry & Reorder Fixes** — Mobile-reachable editor entry (≤782px admin-bar toggle); separator-safe ▲/▼ reorder buttons; modified-state badge on the changed row; 4-plan gap-closure wave after UAT (UX-08, BUG-06, BUG-07) — complete 2026-06-22
- [x] **Phase 11.1: P1 Review Hardening (INSERTED)** — `custom_menu_order` gated on stored `top_order`; `Config::sanitize()` payload bounded; three save-race e2e scenarios locked in (HARD-01/02/03) — complete 2026-06-20
- [x] **Phase 11.2: Editor Toolbar Redesign (INSERTED)** — Icon-only unified toolbar with semantic colour; retroactive record-only phase built via interactive design iteration (UX-10) — complete 2026-06-22
- [x] **Phase 12: Release Assets Refresh** — Balanced banner regenerated via REL-06 pipeline; 6 recaptured directory screenshots against the final v1.2 UI; readme captions synced (REL-07, REL-08) — complete 2026-06-22

</details>

---

<details>
<summary>✅ R1 Third-Party Compatibility Research (Phases 13–16) — COMPLETE 2026-06-29</summary>

Full phase details, success criteria, and outcomes are archived in
[milestones/R1-ROADMAP.md](milestones/R1-ROADMAP.md). Audit: [milestones/R1-MILESTONE-AUDIT.md](milestones/R1-MILESTONE-AUDIT.md) (passed, 11/11).

**Milestone Goal:** Document how Maestro's sparse-delta replay behaves against the six highest-impact admin-menu-manipulating plugins; produce a reproducible wp-env harness, a classification schema, per-plugin surveys, a consolidated compatibility note, and a prioritized fix/limitation backlog. **No plugin code, no release tag, no SVN deploy.**

**Headline:** 0 broken cells across all six plugins × four Maestro operations; worst case is cosmetic "degraded". 42 survey issues collapsed into 13 forward COMPAT-xx items (COMPAT-01..03 actionable slug-resolution tweaks; the rest documented limitations).

- [x] **Phase 13: Compatibility Harness + Classification Schema** — six-plugin wp-env config at pinned versions + admin/lower-privilege users + schema + matrix template (completed 2026-06-26)
- [x] **Phase 14: WooCommerce Survey** — heaviest manipulator surveyed; schema stress-tested and finalized (completed 2026-06-28)
- [x] **Phase 15: Remaining Survey Set** — Jetpack, Yoast SEO, Elementor, WPForms, LifterLMS surveyed (Rank Math deferred) (completed 2026-06-29)
- [x] **Phase 16: Synthesis** — COMPATIBILITY-NOTE.md (DELV-01) + COMPAT-xx BACKLOG.md (DELV-02) (completed 2026-06-29)

</details>

---

<details>
<summary>✅ v1.3.0 Slug-Resolution Hardening (Phases 17–18) — SHIPPED 2026-06-30</summary>

Full phase details, success criteria, and outcomes are archived in
[milestones/v1.3.0-ROADMAP.md](milestones/v1.3.0-ROADMAP.md). Audit:
[milestones/v1.3.0-MILESTONE-AUDIT.md](milestones/v1.3.0-MILESTONE-AUDIT.md) (passed, 4/4).

**Milestone Goal:** Maestro overrides survive real-world slug variation (host moves, `ver=`/UTM query drift, entity-encoded `&amp;` taxonomy slugs) via a single resolve-time `normalize()` seam — a saved config keeps applying without manual re-save. Shipped as the FIX-01/02/03 payload in v1.3.0.

- [x] **Phase 17: Slug Normalization** — pure `Maestro\Slug::normalize()` (TDD, six R1 fixtures + 4-case collision guard) wired into Replay's items[] + `Ordering::submenu` reorder seams; dual-axis collision fail-safe; 88/88 unit green (FIX-01, FIX-02, FIX-03) — complete 2026-06-29
- [x] **Phase 18: Release v1.3.0** — version bump → tag `v1.3.0` on `884c6df` → GitHub Release + zip → wp.org SVN trunk + `1.3.0` tag, following the v1.2 pipeline (REL-09) — shipped 2026-06-30

</details>

---

## Phase Details (v1.4 — Compatibility, Roles & Showcase)

- [ ] **Phase 19: Cosmetic Hiding Feasibility** — feasibility note determining whether per-user/cloned-role menu hiding can stay strictly cosmetic; gates Phase 21
- [ ] **Phase 20: Third-Party Compatibility Fixes** — level-qualified match keys, badge/HTML-in-title preservation on rename, optional subtree-hide cascade (R1 backlog)
- [ ] **Phase 21: Cosmetic Per-User / Cloned-Role Hiding** — conditional on Phase 19 clearing the cosmetic-only bar
- [ ] **Phase 22: Slug-Resolution Showcase Demo** — Playground demo that visibly demonstrates the v1.3.0 slug-normalization fixes
- [ ] **Phase 23: Editor UX Polish** — native wp-admin restyle of all edit-mode surfaces (UX-13, added 2026-07-03), toolbar column-width pin, semantic-colour borders removed (UX-12 verdict), first-run banner centering — **executes next by user decision (depends only on Phase 18)**
- [ ] **Phase 24: Release v1.4.0** — cut and ship to WordPress.org; recapture editor screenshots for the UX-11 coachmark

### Phase 19: Cosmetic Hiding Feasibility
**Goal**: It is known, before any implementation, whether per-user and/or cloned-role menu hiding can be delivered without touching capabilities — and if so, how it should be stored and resolved
**Depends on**: Phase 18
**Requirements**: ROLE-01
**Success Criteria** (what must be TRUE):
  1. A written feasibility note states a clear go/no-go verdict on whether per-user/cloned-role hiding can stay strictly cosmetic (no capability grant/removal) within WordPress's role/user model
  2. If the verdict is go, the note specifies the storage shape (e.g. per-user override keyed by user ID vs. a cloned-role approach) and the resolution seam where it plugs into Replay
  3. If the verdict is no-go (cannot stay cosmetic), the note explains why and Phase 21 is marked deferred rather than attempted
  4. The note is reviewed and signed off before Phase 21 planning begins — Phase 21 cannot start without an explicit go verdict from this phase
**Plans**: TBD

### Phase 20: Third-Party Compatibility Fixes
**Goal**: Maestro's rename/hide overrides behave correctly against the remaining R1-identified compatibility gaps — same-slug top-level/submenu collisions, badge/HTML-bearing titles, and parent-hide cascade — without weakening the cosmetic-only guarantee
**Depends on**: Phase 18
**Requirements**: COMPAT-04, COMPAT-07, COMPAT-10
**Success Criteria** (what must be TRUE):
  1. A rename or hide override targeted at a top-level slug does not also apply to a submenu item that happens to render the same slug, and vice versa — verified against the R1 shared-slug fixtures as test cases
  2. Renaming a menu item that carries a trailing badge or HTML fragment in its title (update-count bubble, "NEW"/count span) preserves that badge/HTML instead of stripping it, verified against the 4/6 R1 plugins that use them
  3. An admin can enable an optional "cascade hide to children" setting on a parent item; with it off (default), hiding a parent leaves children visible; with it on, children are cosmetically hidden too, with no change to their underlying capabilities
  4. Existing PHP unit, integration, and Playwright e2e suites stay green; WPCS clean; PHPStan clean; Plugin Check 0 errors
**Plans**: TBD

### Phase 21: Cosmetic Per-User / Cloned-Role Hiding
**Goal**: An admin can hide menu items for a specific user or a cloned role, purely cosmetically, without ever changing what that user is actually permitted to do — conditional on Phase 19's feasibility verdict
**Depends on**: Phase 19 (deferred entirely if Phase 19 verdict is no-go)
**Requirements**: ROLE-02
**Success Criteria** (what must be TRUE):
  1. An admin can scope a menu-hiding rule to a specific user (or a cloned role) using the storage shape specified by Phase 19's feasibility note
  2. The hidden items for that user are computed by intersecting the hiding rule against the user's live roles/capabilities — no capability is granted or removed by applying the rule
  3. A page hidden for a user by this feature still loads successfully by direct URL if that user independently holds the capability for it — hiding is proven to be visibility-only, not access control
  4. An explicit automated test asserts the cosmetic-only guardrail: applying/removing a ROLE-02 rule does not change `current_user_can()` results for any capability
  5. Existing PHP unit, integration, and Playwright e2e suites stay green; WPCS clean; PHPStan clean; Plugin Check 0 errors
**Plans**: TBD

### Phase 22: Slug-Resolution Showcase Demo
**Goal**: A visitor to the Playground demo can see, concretely, that Maestro's v1.3.0 slug-normalization fixes work — not just a busier menu, but a saved override that visibly still applies despite a slug-form mismatch
**Depends on**: Phase 20
**Requirements**: DEMO-01
**Success Criteria** (what must be TRUE):
  1. The Playground demo pre-seeds a `maestro_config` whose override keys use a different slug form than the rendered menu (host-moved absolute URL, `ver=`-stamped, UTM-stamped, and `&amp;`-encoded variants), sourced from a lightweight demo-only fixture mu-plugin that registers items with the R1 survey slug shapes
  2. A visitor opens the demo and immediately observes the pre-seeded renames/hides landing correctly on the mismatched-slug items, with no manual re-save required
  3. Demo boot cost stays low (fixture mu-plugin, not a full third-party plugin install) and boots deterministically
  4. An optional "Try it with WooCommerce" opt-in blueprint is available (wizard suppressed, version pinned) without being required for the core demo story
**Plans**: TBD

### Phase 23: Editor UX Polish
**Goal**: The entire edit-mode UI reads as native wp-admin — quiet menu-native controls, muted Gutenberg-style status, colour reserved for errors and destructive actions — with the Edit Mode zone pinned to the menu column and the first-run banner reading cleanly
**Scope widened 2026-07-03** (user decision, `/gsd:discuss-phase 23`): UX-13 added — full native-wp-admin pass over all edit-mode surfaces; UX-12's discuss-and-refine resolved to *remove* the semantic-colour borders. Decisions locked in [23-CONTEXT.md](phases/23-editor-ux-polish/23-CONTEXT.md). Phase 23 executes next (it depends only on Phase 18).
**Depends on**: Phase 18
**Requirements**: UX-09, UX-12, UX-13, BUG-08
**Success Criteria** (what must be TRUE):
  1. The toolbar "Edit Mode" zone (mode + save status) is pinned to the admin-menu column width at the bottom of the menu column, seamless with the menu, and rejoins the bottom toolbar below 782px — confirmed by before/after screenshot
  2. The semantic-colour border system is removed: controls are quiet menu-native icon buttons, save status is Gutenberg-style muted (spinner / grey "Saved" / red "Save failed"), modified state is a non-colour dot + enabled Reset, and red appears only for errors and destructive Reset All — confirmed by before/after screenshot and an accessibility check (non-colour signals carry all state)
  3. All edit-mode surfaces (shared panel, icon/visibility popovers, first-run banner, coachmark, in-menu selection/badges) adopt core idioms per 23-CONTEXT.md, spot-checked on Default + Modern + Midnight admin colour schemes — confirmed by per-surface before/after screenshots
  4. The first-run banner's text and button are vertically centered instead of visually off-center — confirmed by before/after screenshot
  5. Existing PHP unit, integration, JS, and Playwright e2e suites stay green (e2e selector/colour assertions updated deliberately in-plan); Plugin Check 0 errors
**Plans**: 5 plans
Plans:
- [x] 23-01-PLAN.md — Remove semantic-colour borders; convert the bottom toolbar to native quiet controls + muted save status (UX-12, UX-13)
- [ ] 23-02-PLAN.md — Pin the Edit-Mode zone (mode + status) to the admin-menu column; 782px relocation gate; live-iteration proportions (UX-09, UX-13)
- [ ] 23-03-PLAN.md — Align the shared panel + icon/visibility popovers to core popover/postbox tokens (UX-13)
- [ ] 23-04-PLAN.md — First-run banner centering (BUG-08); wp-pointer coachmark restyle; in-menu selection/dot-badge token pass (BUG-08, UX-13)
- [ ] 23-05-PLAN.md — e2e selector/colour reconciliation + before/after screenshots (Default/Modern/Midnight) + full-suite gate (UX-13)

### Phase 24: Release v1.4.0
**Goal**: v1.4 is cut and live on WordPress.org — the runtime zip builds clean, all suites pass, the tag exists, SVN trunk is updated, and the directory/editor screenshots reflect the shipped UX-11 coachmark plus any v1.4 UX changes
**Depends on**: Phase 19, Phase 20, Phase 21, Phase 22, Phase 23
**Requirements**: REL-10
**Success Criteria** (what must be TRUE):
  1. `bin/build.sh` produces a clean runtime zip with no errors and Plugin Check reports 0 errors on the extracted zip
  2. PHP unit, integration, and Playwright e2e suites are all green at the release commit, including the ROLE-02 cosmetic-only guardrail test (or documented absence if Phase 19 deferred it)
  3. Directory and editor screenshots are recaptured to show the shipped UX-11 coachmark "?" control and any v1.4 UX changes (Phase 23), replacing stale v1.2/v1.3 captures
  4. The git tag `v1.4.0` exists and points to the release commit; the GitHub release is published
  5. SVN `trunk` is updated and the `1.4.0` SVN tag is cut, following the same pipeline used for v1.2.0/v1.3.0
**Plans**: TBD

---

## Progress

**Execution Order:**
v1.0 complete (Phases 1–5, archived). v1.1 complete (Phases 6–8, archived). v1.2 complete (Phases 9–12, archived 2026-06-22; Phase 10 was a non-blocking research spike not shipped in v1.2). R1 complete (Phases 13–16, archived 2026-06-29; non-versioned research). v1.3.0 complete (Phases 17–18, shipped 2026-06-30; release tag `v1.3.0`, archived). v1.4 in progress (Phases 19–24; release tag `v1.4.0`).

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Security Review | v1.0 | ✓ | Complete (archived) | 2026-06-14 |
| 2. Accessibility Audit | v1.0 | ✓ | Complete (archived) | 2026-06-14 |
| 3. Verification | v1.0 | ✓ | Complete (archived) | 2026-06-14 |
| 4. Release Assets | v1.0 | ✓ | Complete (archived) | 2026-06-14 |
| 5. Submit | v1.0 | ✓ | Complete (archived) | 2026-06-14 |
| 6. Accessibility & Interaction | v1.1 | 3/3 | Complete | 2026-06-16 |
| 7. Visual Polish & Icons | v1.1 | 4/4 | Complete | 2026-06-17 |
| 8. Docs & Brand Assets | v1.1 | 4/4 (executable scope; REL-07/08 deferred) | Complete | 2026-06-17 |
| 9. Editor UX Polish | v1.2 | 6/6 | Complete (shipped 2026-06-22) | 2026-06-19 |
| 10. Third-Party Compatibility Research | v1.2 | 0/TBD | Not shipped (research spike — carry forward) | - |
| 11. Editor Entry & Reorder Fixes | v1.2 | 8/8 | Complete (shipped 2026-06-22) | 2026-06-22 |
| 11.1. P1 Review Hardening | v1.2 | 4/4 | Complete (shipped 2026-06-22) | 2026-06-20 |
| 11.2. Editor Toolbar Redesign | v1.2 | record | Complete (shipped 2026-06-22) | 2026-06-22 |
| 12. Release Assets Refresh | v1.2 | 3/3 | Complete (shipped 2026-06-22) | 2026-06-22 |
| 13. Compatibility Harness + Classification Schema | R1 | 2/2 | Complete | 2026-06-26 |
| 14. WooCommerce Survey | R1 | 3/3 | Complete | 2026-06-28 |
| 15. Remaining Survey Set | R1 | 5/5 | Complete | 2026-06-29 |
| 16. Synthesis | R1 | 2/2 | Complete | 2026-06-29 |
| 17. Slug Normalization | v1.3.0 | 3/3 | Complete (shipped 2026-06-30) | 2026-06-29 |
| 18. Release v1.3.0 | v1.3.0 | 3/3 | Complete (shipped 2026-06-30) | 2026-06-30 |
| 19. Cosmetic Hiding Feasibility | v1.4 | 0/TBD | Not started | - |
| 20. Third-Party Compatibility Fixes | v1.4 | 0/TBD | Not started | - |
| 21. Cosmetic Per-User / Cloned-Role Hiding | v1.4 | 0/TBD | Not started (conditional on Phase 19) | - |
| 22. Slug-Resolution Showcase Demo | v1.4 | 0/TBD | Not started | - |
| 23. Editor UX Polish | v1.4 | 0/TBD | Not started | - |
| 24. Release v1.4.0 | v1.4 | 0/TBD | Not started | - |
