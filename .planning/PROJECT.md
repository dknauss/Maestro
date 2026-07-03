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

## Current Milestone: v1.4 Compatibility, Roles & Showcase

**Goal:** Broaden Maestro's real-world reach — finish the actionable third-party
compatibility fixes from R1, add cosmetic per-user/cloned-role menu hiding
(feasibility-gated, never access control), ship a Playground demo that actually
shows the v1.3.0 slug fixes working, and polish the editor surfaces shipped in
v1.2/v1.3.

**Target features (Phases 19+):**
- **DEMO-01** — Playground showcase of the v1.3.0 slug-resolution fixes (pre-seeded config whose keys differ in slug form from the rendered menu; lightweight fixture mu-plugin; optional WooCommerce opt-in blueprint)
- **COMPAT-04/07/10** — level-qualified parent-vs-submenu match keys; badge/HTML-in-title preservation on rename; optional subtree-hide cascade (from the R1 backlog)
- **ROLE-01/02** — per-user / cloned-role cosmetic menu hiding, **feasibility-gated first** and strictly cosmetic (intersected against live roles; never grants or removes capabilities)
- **UX-09/UX-12, BUG-08** — pin the Edit Mode zone to the menu-column width; refine the toolbar semantic-colour borders (discuss-and-refine); first-run banner centering; recapture editor screenshots for the shipped UX-11 coachmark

**Release binding:** versioned minor release. Target `1.4.0`, tag `v1.4.0`, SVN
deploy following the v1.2/v1.3 pipeline. ROLE-02 ships only if ROLE-01
feasibility clears the cosmetic-only bar; otherwise it defers.

## Most Recent Milestone: v1.3.0 Slug-Resolution Hardening — ✅ SHIPPED 2026-06-30

**Status:** Shipped to WordPress.org (tag `v1.3.0`, commit `884c6df`; GitHub Release + SVN trunk/`tags/1.3.0`). Milestone audit passed 4/4; archived to `milestones/v1.3.0-*`. **No active milestone** — next is `/gsd:new-milestone`.

**Goal:** Maestro overrides survive real-world plugin slugs — absolute-URL
slugs, `ver=` version params, UTM query strings, and entity-encoded `&amp;`
ampersands — so a saved config keeps applying across environments and plugin
updates instead of silently no-op'ing.

**Target features (FIX-01/02/03, seeded by COMPAT-01/02/03):**
- **FIX-01** — absolute-URL slug normalization (Jetpack Settings, Elementor
  Website Templates): strip scheme+host; strip/wildcard the `ver=` param
- **FIX-02** — external-URL slug normalization (WPForms "Upgrade to Pro"):
  match on base URL+path, ignore UTM query params
- **FIX-03** — entity-encoded `&amp;` taxonomy slugs (WooCommerce, Elementor,
  LifterLMS): `html_entity_decode()` both sides before compare

**Approach:** a single normalization seam applied to both the stored override
key and the rendered slug, replacing the exact-match `isset( $items[ $slug ] )`
lookups at `includes/class-replay.php:92` (top-level) and `:128` (submenu).
Resolve-time, non-destructive (stored configs untouched). TDD-driven —
`normalize()` is pure, with the six R1 survey fixtures as the test corpus, plus
a collision-guard test so distinct slugs never collapse.

**Release binding:** versioned minor release. Target `1.3.0`, tag `v1.3.0`, SVN
deploy following the v1.2 pipeline.

## Previous Milestone (R1)

**R1 — Third-Party Compatibility Research** finished 2026-06-29 (non-versioned
research; audit passed 11/11). It produced the `COMPAT-xx` backlog this
milestone draws from; FIX-01/02/03 cite COMPAT-01/02/03 without renumbering.

**R1 outcome (research only — no plugin code, no release tag, no SVN deploy):**
Characterized how Maestro's sparse-delta replay behaves against the six
highest-impact admin-menu-manipulating plugins. Headline finding: **0 broken
cells** across all six plugins × four Maestro operations — worst case is
cosmetic "degraded". Deliverables (committed under `.planning/compat/` +
`tests/compat/`): reproducible six-plugin wp-env harness, classification schema,
six per-plugin surveys, consolidated compatibility note, and a ranked
forward-ID'd fix/limitation backlog (42 issues → 13 COMPAT-xx items).

## Shipped (v1.0 / v1.1 / v1.2) + Research (R1)

**1.2.0** shipped to WordPress.org on 2026-06-22 (tag `v1.2.0`). All three plugin
milestones (v1.0, v1.1, v1.2) are shipped and archived. **R1** (research,
non-versioned) completed 2026-06-29 and is archived. See `.planning/MILESTONES.md`
and `.planning/milestones/` for records.

## Requirements

### Validated

<!-- Shipped and confirmed across v1.0, v1.1, and v1.2. -->

