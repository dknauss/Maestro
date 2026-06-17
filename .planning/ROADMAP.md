# Roadmap: Maestro

## Milestones

- ✅ **v1.0 WordPress.org Release Readiness** — Phases 1–5 (shipped 2026-06-14; submitted to .org, awaiting review) → [archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Polish & Accessibility** — Phases 6–8 (in progress)

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

### 🚧 v1.1 Polish & Accessibility (In Progress)

**Milestone Goal:** Refine the shipped editor and finish the accessibility story. No new architecture — keyboard reordering, modified-state indicators, visual polish, heavier icons, documentation link hygiene, and a repeatable banner pipeline.

- [x] **Phase 6: Accessibility & Interaction** — Keyboard-accessible reordering + modified indicator with per-item reset affordance (completed 2026-06-16)
- [ ] **Phase 7: Visual Polish & Icons** — Heavier bundled icon set mixed with dashicons + edit-mode UI polish
- [ ] **Phase 8: Docs & Brand Assets** — Documentation link hygiene (test-first checker) + verify/reconcile the shipped banner pipeline

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
  - [ ] 06-01-PLAN.md — TDD seam (node:test) + pure reorderMove/diffItem/resetItem helpers [A11Y-06, UX-01]
  - [ ] 06-02-PLAN.md — Alt+Arrow keyboard reorder + wp.a11y.speak() move announcements + e2e [A11Y-06]
  - [ ] 06-03-PLAN.md — modified indicator (non-color, AA) + discoverable per-item reset + docs + e2e [UX-01]

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
  - [ ] 07-01-PLAN.md — TDD fill-resolution policy + regenerate solid icon bundle [ICON-01]
  - [ ] 07-02-PLAN.md — edit-mode polish: toolbar hierarchy, non-color status, ~20px grid, first-run cue [UX-02]
  - [ ] 07-03-PLAN.md — e2e regression + side-by-side/before-after screenshots + walkthrough notes [UX-02, ICON-01]
  - [ ] 07-04-PLAN.md — edit-mode defect fixes: BUG-01 (drop ✓ from i18n string), BUG-02 (move breadcrumb right of input so it can't shift + relabel "Title"), BUG-03 (toolbar wrap/stack at narrow widths), BUG-04+BUG-05 (replace emoji status glyphs ○⏳✓⚠ with dashicons; idle dot de-emphasised) + regression screenshots at narrow viewport [BUG-01, BUG-02, BUG-03, BUG-04, BUG-05, UX-02]

### Phase 8: Docs & Brand Assets
**Goal**: In-prose file references are live markdown links; the wp.org/GitHub banner is rebuilt from an editable SVG master with a repeatable pipeline; and the live directory listing is polished for the next release (readme copy, Playground demo link, refreshed banner + screenshots)
**Depends on**: Phase 7
**Requirements**: DOC-01, REL-06, DOC-02, DOC-03, REL-07, REL-08
**Listing polish added 2026-06-17** after the 1.0.0 page went live (see REQUIREMENTS.md → Docs & Assets). DOC-03 (Playground demo link) is a quick win and may ship as a standalone 1.0.1.
**Success Criteria** (what must be TRUE):
  1. Bare file-path references in README, readme.txt, user guide, SPEC, TESTING, and planning docs are converted to markdown links — confirmed by a grep for common bare-path patterns returning no results
  2. An editable SVG master for the banner exists under `.wordpress-org/source/` with the decorative leader line before "ADMIN MENU" removed
  3. `npm run assets:banners` regenerates `banner-772x250.png` and `banner-1544x500.png` from the SVG master (Inkscape render + Pillow downscale/crop) without manual steps
  4. The public banner files under `.wordpress-org/` are replaced with the regenerated versions after visual review
**Plans**: 4 plans
  - [ ] 08-01-PLAN.md — TDD doc-link checker (RED: enumerate inline-code refs resolving to real repo files, not yet links) [DOC-01]
  - [ ] 08-02-PLAN.md — convert flagged refs to markdown links + fix 3 stale paths (GREEN: 0 offenders) [DOC-01]
  - [ ] 08-03-PLAN.md — verify `npm run assets:banners` regen + reconcile REL-06 mechanism wording (in-code SVG master + Inkscape + Pillow) [REL-06]
  - [ ] 08-04-PLAN.md — zero-regression suite + flip DOC-01 Complete + mark Phase 8 done [DOC-01, REL-06]
  - [ ] 08-05-PLAN.md — readme.txt copy rewrite (wp-readme-optimizer) + Playground "Try it first" demo link in readme + GitHub README [DOC-02, DOC-03]
  - [ ] 08-06-PLAN.md — refreshed banner graphic (REL-06 pipeline) + gallery-optimized screenshots & captions; replace public assets after visual review [REL-07, REL-08]

## Progress

**Execution Order:**
v1.0 complete (Phases 1–5, archived). v1.1 executes: 6 → 7 → 8

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Security Review | v1.0 | ✓ | Complete (archived) | 2026-06-14 |
| 2. Accessibility Audit | v1.0 | ✓ | Complete (archived) | 2026-06-14 |
| 3. Verification | v1.0 | ✓ | Complete (archived) | 2026-06-14 |
| 4. Release Assets | v1.0 | ✓ | Complete (archived) | 2026-06-14 |
| 5. Submit | v1.0 | ✓ | Complete (archived) | 2026-06-14 |
| 6. Accessibility & Interaction | 3/3 | Complete    | 2026-06-16 | - |
| 7. Visual Polish & Icons | 2/4 | In Progress (UX-02 reopened — BUG-01..04) |  | - |
| 8. Docs & Brand Assets | v1.1 | 0/TBD | Not started | - |
