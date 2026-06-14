# Roadmap: Admin Menu Maestro

## Milestones

- ✅ **v1.0 WordPress.org Release Readiness** - Phases 1–5 (submitted 2026-06-14; awaiting .org review)
- 🚧 **v1.1 Polish & Accessibility** - Phases 6–8 (in progress)

## Phases

<details>
<summary>✅ v1.0 WordPress.org Release Readiness (Phases 1–5) — submitted 2026-06-14</summary>

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Security Review** - Confirm REST auth, sanitization, capability filter, and option handling cannot be exploited
- [x] **Phase 2: Accessibility Audit** - Verify keyboard operability, focus management, ARIA correctness, and announce save status
- [x] **Phase 3: Verification** - Extend automated test coverage for role visibility, reset edge cases, and icon sanitization; measure performance overhead
- [x] **Phase 4: Release Assets** - Produce all WordPress.org listing artifacts: readme, graphics, screenshots, user docs
- [x] **Phase 5: Submit** - Final Plugin Check + WPCS pass on build zip and submit to WordPress.org

### Phase 1: Security Review
**Goal**: Every known attack surface in the plugin's REST + storage layer is confirmed safe or hardened
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05
**Success Criteria** (what must be TRUE):
  1. A test or documented manual check confirms non-capable users and bad nonces are rejected by all REST routes
  2. `Config::sanitize_icon()` is confirmed non-executing for all four icon forms (data-URI, URL, dashicon, none) under adversarial input
  3. Slug, title, and role inputs are confirmed free of injection and stored-XSS paths via test or static analysis result
  4. The `amm_capability` filter is confirmed incapable of privilege escalation beyond the edit capability — documented in SPEC.md
  5. Option writes use `sanitize_*` helpers only, no unserialize of untrusted data, autoload is false — confirmed and documented
**Plans**: TBD

### Phase 2: Accessibility Audit
**Goal**: The plugin's edit mode is usable without a mouse and announces state correctly to assistive technology
**Depends on**: Phase 1
**Requirements**: A11Y-01, A11Y-02, A11Y-03, A11Y-04, A11Y-05
**Success Criteria** (what must be TRUE):
  1. All edit operations (select, rename, icon picker, visibility toggle, reset) are reachable and operable by keyboard alone — confirmed by audit
  2. Focus lands on the correct element after selecting an item, opening a panel, and opening/closing the icon picker popover
  3. Saving triggers a `wp.a11y.speak()` call (or equivalent) so a screen reader announces success or error
  4. Icon picker dialog, tabs, and grid have correct ARIA roles and labels — confirmed by audit
  5. Keyboard-accessible reordering is documented as a known limitation in readme.txt and/or SPEC.md (full fix deferred to v2)
**Plans**: TBD

### Phase 3: Verification
**Goal**: Automated tests cover per-role visibility, reset edge cases, and icon sanitization; admin-load overhead and edit-mode payload are measured and acceptable
**Depends on**: Phase 2
**Requirements**: TEST-01, TEST-02, TEST-03, PERF-01, PERF-02
**Success Criteria** (what must be TRUE):
  1. An e2e test confirms an item hidden from a role is absent for that role's user and present for admin
  2. E2e or integration tests cover reset-this-item and reset-all, including edge cases (nothing saved, partial save)
  3. Unit tests explicitly cover all four icon forms for both valid acceptance and invalid rejection in `sanitize_icon()`
  4. Admin-load overhead (option read + replay) is measured and documented as acceptable (single autoload:false read, O(menu) replay)
  5. Edit-mode localized payload size is measured and confirmed only loaded in edit mode (network tab or server-side assertion)
**Plans**: TBD

### Phase 4: Release Assets
**Goal**: All WordPress.org listing artifacts exist and are ready for SVN commit — readme, graphics, screenshots, user docs
**Depends on**: Phase 3
**Requirements**: REL-01, REL-02, REL-03, REL-04
**Success Criteria** (what must be TRUE):
  1. readme.txt has a `== Screenshots ==` section with numbered entries matching the shipped screenshot files
  2. SVN `assets/` directory contains `icon-128x128`, `icon-256x256`, `banner-772x250`, and `banner-1544x500` at correct dimensions
  3. Annotated screenshots are captured from the Playground demo and match the `== Screenshots ==` entries
  4. User-facing documentation covers: how to enter edit mode, rename, reorder, set icons, configure per-role visibility, and the cosmetic-only caveat
**Plans**: TBD

### Phase 5: Submit
**Goal**: Plugin Check and WPCS pass on the final build zip and the submission is in WordPress.org review queue
**Depends on**: Phase 4
**Requirements**: REL-05
**Success Criteria** (what must be TRUE):
  1. `bin/build.sh` produces a clean zip and `plugin-check` reports 0 errors and 0 warnings against it
  2. WPCS (`phpcs`) reports 0 errors and 0 warnings on the plugin source
  3. The plugin is submitted to WordPress.org and a confirmation (SVN commit or review ticket) is on record