- ✓ Click-to-select editing (whole-row drag reorder, no handles) — shipped
- ✓ Debounced single-flight autosave with status indicator — shipped
- ✓ Rename (top-level + submenu), commit on Enter / revert on Escape — shipped
- ✓ Per-role visibility (cosmetic hide; intersected against live roles) — shipped
- ✓ Top-level icons in all four native WP forms (dashicon / none / data-URI / URL) + bundled Bootstrap Icons picker — shipped
- ✓ Folded-mode neutralization (stable expanded menu while editing) — shipped
- ✓ Sparse-delta storage; reset = delete option; resilient to plugin churn — shipped
- ✓ REST `maestro/v1/config` (GET/POST/DELETE), capability-gated + nonce — shipped
- ✓ WordPress Playground demo (User Switching + role users) — shipped
- ✓ ICON-01 — solid/heavier bundled icon set that mixes with dashicons — v1.1
- ✓ A11Y-06 — keyboard-accessible reordering — v1.1
- ✓ UX-01 — “modified” indicator + discoverable per-item reset — v1.1
- ✓ UX-02 — UI/UX design polish — v1.1
- ✓ DOC-01 — documentation link hygiene — v1.1
- ✓ REL-06 — banner source/regeneration pipeline — v1.1
- ✓ UX-03 — persistent “Edit Mode” indicator + first-run one-shot pulse — v1.2
- ✓ UX-04 — rename placeholder (“Menu label”) + visually-hidden accessible label — v1.2
- ✓ UX-07 — mobile-density controls (denser padding, 44px tap-target floor at ≤782px) — v1.2
- ✓ UX-08 — admin-bar “Edit Menu” toggle reachable at ≤782px (mobile) — v1.2
- ✓ UX-10 — icon-only unified toolbar with semantic colour; ▲/▼ move controls; fully accessible — v1.2
- ✓ BUG-06 — keyboard/▲▼ reorder leaves `wp-menu-separator` nodes in place — v1.2
- ✓ BUG-07 — modified-state badge renders on the changed row, not after the submenu `<ul>` — v1.2
- ✓ HARD-01 — `custom_menu_order` engaged only when `top_order` is non-empty — v1.2
- ✓ HARD-02 — `Config::sanitize()` payload bounded (title length, item/order/role counts, data-URI bytes) — v1.2
- ✓ HARD-03 — race-safe save/reset/exit confirmed by Playwright e2e — v1.2
- ✓ REL-07 — banner refreshed (balanced widths, REL-06 pipeline) — v1.2
- ✓ REL-08 — 6 recaptured directory screenshots against the final v1.2 UI — v1.2
- ✓ HARN-01/HARN-02 — reproducible six-plugin wp-env compat harness + admin/lower-privilege users — R1 (research)
- ✓ SCHM-01 — classification schema + safe/degraded/broken matrix template — R1 (research)
- ✓ SURV-01..06 — six per-plugin admin-menu manipulation surveys (Rank Math deferred) — R1 (research)
- ✓ DELV-01 — consolidated compatibility note (6×4 matrix, 0 broken cells) — R1 (research)
- ✓ DELV-02 — ranked COMPAT-xx fix/limitation backlog (42 issues → 13 items) — R1 (research)
- ✓ FIX-01 — absolute-URL slug normalization (host + `ver=` stripping) — v1.3.0 (seeds COMPAT-01)
- ✓ FIX-02 — external-URL slug normalization (ignore UTM params) — v1.3.0 (seeds COMPAT-02)
- ✓ FIX-03 — entity-encoded `&amp;` taxonomy slug normalization — v1.3.0 (seeds COMPAT-03)
- ✓ REL-09 — v1.3.0 cut and shipped to WordPress.org (tag + GitHub Release + SVN deploy) — v1.3.0

### Active (v1.4 — Compatibility, Roles & Showcase)

<!-- Current scope. Full detail + REQ-IDs in REQUIREMENTS.md. -->

- [ ] **DEMO-01** — Playground demo that demonstrates the v1.3.0 slug-resolution fixes
- [ ] **COMPAT-04** — level-qualified (parent vs submenu) match keys
- [ ] **COMPAT-07** — preserve badge / HTML-in-title on rename
- [ ] **COMPAT-10** — optional subtree-hide cascade (off by default)
- [ ] **ROLE-01** — feasibility note: can per-user/cloned-role hiding stay cosmetic? (gates ROLE-02)
- [ ] **ROLE-02** — cosmetic per-user / cloned-role menu hiding (intersected against live roles)
- [ ] **UX-09** — pin the toolbar "Edit Mode" zone to the admin-menu column width
- [ ] **UX-12** — refine the toolbar semantic-colour borders (discuss-and-refine)
- [ ] **BUG-08** — first-run banner text/button vertical centering
- [ ] **REL-10** — v1.4 cut and shipped to WordPress.org; editor screenshots recaptured for the UX-11 coachmark

### Backlog (carry-forward to next milestone)

