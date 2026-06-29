# Roadmap: Maestro

## Milestones

**Release binding:** GSD milestones are the system of record for their release artifacts. Historical milestones record shipped tags in `.planning/MILESTONES.md`; the active milestone records `release_target`, `release_tag`, release status, cut condition, pipeline, and release checklist in `.planning/STATE.md`.

- ✅ **v1.0 WordPress.org Release Readiness** — Phases 1–5 (shipped 2026-06-14; release tag `v1.0.0`) → [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Polish & Accessibility** — Phases 6–8 (shipped 2026-06-17; release line `1.1.x`, latest shipped `1.1.1`)
- ✅ **v1.2 Editor UX Polish** — Phases 9–12 (shipped 2026-06-22; release tag `v1.2.0`) → [archive](milestones/v1.2-ROADMAP.md)
- ✅ **R1 Third-Party Compatibility Research** — Phases 13–16 (completed 2026-06-29; non-versioned research — no plugin code, no release tag, no SVN deploy) → [archive](milestones/R1-ROADMAP.md)
- 🔄 **v1.3.0 Slug-Resolution Hardening** — Phases 17–18 (in progress; release tag `v1.3.0`)

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

## Phase Details (v1.3.0 — Slug-Resolution Hardening)

### Phase 17: Slug Normalization
**Goal**: Maestro overrides survive real-world slug variation — absolute-URL slugs on any host, slugs with `ver=` or UTM query params that drift on update, and entity-encoded `&amp;` taxonomy slugs — so a saved config keeps applying without manual re-save
**Depends on**: Phase 16
**Requirements**: FIX-01, FIX-02, FIX-03
**Success Criteria** (what must be TRUE):
  1. A rename or hide override on a Jetpack Settings or Elementor Website Templates submenu — both of which use absolute-URL slugs — keeps applying after a simulated host change and after the `ver=` param increments; verified by the R1 survey fixtures as PHPUnit test cases against the `normalize()` pure function
  2. A rename or hide override on the WPForms "Upgrade to Pro" submenu keeps applying when the UTM query string changes between plugin versions — the match resolves on base URL + path, ignoring UTM params; verified by the R1 survey fixture
  3. A rename or hide override on a WooCommerce, Elementor, or LifterLMS taxonomy submenu whose slug contains `&amp;` applies whether the stored key used `&` or `&amp;`; verified by the three R1 survey fixtures
  4. Two genuinely distinct rendered slugs never collapse to the same stored override key — a collision-guard test explicitly asserts that normalization is conservative (distinct-in, distinct-out)
  5. All existing PHP unit, integration, and Playwright e2e suites stay green; WPCS is clean; Plugin Check reports 0 errors
**Plans**: 3 plans
  - [ ] 17-01-PLAN.md — Pure `Maestro\Slug::normalize()` (TDD) + six-fixture data provider + 4-case collision-guard + edge rows [FIX-01, FIX-02, FIX-03]
  - [ ] 17-02-PLAN.md — Wire normalize() into Replay's two items[] seams + the `Ordering::submenu` reorder seam, with collision skip + integration coverage [FIX-01, FIX-02, FIX-03]
  - [ ] 17-03-PLAN.md — Zero-regression gate (full unit+integration+e2e+WPCS+PHPStan+Plugin Check) + draft v1.3.0 changelog note [FIX-01, FIX-02, FIX-03]

### Phase 18: Release v1.3.0
**Goal**: v1.3.0 is cut and on WordPress.org — the runtime zip builds clean, all suites pass, the tag exists, and SVN trunk is updated following the v1.2 release pipeline
**Depends on**: Phase 17
**Requirements**: REL-09
**Success Criteria** (what must be TRUE):
  1. `bin/build.sh` produces a clean runtime zip with no errors and Plugin Check reports 0 errors on the extracted zip
  2. PHP unit, integration, and Playwright e2e suites are all green at the release commit (no skips hiding failures)
  3. The git tag `v1.3.0` exists and points to the release commit; the GitHub release is published
  4. SVN `trunk` is updated and the `1.3.0` SVN tag is cut, following the same pipeline used for v1.2.0
**Plans**: TBD

---

## Progress

**Execution Order:**
v1.0 complete (Phases 1–5, archived). v1.1 complete (Phases 6–8, archived). v1.2 complete (Phases 9–12, archived 2026-06-22; Phase 10 was a non-blocking research spike not shipped in v1.2). R1 complete (Phases 13–16, archived 2026-06-29; non-versioned research). v1.3.0 in progress (Phases 17–18).

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
| 17. Slug Normalization | 2/3 | In Progress|  | - |
| 18. Release v1.3.0 | v1.3.0 | 0/TBD | Not started | - |
