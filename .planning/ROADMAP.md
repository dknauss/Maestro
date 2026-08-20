# Roadmap: Maestro

## Milestones

**Release binding:** GSD milestones are the system of record for their release artifacts. Historical milestones record shipped tags in `.planning/MILESTONES.md`; the active milestone records `release_target`, `release_tag`, release status, cut condition, pipeline, and release checklist in `.planning/STATE.md`.

- ✅ **v1.0 WordPress.org Release Readiness** — Phases 1–5 (shipped 2026-06-14; release tag `v1.0.0`) → [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Polish & Accessibility** — Phases 6–8 (shipped 2026-06-17; release line `1.1.x`, latest shipped `1.1.1`)
- ✅ **v1.2 Editor UX Polish** — Phases 9–12 (shipped 2026-06-22; release tag `v1.2.0`) → [archive](milestones/v1.2-ROADMAP.md)
- ✅ **R1 Third-Party Compatibility Research** — Phases 13–16 (completed 2026-06-29; non-versioned research — no plugin code, no release tag, no SVN deploy) → [archive](milestones/R1-ROADMAP.md)
- ✅ **v1.3.0 Slug-Resolution Hardening** — Phases 17–18 (shipped 2026-06-30; release tag `v1.3.0`) → [archive](milestones/v1.3.0-ROADMAP.md)
- ✅ **v1.4 Compatibility, Roles & Showcase** — Phases 19–24 (shipped 2026-08-04; release tag `v1.4.0`, patch `v1.4.1` 2026-08-05). Shipped **without** Phase 21 (ROLE-02, deferred to v1.5 under the Release Binding fallback) and Phase 22 (not reached; still open).
- ✅ **v1.5 Per-User Visibility** — Phase 21 + Phase 26 (shipped 2026-08-09; release tag `v1.5.0` on `694b1bf`). Delivered ROLE-02's **per-user half**; the cloned-role "profiles" half remains a backlog item. Phases 22 and 25 were optional inclusions and did **not** make the cut, per the fallback. Phase 25 has since been completed post-release (2026-08-09, human-verified) and will ride the next release; Phase 22 remains open.

## Next up

Not yet scheduled into a milestone; listed here because it is the first thing to
decide on rather than the first thing to build.

### Bootstrap icon colour — [#172](https://github.com/dknauss/Maestro/issues/172)

All 87 icons in the Bootstrap set sit at a fixed `#a7aaad`. Dashicons lighten on
hover, go white on the current item, and follow the admin colour scheme; the
Bootstrap ones do none of it, so a mixed menu looks inconsistent exactly where
the eye lands.

This is a known trade-off, not an oversight — `bin/generate-bootstrap-icons.mjs`
bakes the grey in because a data-URI used as a CSS `background-image` cannot
resolve `currentColor`, and dashicons get it free by being a font. The
constraint is core's: `wp-admin/menu-header.php` has no branch that would let a
plugin emit inline `<svg>`. 7.1's SVG Icon API does not change this — see
[#162](https://github.com/dknauss/Maestro/issues/162).

Four options, cheapest first:

1. **Document it in the picker.** A note on the Bootstrap set so the behaviour
   is chosen rather than discovered. Fixes nothing; costs nothing.
2. **CSS filter** (`brightness(0) invert(1)`) on hover/current. One line, no
   payload cost, but it can only reach pure white — wrong against any scheme
   whose icon-focus colour is not white.
3. **Per-state generated variants.** Bake a white copy and swap
   `background-image`. Doubles the set's payload and still misses custom
   colour schemes, which vary the colour rather than just its lightness.
4. **Inline SVG injected by JS.** The only option that genuinely inherits
   `currentColor` and so tracks every scheme and state. Also the most invasive:
   rewriting core's menu markup on every admin page for every user.

**Recommendation:** (1) now, (2) if the inconsistency is worth an approximation.
(4) only alongside [#167](https://github.com/dknauss/Maestro/issues/167) /
[#168](https://github.com/dknauss/Maestro/issues/168) — it is the same
architectural bet and should not be taken for icon colour alone.

**Note:** there are two icon sets, `dashicons` and `bootstrap`, registered in
`Assets::icon_sets()`. There is no third. A set registered through the 7.1 SVG
Icon API would be the obvious candidate, but per #162 it would land with exactly
this same limitation.

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

- [x] **Phase 19: Cosmetic Hiding Feasibility** — feasibility note determining whether per-user/cloned-role menu hiding can stay strictly cosmetic; gates Phase 21 (completed 2026-07-05)
- [x] **Phase 20: Third-Party Compatibility Fixes** — level-qualified match keys, badge/HTML-in-title preservation on rename, optional subtree-hide cascade (R1 backlog) (completed 2026-08-02)
- [~] **Phase 21: Cosmetic Per-User / Cloned-Role Hiding** — per-user half COMPLETE (5/5 plans, 2026-08-08, shipping under v1.5); cloned-role profiles deferred to backlog
- [ ] **Phase 22: Slug-Resolution Showcase Demo** — Playground demo that visibly demonstrates the v1.3.0 slug-normalization fixes
- [x] **Phase 23: Editor UX Polish** — native wp-admin restyle of all edit-mode surfaces (UX-13, added 2026-07-03), semantic-colour borders removed (UX-12 verdict), first-run banner centering (BUG-08) — complete 2026-07-05
- [x] **Phase 24: Release v1.4.0** — cut and shipped to WordPress.org 2026-08-04 (tag `v1.4.0` on `482510c`, PR #113); editor + directory screenshots recaptured. Patch **v1.4.1** followed 2026-08-05 (tag on `c6cdcbe`, PR #116) for the shared-slug propagation defect. Shipped WITHOUT Phases 21 and 22 — see the outcome note below
- [x] **Phase 25: Edit-Mode Toolbar Dark-Surface Polish** — ✅ COMPLETE 2026-08-09 (2/2 plans; human-verified). Audit struck 1 of 5 criteria as already satisfied, downgraded 1 from fix to choice, absorbed 1. Shipped: reserved status slot, focus ring 3.07:1 → 6.74:1, a11y M2/M3. Original text follows — dark-toolbar icon/focus contrast (WCAG 1.4.11), save-indicator layout shift, rename commit feedback (added 2026-08-02; pre-existing v1.3.1 surfaces, non-blocking for v1.4.0)
- [ ] **Phase 27: Cloned-Role Hiding Profiles** — completes ROLE-02's deferred half: a named, Maestro-internal hiding profile that compiles onto an inline `hidden_profiles` axis and resolves through the seam slot Phase 21 reserved at `class-replay.php:510` (planned 2026-08-10)
- [ ] **Phase 28: Configurable Admin Menu Width** — a global `menu_width` so a renamed item no longer wraps at 160px, plus the fold decision it depends on: edit mode keeps forcing unfold but the collapse control stops pretending to work (planned 2026-08-10)

### Phase 19: Cosmetic Hiding Feasibility
**Goal**: It is known, before any implementation, whether per-user and/or cloned-role menu hiding can be delivered without touching capabilities — and if so, how it should be stored and resolved
**Depends on**: Phase 18
**Requirements**: ROLE-01
**Success Criteria** (what must be TRUE):
  1. A written feasibility note states a clear go/no-go verdict on whether per-user/cloned-role hiding can stay strictly cosmetic (no capability grant/removal) within WordPress's role/user model
  2. If the verdict is go, the note specifies the storage shape (e.g. per-user override keyed by user ID vs. a cloned-role approach) and the resolution seam where it plugs into Replay
  3. If the verdict is no-go (cannot stay cosmetic), the note explains why and Phase 21 is marked deferred rather than attempted
  4. The note is reviewed and signed off before Phase 21 planning begins — Phase 21 cannot start without an explicit go verdict from this phase
**Plans**: 1 plan
  - [ ] 19-01-PLAN.md — Write the ROLE-01 feasibility note (go/no-go verdict + storage/seam recommendation + guardrail test sketch) and gate it on human sign-off

### Phase 20: Third-Party Compatibility Fixes
**Goal**: Maestro's rename/hide overrides behave correctly against the remaining R1-identified compatibility gaps — same-slug top-level/submenu collisions, badge/HTML-bearing titles, and parent-hide cascade — without weakening the cosmetic-only guarantee
**Depends on**: Phase 18
**Requirements**: COMPAT-04, COMPAT-07, COMPAT-10
**Success Criteria** (what must be TRUE):
  1. A rename or hide override targeted at a top-level slug does not also apply to a submenu item that happens to render the same slug, and vice versa — verified against the R1 shared-slug fixtures as test cases
  2. Renaming a menu item that carries a trailing badge or HTML fragment in its title (update-count bubble, "NEW"/count span) preserves that badge/HTML instead of stripping it, verified against the 4/6 R1 plugins that use them
  3. An admin can optionally hide all of a parent's live sub-items from specific roles — independent of whether the parent itself is hidden — with no change to their underlying capabilities. *(Revised 2026-08-01/02: the original "cascade rides the parent hide" design was found inert since WordPress core already hides a hidden parent's whole rendered subtree; delivered instead as an independent `child_hidden_roles` role set, a genuinely visible standalone effect. See `20-CONTEXT.md`'s REVISION NOTE.)*
  4. Existing PHP unit, integration, and Playwright e2e suites stay green; WPCS clean; PHPStan clean; Plugin Check 0 errors
**Plans**: 6 plans in 5 waves
Plans:
- [x] 20-01-PLAN.md — COMPAT-04: qualified-key storage foundation (pure key helper + Config::sanitize) [COMPAT-04]
- [x] 20-02-PLAN.md — COMPAT-04: replay + editor-model qualified resolution with legacy bare fallback [COMPAT-04]
- [x] 20-03-PLAN.md — COMPAT-04: client A1b (qualified model + stable submenu DOM bind) + shared-slug e2e [COMPAT-04]
- [x] 20-04-PLAN.md — COMPAT-07: text-node badge/HTML preservation on rename (pure helper + replay wiring) [COMPAT-07]
- [x] 20-05-PLAN.md — COMPAT-10: cascade-hide server (pure computation + replay + cosmetic-only guardrail) — SUPERSEDED by 20-06's revision (boolean cascade_hide replaced with independent child_hidden_roles) [COMPAT-10]
- [x] 20-06-PLAN.md — COMPAT-10: independent child_hidden_roles UI in visibility popover + phase zero-regression gate (revised design) [COMPAT-10]

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
**Plans**: 21-01 storage · 21-02 seam + cascade · 21-03 guardrail · 21-04 editor + picker · 21-05 e2e + gate + close (5/5 complete 2026-08-08)
**Outcome**: Criteria 1–5 all met for the **per-user** half, which is what this
phase scoped (the cloned-role "profiles" half was deferred to a backlog todo at
context-gathering time and remains so). Criterion 4's guardrail is
`tests/integration/CosmeticInvariantUsersTest.php`; criterion 3 is additionally
proven in a real browser in `tests/e2e/specs/hidden-users.spec.ts`. Known
limitation carried forward: on multisite, network super admins are exempt from
the per-user axis only — that branch is untested, as the suite runs single-site.

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

### Phase 23: Editor UX Polish — COMPLETE 2026-07-05
**Goal**: The entire edit-mode UI reads as native wp-admin — quiet menu-native controls, muted Gutenberg-style status, colour reserved for errors and destructive actions — with the edit mode named by the WP Toolbar "Exit Menu Editor" toggle (the menu-column pin was tried and scrapped in live iteration, 2026-07-05) and the first-run coachmark reading cleanly
**Scope widened 2026-07-03** (user decision, `/gsd:discuss-phase 23`): UX-13 added — full native-wp-admin pass over all edit-mode surfaces; UX-12's discuss-and-refine resolved to *remove* the semantic-colour borders. Decisions locked in [23-CONTEXT.md](phases/23-editor-ux-polish/23-CONTEXT.md).
**Depends on**: Phase 18
**Requirements**: UX-09, UX-12, UX-13, BUG-08 — all delivered
**Success Criteria** (what must be TRUE):
  1. The edit-mode indicator is the WP Toolbar (admin-bar) toggle — the single entry/exit — relabelled **"Exit Menu Editor"** while editing (menu-column pin and the redundant bottom-toolbar Exit both scrapped in live iteration, 2026-07-05); its click flushes any pending auto-save before navigating; the bottom toolbar holds only editing controls (muted save-status + per-item tools + Reset All), no Exit or mode chip — confirmed by before/after screenshot
  2. The semantic-colour border system is removed: controls are quiet menu-native icon buttons, save status is Gutenberg-style muted (spinner / grey "Saved" / red "Save failed"), modified state is a non-colour dot + enabled Reset, and red appears only for errors and destructive Reset All — confirmed by before/after screenshot and an accessibility check (non-colour signals carry all state)
  3. All edit-mode surfaces (shared panel, icon/visibility popovers, first-run banner, coachmark, in-menu selection/badges) adopt core idioms per 23-CONTEXT.md, spot-checked on Default + Modern + Midnight admin colour schemes — confirmed by per-surface before/after screenshots
  4. The first-run banner's text and button are vertically centered instead of visually off-center — confirmed by before/after screenshot
  5. Existing PHP unit, integration, JS, and Playwright e2e suites stay green (e2e selector/colour assertions updated deliberately in-plan) — JS 53/53, e2e 31/31, PHP unit 90/90, PHP integration 47/47, WPCS/PHPStan clean; Plugin Check 0 errors on Phase 23's shipped code (4 pre-existing dev-tree findings deferred to Phase 24, see [deferred-items.md](phases/23-editor-ux-polish/deferred-items.md))
**Plans**: 5 plans (5/5 complete)
Plans:
- [x] 23-01-PLAN.md — Remove semantic-colour borders; convert the bottom toolbar to native quiet controls + muted save status (UX-12, UX-13)
- [x] 23-02-PLAN.md — REVISED 2026-07-05 (live iteration): the pinned menu-column zone was built, viewed against the running site, and scrapped as out-of-sync; the bottom-toolbar Exit was then removed as redundant with the WP Toolbar admin-bar toggle, which is now the single entry/exit relabelled "Exit Menu Editor" with a re-homed save-flush-on-exit intercept, plus a Reset All underline fix (UX-09, UX-13)
- [x] 23-03-PLAN.md — Align the shared panel + icon/visibility popovers to core popover/postbox tokens (UX-13). Most tokens already matched core from plans 01/02; closed the one real gap (missing core-blue focus-visible rings on several popover/panel controls) and documented the panel's necessary colour-scheme hardcode.
- [x] 23-04-PLAN.md — First-run banner centering (BUG-08) and coachmark wp-pointer restyle, REPLICATED LOCALLY (locked default confirmed by live-verify checkpoint, not escalated to enqueue); in-menu selection/dot-badge tokens reconfirmed aligned. Checkpoint verified on Default admin colour scheme; Modern/Midnight deferred to 23-05 (BUG-08, UX-13)
- [x] 23-05-PLAN.md — e2e selector/colour reconciliation + before/after screenshots (Default/Modern/Midnight) + full-suite gate (UX-13) — complete 2026-07-05

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
**Plans**: executed directly as the release PR (#113), not as numbered plan files
**Outcome**: ✅ **SHIPPED 2026-08-04.** All five criteria met; 11 release gates
recorded in STATE.md's v1.4.0 checklist. Tag `v1.4.0` on `482510c`, GitHub
Release published, wp.org SVN `trunk` + `tags/1.4.0/` + assets verified.

**Two deviations worth knowing, because the dependency line above does not
reflect what happened:**

1. **Shipped without Phase 21 and Phase 22.** The stated dependencies list both,
   but the Release Binding's documented fallback allowed ROLE-02 (Phase 21) to
   defer if it wasn't ready, and it was — deferred to v1.5, where Phase 21
   executed on 2026-08-08. Phase 22 (the demo) was simply not reached and remains
   open. So this phase's completion does NOT imply 21 or 22 were done at the time.
2. **Criterion 2's "documented absence" path was taken for a different reason
   than written.** The criterion anticipated Phase 19 deferring the guardrail;
   in fact Phase 19 gave a go verdict and it was the *release* that deferred
   Phase 21. The guardrail now exists —
   `tests/integration/CosmeticInvariantUsersTest.php`, added by Phase 21 —
   but it was not present at the v1.4.0 tag.

**Follow-up patch:** v1.4.1 shipped 2026-08-05 (PR #116, tag on `c6cdcbe`) for
the shared-slug top-level→submenu propagation defect (#115). Not a security
release; the propagation could apply an unintended rename or hide but could
neither widen nor revoke access.

**Successor:** the v1.5 release phase — **Phase 26** — was created 2026-08-09 to
ship Phase 21's per-user hiding. See "Phase Details (v1.5 — Per-User Visibility)".

### Phase 25: Edit-Mode Toolbar Dark-Surface Polish
**Goal**: The edit-mode bottom toolbar reads cleanly on its dark (`#1d2327`) background and meets the accessibility bar Phase 23 held — control icons and focus states clear WCAG non-text contrast, the save-status indicator no longer shifts the layout, and renames give adequate commit feedback — spot-checked on Default + Modern + Midnight admin colour schemes.
**Depends on**: Phase 23 (builds on the shipped editor-UX toolbar)
**Requirements**: (none formal — UX/a11y polish; surfaced during Phase 20 verification 2026-08-02. Seed: [.planning/todos/pending/2026-08-01-editor-toolbar-icon-contrast.md](todos/pending/2026-08-01-editor-toolbar-icon-contrast.md))
**Success Criteria** — ⚠️ **RE-SCOPED 2026-08-09 by the 25-01 audit.** The original
five were written from a 2026-08-02 defect report; two had decayed. Measured
verdicts below; full evidence in `25-01-SUMMARY.md`.
  1. **The save-status indicator occupies a reserved slot** so it no longer displaces the rename field. *(CONFIRMED and measured: the status grows 4px → 24px and the rename field shifts 20px horizontally as a direct result. Absorbs original criterion 4 — see below.)*
  2. **The focus ring margin is widened** from `#2271b1` (3.07:1) to `#72aee6` (6.74:1) on `#1d2327`. *(A ROBUSTNESS CHOICE, not a compliance fix — the current ring PASSES the 3:1 bar. Recorded as a choice so it is not re-litigated as a defect.)*
  3. **A11y M2** — the derived-locked checkbox drops its redundant `aria-disabled`, moves the lock reason from the accessible NAME to `aria-describedby`, and makes that reason reachable in screen-reader focus mode (a natively-disabled control is skipped there today, so the reason is never heard). *(From `todos/pending/2026-08-02-a11y-locked-checkbox-refinements.md`; NOT covered by the v1.5.0 axe scanning.)*
  4. **A11y M3** — outside-click dismissal restores focus to the anchor button, matching what Escape already does (WCAG 2.4.3). *(Confirmed by reading `placePopover()`. The v1.5.0 a11y spec asserted the Escape path but never outside-click, which is why it passed.)*
  5. Existing PHP unit, integration (single-site AND multisite), JS, and Playwright e2e suites stay green; WPCS clean; PHPStan clean; Plugin Check 0 new errors; verified across Default/Modern/Midnight admin colour schemes.

**Resolved before execution — struck by the 25-01 audit, kept visible so nobody wonders whether the original report was addressed:**
  - ~~Recolour icon glyphs from `#3858e9` (~2.8:1) to `#c3c4c7`~~ — **ALREADY SATISFIED.** The glyphs measure **9.11:1**; `#3858e9` appears nowhere in `maestro.css`. v1.4.0's a11y gate found this independently and closed it as stale; this roadmap entry was simply never updated.
  - ~~Make the save-status fire on rename commit~~ — **ALREADY IMPLEMENTED.** Enter-commit produces `Saving… → Saved`. The residue (the confirmation is transient) is folded into criterion 1, since reserving the slot is most of what "feels unsaved" was describing. A persistent post-save marker remains an open design question, deliberately not smuggled in under a layout fix.

**Sequencing note**: these are **pre-existing** Phase 23 (v1.3.1) toolbar surfaces, not v1.4 regressions, so they do **not** block the Phase 24 release. Placement is the user's call — ship it *before* Phase 24 (so v1.4.0 carries the fixes and Phase 24's editor-screenshot recapture reflects them), or defer to a v1.4.1 / later follow-up. Currently appended after Phase 24; resequence with `/gsd:insert-phase` if it should precede the release.

**Resolved 2026-08-08:** the question is moot as posed — v1.4.0 shipped on
2026-08-04 without this phase, so it did not precede that release. It is now a
candidate for the (not yet created) v1.5 release, alongside the deferred a11y
M2/M3 items from `todos/pending/2026-08-02-a11y-locked-checkbox-refinements.md`.
**Plans**: 25-01 audit + re-scope ✅ COMPLETE 2026-08-09 · 25-02 implement, prove, close (pending; `autonomous: false`)


---

### Phase 27: Cloned-Role Hiding Profiles
**Goal**: An admin can name a reusable hiding profile ("Reduced view"), assign people to it, and apply it to menu items — cosmetically, with membership resolved live — completing ROLE-02
**Depends on**: Phase 21 (built the seam slot, the field-parameterized resolver, and the bounded-axis sanitize shape this extends)
**Requirements**: ROLE-02 (completion — currently PARTIAL since v1.5.0)
**Success Criteria** (what must be TRUE):
  1. A `profiles` map is the AUTHORING structure and **compiles** onto `items[slug].hidden_profiles`; nothing ever resolves the hide decision from the map itself (feasibility note §7's "one lookup, one seam, one audit point")
  2. Profile membership is intersected LIVE each request, so adding or removing a person takes effect with no re-save and a deleted profile self-heals
  3. Term 3 lands in the slot Phase 21 reserved — the seam remains ONE drop path per menu level, not a parallel resolve
  4. The cosmetic-only invariant holds for the profiles axis exactly as for roles and users, proven by extending the existing §6 guardrail rather than a new one
  5. Proven in a targeted user's OWN rendered sidebar, with a bystander outside the profile keeping every row
  6. Zero regression: both integration lanes, unit, JS, e2e, WPCS, PHPStan, Plugin Check
**Plans**: 27-01 decisions · 27-02 storage + compile · 27-03 seam + live membership · 27-04 editor · 27-05 e2e, gate, close ROLE-02

> **27-01 is a decisions checkpoint, deliberately.** The feasibility note locked
> storage and resolution in detail but left **authoring UX as "the main open
> design question for a future discuss-phase"** — where profiles get created and
> managed has no home today, since Maestro has never had a settings screen. It
> also re-verifies the note's architecture against the code Phase 21 actually
> shipped: the note cites line numbers from before v1.4.1 and Phase 21 both moved
> things, and its assumption that term 3 is a list-intersect may not survive
> contact, since membership is a property of the USER rather than the item.

### Phase 28: Configurable Admin Menu Width
**Goal**: A renamed menu item that used to wrap at WordPress's hardcoded 160px no longer has to — a global width, applied while browsing, with folding still working everywhere it should
**Depends on**: nothing (28-01 is independently shippable)
**Requirements**: (none formal — V2-09, extracted from SPEC.md item 9 during the 2026-08-09 backlog reconciliation)
**Success Criteria** (what must be TRUE):
  1. `#collapse-menu` is VISIBLY disabled during edit mode with a programmatic reason, not silently swallowed by a capture-phase handler
  2. The menu column width resolves from ONE source, not three hardcoded `160px` literals (`maestro.css` :22, :28, :523)
  3. `menu_width` is stored bounded and sparse — the default is never written, and reset means absent
  4. The width applies on ORDINARY admin pages, not only in edit mode — and a site that never set one loads nothing new and pays no new page cost
  5. `body.folded` still folds to core's 36px outside edit mode, and the `<782px` overlay is unaffected
  6. Zero regression across both integration lanes, JS, e2e, WPCS, PHPStan, Plugin Check
**Plans**: 28-01 fold honesty + de-hardcode · 28-02 storage + the always-loaded seam · 28-03 control, docs, close

> **The fold story was DECIDED 2026-08-10 and folded into this phase.** Edit mode
> keeps forcing unfold — a 36px icon rail cannot show the labels being edited, and
> `docs/archive/FIXES.md` #4 records that the editor *broke* in folded mode
> historically. What changes is the honesty: the collapse control currently
> renders, takes focus and does nothing, which is the actual defect.
>
> The "fold versus width conflict" flagged on 2026-08-09 was **mis-framed and is
> withdrawn**. It is not a design conflict — `160px` is simply hardcoded in three
> places, one of which is the constant this phase makes configurable. Outside edit
> mode width applies to the expanded menu and folding works normally; inside edit
> mode folding is off, so width just applies.
>
> **This phase turns Maestro into something that loads outside edit mode** for the
> first time (28-02). "Costs nothing unless you are editing" is true today and
> stops being — hence the measured-footprint checkpoint rather than an assumption.

## Phase Details (v1.5 — Per-User Visibility)

**Milestone goal:** ship ROLE-02's per-user cosmetic hiding to WordPress.org. The
feature is built (Phase 21, 5/5 plans, 2026-08-08) but unreleased — v1.4.0 was
cut before it landed. This milestone exists to get it to users.

- [~] **Phase 21: Cosmetic Per-User Hiding** — built under the v1.4 roadmap (details in the v1.4 section above); ships here. Per-user half complete; cloned-role profiles remain a backlog item.
- [x] **Phase 26: Release v1.5.0** — cut and shipped to WordPress.org 2026-08-09 (tag `v1.5.0` on `694b1bf`; GitHub Release + SVN `trunk`/`tags/1.5.0` verified from SVN)
- [ ] *(optional)* **Phase 22: Slug-Resolution Showcase Demo** — ships in v1.5 if it lands before the cut
- [ ] *(optional)* **Phase 25: Edit-Mode Toolbar Dark-Surface Polish** — ships in v1.5 if it lands before the cut

### Phase 26: Release v1.5.0
**Goal**: v1.5 is cut and live on WordPress.org — per-user cosmetic hiding reaches users, the runtime zip builds clean, all suites pass, the tag exists, SVN trunk is updated, and the directory screenshots show the four-group visibility popover
**Depends on**: Phase 21 (hard — it is the entire reason this milestone exists). Phases 22 and 25 are **optional inclusions**, not dependencies: if either is complete at cut time it ships, otherwise it slips to a later release without blocking this one. This mirrors the Release Binding fallback that let v1.4.0 ship without Phase 21, which worked.
**Requirements**: REL-11
**Success Criteria** (what must be TRUE):
  1. `bin/build.sh` produces a clean runtime zip and Plugin Check reports 0 errors on it (the pre-existing `readme.txt` upgrade-notice warning is acceptable, unchanged since v1.4.0)
  2. Full zero-regression gate green at the release commit: PHP unit, PHP integration, JS unit, Playwright e2e, WPCS, PHPStan, doc-links
  3. **The changelog covers every user-facing change since `v1.4.1`** — verified by diffing `v1.4.1..main`, not by trusting the phase list (the standing lesson from v1.4.0, where an overclaim was caught only at gate 8)
  4. An Upgrade Notice for 1.5.0 exists and is under Plugin Check's 300-character limit
  5. **Directory + editor screenshots reflect the shipping UI** — screenshot 3 (the visibility picker) now shows FOUR groups, not two, so it must be recaptured; the per-scheme editor surfaces are re-checked
  6. The git tag `v1.5.0` exists on a `main` commit carrying all code plus the final readme; the GitHub Release is published
  7. SVN `trunk` is updated and the `1.5.0` SVN tag is cut — **remembering the deploy is NOT automatic**: a Release created via `GITHUB_TOKEN` does not fire `release: published`, so `wp-deploy.yml` must be dispatched manually (`gh workflow run wp-deploy.yml -f tag=v1.5.0`). This has been true for every release since v1.3.0; plan the manual step in.
  8. **Code review clean** over the full `v1.4.1..main` diff
  9. **A11y sweep passed** — WCAG 2.2 AA across Default/Modern/Midnight. The new person-picker surfaces (search field, results list, chips, self-target caution) have never had an independent a11y pass; they were written to the bar but not audited against it.
  10. **Adversarial security pass clean** — with specific attention to the new user axis: the picker consumes core's `wp/v2/users` (gated by `list_users`), stored IDs are intersected against live users, and the cosmetic-only invariant must be re-confirmed to hold for the per-user path exactly as it does for roles
  11. **Performance assessment acceptable** — the per-user axis adds an id-list intersect to the hide seam and one batched `get_users()` call to the editor model; confirm both are negligible against the config-size benchmark in [docs/performance/config-size-and-page-load.md](../docs/performance/config-size-and-page-load.md)
**Known limitation to state in the release notes**: on multisite, network super
admins are exempt from the per-user axis only (role axes keep their v1.4.1
behaviour). That branch is untested — the suite runs single-site. Already
documented in `readme.txt`; the release should not quietly drop it.
**Plans**: 26-01 version + changelog · 26-02 screenshot recapture · 26-03 gates 8–11 · 26-04 tag, deploy, record (planned 2026-08-09; all four are `autonomous: false` — a release is judgement calls end to end)

---

## Progress

**Execution Order:**
v1.0 complete (Phases 1–5, archived). v1.1 complete (Phases 6–8, archived). v1.2 complete (Phases 9–12, archived 2026-06-22; Phase 10 was a non-blocking research spike not shipped in v1.2). R1 complete (Phases 13–16, archived 2026-06-29; non-versioned research). v1.3.0 complete (Phases 17–18, shipped 2026-06-30; release tag `v1.3.0`, archived). Phase 23's editor UX restyle shipped early as an interim **v1.3.1** patch (PR #88; tag `v1.3.1`, 2026-07-05).

**v1.4 complete** (Phases 19–24) — shipped 2026-08-04 as `v1.4.0`, patched 2026-08-05 as `v1.4.1`. It shipped **without** Phase 21 (deferred under the Release Binding fallback) and Phase 22 (not reached).

**v1.5 in progress** (created 2026-08-09) — Phase 21 built 2026-08-08 and awaiting verification/merge, then Phase 26 cuts the release. Phases 22 and 25 are optional inclusions that do not block the cut. Note the phase numbers are non-contiguous by design: 21, 22 and 25 were planned under the v1.4 roadmap and are not renumbered when they slip, matching how the R1 `COMPAT-xx` IDs were reused without renumbering.

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
| 19. Cosmetic Hiding Feasibility | v1.4 | 1/1 | Complete | 2026-07-05 |
| 20. Third-Party Compatibility Fixes | v1.4 | 6/6 | Complete | 2026-08-02 |
| 21. Cosmetic Per-User Hiding | built under v1.4, **ships in v1.5** | 5/5 | Per-user half complete; awaiting human verification, unmerged (PR #120). Cloned-role profiles deferred to backlog | 2026-08-08 |
| 22. Slug-Resolution Showcase Demo | v1.5 (optional inclusion) | 0/TBD | Not started | - |
| 23. Editor UX Polish | v1.4 | 5/5 | Complete (shipped as v1.3.1) | 2026-07-05 |
| 24. Release v1.4.0 | v1.4 | n/a (shipped as PR #113, not numbered plans) | Complete — v1.4.0 shipped; patch v1.4.1 2026-08-05 | 2026-08-04 |
| 25. Edit-Mode Toolbar Dark-Surface Polish | v1.5 (optional inclusion) | 0/TBD | Not started | - |
| 26. Release v1.5.0 | v1.5 | 0/TBD | Not started — created 2026-08-09; depends on Phase 21 | - |
