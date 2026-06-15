# Maestro

## What This Is

A WordPress plugin that makes the admin menu editable **in place** — rename
items, reorder them, swap top-level icons, and hide items per role, all on the
menu itself, toggled from the admin bar. Customizations are global and stored as
a sparse delta replayed over the menu WordPress builds each request. It is
feature-complete; this milestone is about getting it ready to publish on
WordPress.org.

## Core Value

Editing the admin menu happens directly on the menu, with zero ceremony and zero
risk to access — changes are cosmetic deltas, never a rebuilt menu, and never a
security boundary.

## Current Milestone: v1.1 — Polish & Accessibility

**Goal:** Refine the shipped editor and finish the accessibility story — no new architecture.

**Target items (promoted from the v2 backlog):**
- ICON-01 (V2-11) — solid/heavier bundled icon set that mixes with dashicons
- A11Y-06 (V2-03) — keyboard-accessible reordering (closes the v1 mouse-only gap)
- UX-01 (V2-04) — "modified" indicator + discoverable per-item reset
- UX-02 (V2-12) — UI/UX polish (hierarchy, spacing, responsive, status clarity, icon-picker scanability, onboarding)
- DOC-01 (V2-13) — documentation link hygiene
- REL-06 (V2-14) — banner rebuilt from an editable source with a repeatable pipeline

*v1.0 (WordPress.org release readiness) is complete and submitted; awaiting .org review.*

## Requirements

### Validated

<!-- Shipped and working: unit 44 / integration 29 / e2e 9 green; phpcs clean; Plugin Check reports no errors on the build zip. -->

- ✓ Click-to-select editing (whole-row drag reorder, no handles) — shipped
- ✓ Debounced single-flight autosave with status indicator — shipped
- ✓ Rename (top-level + submenu), commit on Enter / revert on Escape — shipped
- ✓ Per-role visibility (cosmetic hide; intersected against live roles) — shipped
- ✓ Top-level icons in all four native WP forms (dashicon / none / data-URI / URL) + bundled Bootstrap Icons picker — shipped
- ✓ Folded-mode neutralization (stable expanded menu while editing) — shipped
- ✓ Sparse-delta storage; reset = delete option; resilient to plugin churn — shipped
- ✓ REST `maestro/v1/config` (GET/POST/DELETE), capability-gated + nonce — shipped
- ✓ WordPress Playground demo (User Switching + role users) — shipped

### Active

<!-- This milestone: v1.1 Polish & Accessibility (see Current Milestone above). -->

- [ ] ICON-01 — solid/heavier bundled icon set that mixes with dashicons (V2-11)
- [ ] A11Y-06 — keyboard-accessible reordering (V2-03)
- [ ] UX-01 — "modified" indicator + discoverable per-item reset (V2-04)
- [ ] UX-02 — UI/UX design polish (V2-12)
- [ ] DOC-01 — documentation link hygiene (V2-13)
- [ ] REL-06 — banner source/regeneration pipeline (V2-14)

*v1.0 release readiness (security, a11y audit, verification, .org assets, submit) is complete and shipped — see the Validated list and the Submit note in Context.*

### Out of Scope

- **Real access control** — visibility is cosmetic by design; a page's own capability is the true gate. Bundling half-enforcement manufactures false security.
- **Front-end / non-admin menu editing** — admin menu only.
- **Reparenting, separators, import/export, multisite defaults, custom-icon upload** — deferred to the post-1.0 backlog (see Context → Future roadmap).

## Context