**Plans**: TBD

### v1.0 Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security Review | 2/TBD | Complete | Static Codex Security scan complete; nonce integration coverage added; one low-severity DOM XSS hardening issue fixed |
| 2. Accessibility Audit | 1/TBD | Complete | Static/code audit complete; keyboard selection added; focus management and save announcements hardened; keyboard reorder gap documented for v2 |
| 3. Verification | 2/TBD | Complete | Added and ran E2E coverage for reset-this-item and per-role visibility; added integration checks for reset-all edge cases, non-autoloaded storage, edit-mode-only assets, localized payload budget, and localized editor labels; unit 44/44, integration 29/29, E2E 9/9 |
| 4. Release Assets | 4/TBD | Complete | WordPress.org icon, banner, screenshots, readme captions, and user-facing docs are complete |
| 5. Submit | 1/TBD | Complete | Release zip builds cleanly; WPCS passes; official Plugin Check 2.0.0 reports no errors on the extracted build zip; npm audit clean. **Submitted to WordPress.org — in the review queue** (approval/SVN access pending, external) |

</details>

## Milestone v1.1 — Polish & Accessibility

**Milestone Goal:** Refine the shipped editor and finish the accessibility story. No new architecture — keyboard reordering, modified-state indicators, visual polish, heavier icons, documentation link hygiene, and a repeatable banner pipeline.

- [ ] **Phase 6: Accessibility & Interaction** - Keyboard-accessible reordering + modified indicator with per-item reset affordance
- [ ] **Phase 7: Visual Polish & Icons** - Heavier bundled icon set mixed with dashicons + edit-mode UI polish
- [ ] **Phase 8: Docs & Brand Assets** - Documentation link hygiene + editable SVG banner source with repeatable generation pipeline

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
**Plans**: TBD

### Phase 7: Visual Polish & Icons
**Goal**: The bundled icon picker reads at a weight that mixes naturally with WordPress's solid dashicons, and the overall edit-mode UI is visually polished and responsive
**Depends on**: Phase 6
**Requirements**: ICON-01, UX-02
**Success Criteria** (what must be TRUE):
  1. The bundled icon set uses solid/filled variants (Bootstrap `*-fill` or Heroicons Mini fallback) that sit visually alongside dashicons without appearing noticeably lighter — confirmed by side-by-side screenshot of the two tabs
  2. Edit-mode control hierarchy, spacing, and status clarity are improved with no text-overlap or control-resize regressions — confirmed by before/after screenshots and keyboard/mouse walkthrough notes
  3. Icon picker grid is visually scannable at the dashicons grid size (20px glyphs)
  4. UI changes hold at 0 regressions: unit 44/44, integration 29/29, e2e 9/9 green, Plugin Check 0 errors
**Plans**: TBD

### Phase 8: Docs & Brand Assets
**Goal**: In-prose file references across all project docs are live markdown links, and the wp.org/GitHub banner is rebuilt from an editable SVG master with a repeatable generation pipeline
**Depends on**: Phase 7
**Requirements**: DOC-01, REL-06
**Success Criteria** (what must be TRUE):
  1. Bare file-path references in README, readme.txt, user guide, SPEC, TESTING, and planning docs are converted to markdown links — confirmed by a grep for common bare-path patterns returning no results
  2. An editable SVG master for the banner exists under `.wordpress-org/source/` with the decorative leader line before "ADMIN MENU" removed
  3. `npm run assets:banners` regenerates `banner-772x250.png` and `banner-1544x500.png` from the SVG master (Inkscape render + Pillow downscale/crop) without manual steps
  4. The public banner files under `.wordpress-org/` are replaced with the regenerated versions after visual review
**Plans**: TBD

## Progress

**Execution Order:**
v1.0 complete (Phases 1–5). v1.1 executes: 6 → 7 → 8

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Security Review | v1.0 | 2/TBD | Complete | 2026-06-14 |
| 2. Accessibility Audit | v1.0 | 1/TBD | Complete | 2026-06-14 |
| 3. Verification | v1.0 | 2/TBD | Complete | 2026-06-14 |
| 4. Release Assets | v1.0 | 4/TBD | Complete | 2026-06-14 |
| 5. Submit | v1.0 | 1/TBD | Complete | 2026-06-14 |
| 6. Accessibility & Interaction | v1.1 | 0/TBD | Not started | - |
| 7. Visual Polish & Icons | v1.1 | 0/TBD | Not started | - |
| 8. Docs & Brand Assets | v1.1 | 0/TBD | Not started | - |
