# Roadmap: Admin Menu Maestro

## Overview

The plugin is feature-complete and green. This milestone hardens it for public
distribution: confirm security posture, audit accessibility, extend automated
coverage, verify performance is not surprising, produce all WordPress.org listing
assets, and submit. Phases are review/audit/asset work — not feature-building.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Security Review** - Confirm REST auth, sanitization, capability filter, and option handling cannot be exploited
- [x] **Phase 2: Accessibility Audit** - Verify keyboard operability, focus management, ARIA correctness, and announce save status
- [x] **Phase 3: Verification** - Extend automated test coverage for role visibility, reset edge cases, and icon sanitization; measure performance overhead
- [x] **Phase 4: Release Assets** - Produce all WordPress.org listing artifacts: readme, graphics, screenshots, user docs
- [x] **Phase 5: Submit** - Final Plugin Check + WPCS pass on build zip and submit to WordPress.org

## Phase Details

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

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security Review | 2/TBD | Complete | Static Codex Security scan complete; nonce integration coverage added; one low-severity DOM XSS hardening issue fixed |
| 2. Accessibility Audit | 1/TBD | Complete | Static/code audit complete; keyboard selection added; focus management and save announcements hardened; keyboard reorder gap documented for v2 |
| 3. Verification | 2/TBD | Complete | Added and ran E2E coverage for reset-this-item and per-role visibility; added integration checks for reset-all edge cases, non-autoloaded storage, edit-mode-only assets, localized payload budget, and localized editor labels; unit 44/44, integration 29/29, E2E 9/9 |
| 4. Release Assets | 4/TBD | Complete | WordPress.org icon, banner, screenshots, readme captions, and user-facing docs are complete |
| 5. Submit | 1/TBD | Complete | Release zip builds cleanly; WPCS passes; official Plugin Check 2.0.0 reports no errors on the extracted build zip; npm audit clean. **Submitted to WordPress.org — in the review queue** (approval/SVN access pending, external) |

**Milestone status:** all five phases complete. v1.0.0 work is done and submitted;
the only remaining step is WordPress.org's review verdict (external). Run
`/gsd:complete-milestone` to archive once approved and a v1.1 scope is chosen.