- **State:** built, tested, documented (SPEC.md = design, TESTING.md = test layers, docs/archive/FIXES.md = historical fix log). Public GitHub repo: dknauss/Maestro. WordPress plugin slug/package is `maestro-menu-editor`.
- **Codebase map:** SPEC.md serves as the architecture reference, so GSD codebase mapping was skipped. Components: `Config` (option storage + sanitize), `Ordering` (pure reorder), `Replay` (mutates `$menu`/`$submenu` on `admin_menu` PHP_INT_MAX + `menu_order`), `Rest` (REST controller), `Admin_Bar` (toggle), `Assets` (enqueue/localize, edit mode only).
- **Tooling:** wp-env (WP 7.0), Playwright e2e, PHPUnit unit+integration, WPCS via phpcs, official Plugin Check. `bin/build.sh` emits a runtime-only `maestro.zip`.
- **Security scan:** Codex Security scan `317283f_20260614T024544Z` produced validated markdown/HTML reports under `/tmp/codex-security-scans/maestro/317283f_20260614T024544Z`; it found one low-severity DOM XSS hardening issue in the editor helper and fixed it by switching `el()` from `innerHTML` to `textContent`. Follow-up nonce integration tests now close SEC-01.
- **Accessibility audit:** Static/code audit closed Phase 2. Keyboard selection now works with `Enter`/`Space`, focus moves into the shared panel, icon/visibility popovers have dialog focus handling, save success/failure is announced through the WordPress a11y API, and the v1 keyboard-reordering gap is documented for v2.
- **Verification:** Phase 3 is complete. Unit tests are 44/44, wp-env integration is 29/29 with 81 assertions, and Playwright E2E is 9/9. Coverage now includes icon sanitization, reset-all edge cases, non-autoloaded storage, edit-mode-only assets, localized payload budget, localized editor labels, reset-this-item, and per-role visibility.
- **Release assets:** Phase 4 is complete. WordPress.org icon, banner, and screenshot graphics exist under `.wordpress-org/` and are referenced from the GitHub/wp.org readmes. User-facing documentation is published in the GitHub README, WordPress.org readme, and `docs/user-guide.md`.
- **Localization:** The plugin is translation-ready with the `maestro` text domain and `Domain Path: /languages`. PHP strings use WordPress translation helpers, and JavaScript editor labels are passed through `maestroData.i18n` from PHP. The repo ships a POT template plus starter catalogs for `es_ES`, `de_DE`, `ja`, `fr_FR`, `pt_BR`, and `it_IT`; WordPress.org language packs can still override and extend them, and native-speaker/Polyglots review is welcome.
- **Submit:** Phase 5 is complete. The runtime zip builds cleanly, WPCS passes, Plugin Check 2.0.0 reports no errors on the extracted build zip, npm audit reports 0 vulnerabilities after removing unused `@wordpress/scripts`, and local unit/integration/E2E tests pass. **The plugin has been submitted to WordPress.org** and is in the review queue; approval and SVN access are pending (external, out of our hands). On approval: commit to SVN `trunk`, tag `1.0.0`, and upload `.wordpress-org/` to the SVN `assets/` dir.
- **Future roadmap (post-1.0 backlog):** reparenting (top↔sub, highlighting minefield); separator management; keyboard-accessible reordering; per-item-reset UI affordance with a "modified" indicator; custom icon upload (SVG sanitization); import/export config as JSON; optional enforcement bridge (opt-in, clearly-labelled defense-in-depth); multisite/network defaults with per-site override; configurable admin-menu width (V2-09); admin-toolbar editing feasibility research (V2-10); UI/UX design polish for edit-mode hierarchy, responsive behavior, modified-state affordances, status clarity, and icon-picker scanability (V2-12); documentation link hygiene for prose references to project files (V2-13); deterministic banner source/regeneration with the "ADMIN MENU" leader line removed (V2-14).

## Constraints

- **Compatibility:** WordPress 6.4+, PHP 7.4+ (declared + WPCS-checked); tested up to WP 7.0.
- **Distribution:** WordPress.org plugin directory guidelines — Plugin Check must stay green; readme.txt format; SVN `assets/` for icon/banner/screenshots (separate from the plugin zip).
- **Security posture:** capability-gated everywhere; nonce on writes; server-side sanitization authoritative; no privilege-escalation surface.
- **Principle:** visibility is cosmetic, not authorization.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Sparse delta, not a stored full menu | Trivial reset, resilience to plugin churn, upstream label changes show through | ✓ Good |
| Debounced autosave, no Save button | In-place ethos; Save was implicated in early "doesn't persist" reports | ✓ Good |
| Click-to-select, whole-row drag, no handles | Per-item clusters/handles were heavy and broke folded mode + hard to grab | ✓ Good |
| Unique slug, no `Update URI` header | Slug uniqueness is the .org collision protection; the header is disallowed by Plugin Check | ✓ Good |
| Strip `menu-icon-*` for custom image icons | Core's `background-image:none !important` on its own items hid data-URI/URL icons | ✓ Good |
| Visibility is cosmetic only | Authorization is a separate, mature concern; half-enforcement is the worst failure mode | ✓ Good |
| Apply GSD for release-readiness + future roadmap | Formalize the path to .org and track post-1.0 work | ✓ Good |

---
*Last updated: 2026-06-14 after v1.0.0 submission to WordPress.org (all 5 phases complete; awaiting .org review)*
