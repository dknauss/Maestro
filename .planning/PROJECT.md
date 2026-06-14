# Admin Menu Maestro

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

## Requirements

### Validated

<!-- Shipped and working: unit 44 / integration 23 / e2e 7 green; phpcs clean; Plugin Check 0/0 on the build zip. -->

- ✓ Click-to-select editing (whole-row drag reorder, no handles) — shipped
- ✓ Debounced single-flight autosave with status indicator — shipped
- ✓ Rename (top-level + submenu), commit on Enter / revert on Escape — shipped
- ✓ Per-role visibility (cosmetic hide; intersected against live roles) — shipped
- ✓ Top-level icons in all four native WP forms (dashicon / none / data-URI / URL) + bundled Bootstrap Icons picker — shipped
- ✓ Folded-mode neutralization (stable expanded menu while editing) — shipped
- ✓ Sparse-delta storage; reset = delete option; resilient to plugin churn — shipped
- ✓ REST `admin-menu-maestro/v1/config` (GET/POST/DELETE), capability-gated + nonce — shipped
- ✓ WordPress Playground demo (User Switching + role users) — shipped

### Active

<!-- This milestone: v1.0 WordPress.org release readiness. -->

- [x] Security review (REST auth, `sanitize_icon` data-URI/URL surface, slug handling, capability filter, option writes)
- [x] Accessibility review/audit (keyboard operability, focus management, save announcements)
- [x] Extended automated tests (per-role visibility e2e, reset/edge cases)
- [x] Performance sanity check (admin-load overhead, edit-mode payload)
- [x] WordPress.org assets (readme screenshots, icon/banner graphics, screenshots, user docs)
- [ ] Submit to WordPress.org

### Out of Scope

- **Real access control** — visibility is cosmetic by design; a page's own capability is the true gate. Bundling half-enforcement manufactures false security.
- **Front-end / non-admin menu editing** — admin menu only.
- **Reparenting, separators, import/export, multisite defaults, custom-icon upload** — deferred to the post-1.0 backlog (see Context → Future roadmap).

## Context

- **State:** built, tested, documented (SPEC.md = design, FIXES.md = history, TESTING.md = test layers). Public repo: dknauss/admin-menu-maestro.
- **Codebase map:** SPEC.md serves as the architecture reference, so GSD codebase mapping was skipped. Components: `Config` (option storage + sanitize), `Ordering` (pure reorder), `Replay` (mutates `$menu`/`$submenu` on `admin_menu` PHP_INT_MAX + `menu_order`), `Rest` (REST controller), `Admin_Bar` (toggle), `Assets` (enqueue/localize, edit mode only).
- **Tooling:** wp-env (WP 7.0), Playwright e2e, PHPUnit unit+integration, WPCS via phpcs, official Plugin Check. `bin/build.sh` emits a runtime-only `admin-menu-maestro.zip`.
- **Security scan:** Codex Security scan `317283f_20260614T024544Z` produced validated markdown/HTML reports under `/tmp/codex-security-scans/admin-menu-maestro/317283f_20260614T024544Z`; it found one low-severity DOM XSS hardening issue in the editor helper and fixed it by switching `el()` from `innerHTML` to `textContent`. Follow-up nonce integration tests now close SEC-01.
- **Accessibility audit:** Static/code audit closed Phase 2. Keyboard selection now works with `Enter`/`Space`, focus moves into the shared panel, icon/visibility popovers have dialog focus handling, save success/failure is announced through the WordPress a11y API, and the v1 keyboard-reordering gap is documented for v2.
- **Verification:** Phase 3 is complete. Unit tests are 44/44, wp-env integration is 27/27 with 61 assertions, and Playwright E2E is 9/9. Coverage now includes icon sanitization, reset-all edge cases, non-autoloaded storage, edit-mode-only assets, localized payload budget, reset-this-item, and per-role visibility.
- **Release assets:** Phase 4 is complete. WordPress.org icon, banner, and screenshot graphics exist under `.wordpress-org/` and are referenced from the GitHub/wp.org readmes. User-facing documentation is published in the GitHub README, WordPress.org readme, and `docs/user-guide.md`.
- **Submit prep:** Phase 5 is in progress. The runtime zip builds cleanly, WPCS passes, Plugin Check 2.0.0 reports no errors on the extracted build zip, npm audit reports 0 vulnerabilities after removing unused `@wordpress/scripts`, and local unit/integration/E2E tests pass. Final WordPress.org submission remains.
- **Future roadmap (post-1.0 backlog):** reparenting (top↔sub, highlighting minefield); separator management; keyboard-accessible reordering; per-item-reset UI affordance with a "modified" indicator; custom icon upload (SVG sanitization); import/export config as JSON; optional enforcement bridge (opt-in, clearly-labelled defense-in-depth); multisite/network defaults with per-site override; configurable admin-menu width (V2-09); admin-toolbar editing feasibility research (V2-10).

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
| Apply GSD for release-readiness + future roadmap | Formalize the path to .org and track post-1.0 work | — Pending |

---
*Last updated: 2026-06-14 during Phase 5 Submit prep*
