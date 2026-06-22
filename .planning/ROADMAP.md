# Roadmap: Maestro

## Milestones

- ✅ **v1.0 WordPress.org Release Readiness** — Phases 1–5 (shipped 2026-06-14; submitted to .org, awaiting review) → [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Polish & Accessibility** — Phases 6–8 (shipped 2026-06-17)
- 🚧 **v1.2 Editor UX Polish** — Phases 9–12 (Phase 9 editor polish **complete 2026-06-19** — UX-03/04/07 signed off; Phase 10 a WooCommerce-first third-party menu compatibility **research spike** from V2-16; Phase 11 editor-entry & reorder fixes — UX-08 + BUG-06/07 from the 2026-06-19 bot-review audit; Phase 11.1 P1 review hardening — HARD-01/02/03 **complete 2026-06-20** — custom_menu_order gated, config payload bounded, save-race e2e locked in, zero-regression bar held; Phase 12 release-assets refresh — REL-07/08 folded in from Phase 8). **1.2.0 cuts after Phases 9 → 11 → 11.1 → 12; Phase 10 is independent research and does not gate the release.**

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

## Phase Details (v1.2)

### Phase 9: Editor UX Polish
**Goal**: The edit-mode toolbar is immediately clear on its own purpose, efficiently compact on small and mobile screens, and every behavioral change carries its accessibility guardrail
**Depends on**: Phase 8
**Requirements**: UX-03, UX-04, UX-07
**Status: Complete (2026-06-19)** — all six plans executed; full suite green; UX-03/04/07 Complete in v1.2 traceability.
**Success Criteria** (what must be TRUE):
  1. The idle status reads "Edit Mode" *(reconciliation: the user's LOCKED refinement chose "Edit Mode" — shorter, more glanceable than the criterion's literal "Menu Edit Mode" — satisfying the intent: short, glanceable, non-colour-signalled, paired with a dashicon. Same pattern as Phase 8 / REL-06.)* Signals mode by dashicon + text label, not colour alone (WCAG 1.4.1); on first run only, an attention pulse draws the user's eye — localStorage-gated, keyboard-operable, dismissible, screen-reader-announced, dual-cleanup path (animationend + dismiss()), respects `prefers-reduced-motion` ✅
  2. The rename field shows placeholder "Menu label" that clears on focus; a visually-hidden `<label>` provides the programmatic accessible name for AT; placeholder colour #8c8f94 meets WCAG AA non-text contrast ✅
  3. At ≤782px the toolbar controls use denser padding/font (4px 8px / 12px) with min-height:44px floor (WCAG 2.5.5 AAA); confirmed by Playwright boundingBox().height ≥ 44 assertion ✅
  4. All behavioral JS changes covered by red-first node:test (modeStatusLabel, firstRunSeen, placeholderVisible) ✅
  5. Zero-regression bar holds: JS logic 53/53, PHP unit 44/44, integration 29/29 (+ new localization assertions), e2e 24/24, phpcs clean, Plugin Check 0 errors on shippable source ✅
**Plans**: 6 plans
  - [x] 09-01-PLAN.md — TDD seams: modeStatusLabel, firstRunSeen, placeholderVisible (red-first node:test) [UX-03, UX-04]
  - [x] 09-02-PLAN.md — UX-03 status split: short "Edit Mode" indicator (dashicon + text), separate transient save-status; modeLabel i18n + LocalizationTest [UX-03]
  - [x] 09-03-PLAN.md — UX-03 first-run one-shot pulse on first editable item (localStorage-gated, reduced-motion fallback, dual cleanup) [UX-03]
  - [x] 09-04-PLAN.md — UX-04 rename placeholder ("Menu label") + visually-hidden accessible label; renamePlaceholder i18n + LocalizationTest [UX-04]
  - [x] 09-05-PLAN.md — UX-07 mobile density + 44px tap-target floor at <=782px; 700px screenshot-review checkpoint approved (no restructure needed) [UX-07]
  - [x] 09-06-PLAN.md — zero-regression gate (full suite + Plugin Check) + flip UX-03/04/07 traceability to Complete [UX-03, UX-04, UX-07]

### Phase 10: Third-Party Menu Compatibility Research
**Goal**: A documented, evidence-based picture of how Maestro's sparse-delta replay behaves against the highest-install plugins that build their admin menu in non-standard ways — with a prioritized fix/limitation list, not a build commitment
**Depends on**: Phase 9
**Requirements**: V2-16
**Type**: **Research spike** — pulled forward from the v2 backlog 2026-06-19. Deliverable is a compatibility note + prioritized fix/limitation list; no production menu-handling code is committed in this phase (optional test-harness scaffolding only).
**Success Criteria** (what must be TRUE):
  1. **WooCommerce (priority #1)** plus a surveyed set (e.g. Jetpack, Yoast SEO / Rank Math, Elementor or another page builder, WPForms, and an LMS/membership plugin) are each documented: how they register or manipulate the admin menu (custom positions, conditional/late injection, re-registered menus, count/notification badges baked into title strings, custom separators, direct `$menu`/`$submenu` surgery)
  2. For each surveyed plugin, what breaks under Maestro's rename / reorder / hide / re-icon is recorded with concrete reproduction notes
  3. Each breakage is classified by fix type — slug-resolution tweak, later/again `admin_menu` hook, special-casing, or documented limitation — and prioritized
  4. A reproducible test environment is specified — e.g. a `.wp-env.json` (or equivalent) variant that loads WooCommerce and the other offenders, since the current env loads `"plugins": []` and exercises Maestro alone — delivered as a committed harness and/or a clear recommendation
  5. The research note lands in the repo (e.g. `docs/` or `.planning/`) and feeds the prioritized backlog (relates to V2-01 reparenting, V2-02 separators); no change to the zero-regression bar
**Plans**: TBD

### Phase 11: Editor Entry & Reorder Fixes
**Goal**: The editor is reachable and compact on mobile, keyboard reorder preserves separators, and the modified-state badge sits on the changed row — closing the mobile-access gap and two visual defects surfaced by the 2026-06-19 bot-review audit
**Depends on**: Phase 9
**Requirements**: UX-08, BUG-06, BUG-07
**Scaffolded 2026-06-19** from the Copilot/Codex PR-review audit + hands-on mobile use; **context + research + plans complete 2026-06-21** (UX-08 split into UX-08a mobile visibility + UX-08b compact label; fix approaches locked in CONTEXT/RESEARCH).
**Success Criteria** (what must be TRUE):
  1. The Maestro edit-mode toggle is reachable at ≤782px (mobile) — it is no longer hidden along with WP core's top-level admin-bar nodes; confirmed on a narrow viewport
  2. The toggle's visible label is compact (parity with single-word peer admin-bar toggles) while retaining a programmatic accessible name (the `meta` title / `aria-label`); icon-only forms still expose text to AT
  3. Keyboard reorder (Alt+Arrow) moves only the selected item by one position and leaves `wp-menu-separator` nodes in place — no menu distortion on a separator-bearing menu; confirmed by e2e on a menu that contains separators (BUG-06)
  4. The modified-state badge renders on the changed row (next to the label/anchor), including top-level items that have submenus, not after the submenu `<ul>` — confirmed by screenshot/e2e (BUG-07)
  5. Behavioral JS changes are red-first node:test where a logic seam exists; the full zero-regression bar holds (PHP unit, integration, e2e green; Plugin Check 0 errors; phpcs clean)
**Plans**: 4 original plans (complete 2026-06-21) + 4 gap-closure plans (UAT 2026-06-21) across 3 waves
  - [x] 11-01-PLAN.md — Wave 0: land the 3 new e2e tests (UX-08a/BUG-06/BUG-07) + AdminBarTest (integration) for UX-08b
  - [x] 11-02-PLAN.md — Wave 1: UX-08a CSS responsive override + UX-08b compact label strings (class-admin-bar.php, maestro.css)
  - [x] 11-03-PLAN.md — Wave 1: BUG-06 single-node insertBefore + BUG-07 badge-on-row (maestro.js)
  - [x] 11-04-PLAN.md — Wave 2: zero-regression full-suite gate + UX-08a mobile screenshot checkpoint

**Gap closure** (UAT 2026-06-21 found 4 real defects after ship/merge; fix plans `gap_closure: true`, run via `/gsd:execute-phase 11 --gaps-only`):
  - [ ] 11-05-PLAN.md — Wave 0 (tests-first): add UX-08a ENTER-state mobile guard (no maestro_edit) + de-cheat the keyboard-reorder e2e to drive new panel ▲/▼ controls — both RED first [UX-08a, BUG-06]
  - [ ] 11-06-PLAN.md — Wave 1: Gap 1 — enqueue the ≤782px admin-bar override unconditionally (new assets/maestro-admin-bar.css, above the is_edit_mode() early return) so the ENTER toggle is reachable on mobile [UX-08a]
  - [ ] 11-07-PLAN.md — Wave 1: Gaps 2+3+4 (coupled) — explicit ▲/▼ panel reorder buttons (OS-independent, reuse reorderMove/insertBefore) folded into ≤600px icon-only toolbar compression (aria-label + .maestro-btn-label) + modified-badge size bump 10px→15px [BUG-06, UX-08b]
  - [ ] 11-08-PLAN.md — Wave 2: zero-regression full-suite gate (sandbox-disabled) + enter-state mobile screenshot re-capture (ux-08a-enter-{782,600}.png) [UX-08a, UX-08b, BUG-06, BUG-07]

### Phase 11.1: P1 Review Hardening (INSERTED)

**Goal**: The three P1 residuals from the 2026-06-20 code-review follow-up are closed before the 1.2.0 cut — Maestro stops claiming core menu-order machinery it isn't using, the stored config payload is bounded against bloat, and the already-shipped save-race hardening is locked in by automated regression coverage
**Depends on**: Phase 11
**Requirements**: HARD-01, HARD-02, HARD-03
**Inserted 2026-06-20** from the code-review follow-up handoff ([`.planning/reviews/code-review-followup-2026-06-20.md`](reviews/code-review-followup-2026-06-20.md)). Backend/test hardening, independent of the Phase 11 editor UX work; lands inside the 9 → 11 → 11.1 → 12 cut path so it ships in 1.2.0. All code items follow strict red-first TDD per [`CLAUDE.md`](../CLAUDE.md).
**Status: Complete (2026-06-20)** — all four plans executed; full suite green; HARD-01/02/03 Complete in v1.2 traceability. Zero-regression bar held: PHP unit 61/61, JS logic 53/53, PHP integration 33/33 (85 assertions), Playwright e2e 28/28, phpcs clean, PHPStan 0 errors, Plugin Check 0 errors on shippable source.
**Success Criteria** (what must be TRUE):
  1. **HARD-01** ✅ — `custom_menu_order` is enabled only when a non-empty `top_order` is stored; with no stored top-level order, Maestro leaves the `custom_menu_order` / `menu_order` machinery untouched (passes through to other plugins). Confirmed by unit tests over the gating predicate and `reorder_top()`, plus an integration assertion that the filter is not forced `true` on an empty config.
  2. **HARD-02** ✅ — `Config::sanitize()` caps title length, item/`top_order`/`sub_order` entry counts, `hidden_roles` list length, and data-URI byte length; over-limit input is dropped or truncated deterministically rather than stored verbatim. Covered by red-first unit tests on the pure `sanitize()` path (valid input under the caps is unchanged; over-limit input is bounded).
  3. **HARD-03** ✅ — Playwright E2E covers the three save races and they resolve correctly: (a) slow REST `POST /config` + Exit waits for the in-flight/queued save; (b) pending rename + Reset All cancels the queued autosave and the DELETE wins; (c) in-flight save + Reset All waits for the save to settle before DELETE and only reloads on success. Test-only — no production behaviour change.
  4. ✅ The full zero-regression bar holds: PHP unit 61/61, PHP integration 33/33 (85 assertions), JS logic 53/53, Playwright e2e 28/28, `phpcs` clean, PHPStan 0 errors, Plugin Check 0 errors on the shippable source.
**Plans**: 4 plans
  - [x] 11.1-01-PLAN.md — HARD-01: gate `custom_menu_order` on a stored `top_order` (predicate-gated filter; red-first integration assertions) [HARD-01]
  - [x] 11.1-02-PLAN.md — HARD-02: bound `Config::sanitize()` payload (title/items/order/roles counts + data-URI bytes as named `MAX_*` constants; red-first unit) [HARD-02]
  - [x] 11.1-03-PLAN.md — HARD-03: Playwright e2e for the three save races (slow-save+Exit, pending-rename+Reset All, in-flight+Reset All); test-only [HARD-03]
  - [x] 11.1-04-PLAN.md — zero-regression gate (full suite + PHPStan + Plugin Check 0 errors) + flip HARD-01/02/03 traceability to Complete [HARD-01, HARD-02, HARD-03]

### Phase 12: Release Assets Refresh
**Goal**: The WordPress.org/GitHub banner is refreshed to the REL-07 design target and the directory screenshots are recaptured against the FINAL v1.2 editor UI, so the live listing reflects what 1.2.0 actually ships
**Depends on**: Phase 9, Phase 11
**Requirements**: REL-07, REL-08
**Folded into v1.2 2026-06-19** (previously deferred from Phase 8 / plan 08-06). **Sequenced last** so REL-08 screenshots capture the shipped Phase 9 (Edit Mode label, first-run pulse, rename placeholder) + Phase 11 (mobile entry, fixed reorder/badge) UI rather than the pre-1.2 surface. Starting point: the deferred [`08-06-PLAN.md`](08-docs-brand-assets/08-06-PLAN.md). Includes human visual review of image work.
**Success Criteria** (what must be TRUE):
  1. The banner is regenerated through the REL-06 pipeline (`npm run assets:banners`) with the REL-07 design goal met — the MAESTRO wordmark, the "THE INLINE ADMIN MENU EDITOR" subtitle, the tagline, and the gold underline rule occupy approximately the same horizontal measure (balanced widths, not the current mismatched lines); `.wordpress-org/banner-*.png` replaced only after visual review
  2. Screenshots are recaptured against the **final v1.2 editor UI** (post Phase 9 + 11), higher quality, with captions that explain the interface/workflow; the `== Screenshots ==` captions are updated to match
  3. The screenshot set is visually consistent (uniform grid or deliberately mixed — decided at plan time)
  4. Assets-only — no code regressions; the build zip and Stable tag are unaffected until the release cut
**Plans**: TBD (start from the deferred 08-06-PLAN.md)

## Progress

**Execution Order:**
v1.0 complete (Phases 1–5, archived). v1.1 complete (Phases 6–8, archived). v1.2 release path: 9 → 11 → 11.1 → 12, then cut 1.2.0. Phase 10 is an independent research spike (may run anytime, does not gate the release). Phase 11 depends on 9; Phase 11.1 (P1 hardening) depends on 11 and ships in the cut; Phase 12 (release assets) depends on 9 + 11 so screenshots reflect the final UI.

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
| 9. Editor UX Polish | v1.2 | 6/6 | Complete | 2026-06-19 |
| 10. Third-Party Menu Compatibility Research | v1.2 | 0/TBD | Not started (research spike) | - |
| 11. Editor Entry & Reorder Fixes | 7/8 | In Progress|  | - |
| 11.1. P1 Review Hardening | v1.2 | 4/4 | Complete | 2026-06-20 |
| 12. Release Assets Refresh | v1.2 | 0/TBD | Scaffolded (REL-07/08 folded in) | - |