- [ ] UX-09 — pin the toolbar “Edit Mode” zone to the admin-menu column width (distinct from shipped UX-10)
- [ ] BUG-08 — first-run banner text/button vertical centering (low cosmetic)
- [ ] V2-15 — role cloning / per-user menu hiding
- [✓] V2-16 — WooCommerce-first third-party menu compatibility — **delivered by milestone R1** (research; full 6-plugin survey → COMPAT-xx backlog). Forward production fixes now tracked as FIX-xx (COMPAT-01/02/03 highest priority).
- [ ] V2-17 — single-site privileged editor tier (edges toward the Out-of-Scope “page locking” line; enforced tier likely belongs in wp-sudo or a documented bridge)
- [ ] UX-12 — revisit the toolbar icons' semantic-colour borders (red / amber / green — from UX-10: green editing/saved, amber unsaved, red Reset All). Maintainer is unsure about the coloured outlines; discuss and refine (intensity / outline vs another signal / accessibility of the colour mapping). Discuss-and-refine, not a confirmed change. Raised 2026-06-30 while reviewing the v1.3.0 editor; ships as-is in 1.3.0.
- [✓] UX-11 — first-run guided tour, replacing the one-shot pulse — **delivered in v1.3.0**. Hand-rolled, accessible **coachmark**: a 5-step anchored walkthrough (click-to-edit → controls panel → reorder → autosave/reset → exit), first-run gated (localStorage) AND replayable via a persistent toolbar “?” control. role=dialog, ESC / skip / back / next, focus-trapped, `wp.a11y.speak` announcements, reduced-motion-safe (no animation). No tour library. Removed the old pulse/cue (and [[BUG-09]] reduced-motion-pulse fix is moot now the pulse is gone). Follow-up: recapture the editor screenshots to show the new toolbar “?” button.
- [ ] DEMO-01 — slug-resolution showcase demo: a Playground demo that actually demonstrates FIX-01/02/03, not just a busier menu. Needs a **pre-seeded `maestro_config`** whose override keys are in one slug form (e.g. `&amp;`-encoded taxonomy, `ver=`-stamped, absolute-URL) while the menu renders another, so the user sees the override still land. Prefer a lightweight demo-only **fixture mu-plugin** (registers items with the R1 survey slug shapes; deterministic, near-zero Playground boot cost) over heavy real plugins. Optional secondary **“Try it with WooCommerce”** opt-in blueprint (wizard suppressed, version pinned) for name recognition; skip Elementor in the live demo (heaviest, onboarding-noisy, CSS-hides 2 of 3 menus per SURV-04). Out of v1.3.0 scope.

### Out of Scope

- **Real access control** — visibility is cosmetic by design; a page’s own capability is the true gate. Bundling half-enforcement manufactures false security.
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
- **Future roadmap (post-1.0 backlog):** reparenting (top↔sub, highlighting minefield); separator management; keyboard-accessible reordering; per-item-reset UI affordance with a "modified" indicator; custom icon upload (SVG sanitization); import/export config as JSON; optional enforcement bridge (opt-in, clearly-labelled defense-in-depth); multisite/network defaults with per-site override; configurable admin-menu width (V2-09); admin-toolbar editing feasibility research (V2-10); UI/UX design polish for edit-mode hierarchy, responsive behavior, modified-state affordances, status clarity, and icon-picker scanability (V2-12); documentation link hygiene for prose references to project files (V2-13); deterministic banner source/regeneration with the "ADMIN MENU" leader line removed (V2-14); role cloning / per-user cosmetic hiding (V2-15); third-party menu compatibility research, WooCommerce-first (V2-16 — pulled forward to v1.2 Phase 10, 2026-06-19); and a single-site "super-admin equivalent" / privileged editor tier research item (V2-17, 2026-06-19) — note it edges toward the Out-of-Scope "page locking" line, so an *enforced* tier likely belongs in the sibling **wp-sudo** project or a documented bridge, not Maestro core.

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
| Icon-only unified toolbar with semantic colour (UX-10) | Grew from interactive design iteration; cleaner than per-zone colour; eliminates click-to-toggle ambiguity on status indicators | ✓ Good |
| Reverted Phase 11 `flex-end` workaround to `align-items:center` after Phase 11.2 | Icon-only toolbar made the panel compact enough that the race(b) click-shift was no longer possible | ✓ Good |
| Phase 11.2 recorded as a retroactive record-only phase | Toolbar redesign was built via live iteration outside the standard plan/execute flow; a decimal phase with 11.2-SUMMARY.md captured the work without forcing it into an incorrect post-hoc plan | ✓ Good |
| Screenshot capture runs on an alternate wp-env tests port (8899) | Avoids port collision when the main wp-env instance (8888/8889) is already running; env var `WP_ENV_TESTS_PORT` makes the override explicit | ✓ Good |
| R1 as a non-versioned research milestone (no tag, no SVN) | Compatibility research ships no plugin code; keeping `vX.Y` reserved for releases prevents version drift | ✓ Good |
| SCHEMA.md pristine through Phase 13, finalized after Phase 14 | Surveys copy the template; stress-testing it against the hardest case (WooCommerce) before the other five locked the format so synthesis was mechanical | ✓ Good |
| Source survey governs over pre-extraction on classification disputes (Phase 16) | Avoids synthesis introducing classifications the underlying evidence doesn't support (LifterLMS rename = safe) | ✓ Good |
| Forward COMPAT-xx IDs with a no-renumber stability contract | Lets a later versioned milestone cite backlog items by number without churn | ✓ Good |

---
*Last updated: 2026-07-03 — milestone v1.4 (Compatibility, Roles & Showcase) started*
