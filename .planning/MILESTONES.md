# Milestones: Maestro

## v1.3.0 Slug-Resolution Hardening (Shipped: 2026-06-30)

**Phases completed:** 2 phases (17–18), 6 plans. **Release tag:** `v1.3.0` (commit `884c6df`) · GitHub Release + WordPress.org SVN `trunk`/`tags/1.3.0`.

**Delivered:** Maestro's saved overrides now survive real-world slug variation, so a stored config keeps applying without a manual re-save. The payload is a single resolve-time normalization seam (FIX-01/02/03) drawn from the R1 compatibility research.

**Key accomplishments:**
- Pure `Maestro\Slug::normalize()` (TDD, six R1 survey fixtures + 4-case collision guard) — host-move survival via `/wp-admin/` boundary detection, `ver=`/UTM query stripping, and `html_entity_decode()` of `&amp;` taxonomy slugs (FIX-01/02/03)
- Wired normalization into Replay's two `items[]` seams and the `Ordering::submenu` reorder seam, non-destructively (stored configs never rewritten), with a dual-axis collision fail-safe
- Zero-regression gate held: 88/88 unit green, integration + Playwright e2e green, WPCS clean, Plugin Check 0 errors
- Cut and shipped v1.3.0 end-to-end on the v1.2 pipeline (tag → GitHub Release + zip → SVN deploy)
- Milestone audit passed 4/4 (see [v1.3.0-MILESTONE-AUDIT.md](milestones/v1.3.0-MILESTONE-AUDIT.md))

---

A historical record of shipped versions. Full details for each milestone live in
`.planning/milestones/v[X.Y]-ROADMAP.md` and `…-REQUIREMENTS.md`.

---

## R1 — Third-Party Compatibility Research

**Status:** ✅ Complete 2026-06-29 (non-versioned research milestone — **no release tag, no SVN deploy**)
**Phases:** 13–16 (4 phases, 12 plans)
**Tag:** none (research only; `vX.Y` numbering stays reserved for shipped plugin releases)

**Delivered:** Characterized how Maestro's sparse-delta replay behaves against the six highest-impact admin-menu-manipulating plugins, end to end — a committed reproducible six-plugin wp-env harness, a shared classification schema, six per-plugin surveys, a consolidated compatibility note, and a ranked forward-ID'd fix/limitation backlog. The R1 boundary held: every fix is classified and ranked but none implemented.

**Key accomplishments:**
1. **Reproducible six-plugin harness (HARN-01/02)** — `tests/compat/` wp-env loads WooCommerce, Jetpack, Yoast SEO, Elementor, WPForms, and LifterLMS at pinned versions plus Maestro, with admin + `compat_editor` + `compat_shop_manager` users; `npm run compat:start`.
2. **Classification schema (SCHM-01)** — `SCHEMA.md`: six manipulation dimensions + a rename/reorder/hide/re-icon × safe/degraded/broken matrix, committed before any survey and finalized after WooCommerce stress-tested it.
3. **Six per-plugin surveys (SURV-01..06)** — each filling the identical schema; Rank Math scoped out of SURV-03.
4. **Consolidated compatibility note (DELV-01)** — `COMPATIBILITY-NOTE.md`: all six findings under one schema, fully-populated 6×4 matrix. **Headline: 0 broken cells; worst case cosmetic "degraded".**
5. **Prioritized COMPAT-xx backlog (DELV-02)** — `BACKLOG.md`: 42 survey issues → 13 ranked forward-ID'd items (COMPAT-01..03 actionable slug-resolution tweaks; rest documented limitations), 0 orphans, ID-stability contract; REQUIREMENTS.md FIX-xx seed link.

**Audit:** [R1-MILESTONE-AUDIT.md](milestones/R1-MILESTONE-AUDIT.md) — passed, 11/11 requirements satisfied.

**Forward work:** The COMPAT-01..13 backlog seeds FIX-xx in a later versioned milestone. COMPAT-01/02/03 (slug-resolution) are the highest-priority candidates.

**Archives:** [R1-ROADMAP.md](milestones/R1-ROADMAP.md) · [R1-REQUIREMENTS.md](milestones/R1-REQUIREMENTS.md)

---

## v1.2 — Editor UX Polish

**Status:** ✅ Shipped 2026-06-22
**Phases:** 9, 10 (research spike), 11, 11.1, 11.2, 12
**Tag:** `v1.2.0`

**Delivered:** Redesigned the edit-mode surface from the ground up for clarity, compactness, and mobile reach — unified icon-only toolbar with semantic colour, mobile-reachable editor entry, a first-run onboarding pulse, separator-safe keyboard/button reorder, internal hardening against config bloat and save races, and a refreshed WordPress.org listing to match the new UI.

**Key accomplishments:**
1. **Redesigned icon-only unified edit-mode toolbar** — one outlined gray-button system with semantic colour (green editing/saved, amber unsaved, red reset-all), flat non-clickable status indicators, ▲/▼ move controls; fully accessible (aria-label + title + aria-live; ≥44px tap targets). (UX-10, Phase 11.2)
2. **Mobile-reachable editing** — the admin-bar "Edit Menu" entry toggle stays visible at ≤782px (was hidden), touch-sized controls. (UX-08, UX-07, Phase 11)
3. **Editor UX polish** — persistent "Edit Mode" indicator + first-run attention pulse, rename placeholder, auto-clearing "Saved" state. (UX-03, UX-04, Phase 9)
4. **Separator-safe reorder + badge fix** — keyboard/▲▼ reorder leaves menu separators in place; modified badge renders on the changed row. (BUG-06, BUG-07, Phase 11)
5. **Internal hardening** — `custom_menu_order` engaged only when items are reordered, bounded config payload, race-safe save/reset/exit with e2e coverage. (HARD-01/02/03, Phase 11.1)
6. **Refreshed wp.org listing** — balanced banner + 6 recaptured directory screenshots against the new UI. (REL-07, REL-08, Phase 12)

**Archives:** [v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md) · [v1.2-REQUIREMENTS.md](milestones/v1.2-REQUIREMENTS.md)

---

## v1.0 — WordPress.org Release Readiness

**Status:** ✅ Shipped 2026-06-14 (submitted to WordPress.org; awaiting .org review)
**Phases:** 1–5 (5 phases, 10 plans, 20 requirements)
**Tag:** `v1.0.0` (+ GitHub Release "Admin Menu Maestro 1.0.0", anchored at `c5f31b8`)

**Delivered:** Took a feature-complete inline admin-menu editor from green-at-intake to a
responsibly publishable WordPress.org plugin — security-confirmed, accessibility-audited,
test-covered, with full .org listing assets, and submitted to the review queue.

**Key accomplishments:**
1. **Security confirmed & hardened** — Codex scan; one low-severity editor DOM XSS fixed (`innerHTML` → `textContent`); REST nonce gate verified by integration tests, not just asserted.
2. **Accessibility audit closed (A11Y-01–05)** — keyboard selection (`Enter`/`Space`), popover focus restoration, and `wp.a11y.speak()` save announcements; v1 keyboard-reorder gap documented.
3. **Test coverage extended** — unit 44/44, integration 29/29 (81 assertions), Playwright E2E 9/9, including per-role visibility, reset edge cases, icon sanitization, and performance contracts.
4. **WordPress.org listing assets produced** — icon, banners, screenshots under `.wordpress-org/`; matching readme.txt captions; `docs/user-guide.md` walkthrough; translation-ready with POT + 6 starter catalogs.
5. **Submitted** — clean `bin/build.sh` zip, WPCS 7/7, Plugin Check 2.0.0 no errors, `npm audit` 0 vulnerabilities; submitted to WordPress.org review queue.

**External follow-up (pending):** On .org approval — SVN commit to `trunk`, tag `1.0.0`, upload `.wordpress-org/` to SVN `assets/`.

**Archives:** [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) · [v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)

---

## v1.1 — Polish & Accessibility

**Status:** ✅ Shipped 2026-06-17
**Phases:** 6–8
**Release line:** `1.1.x`
**Latest shipped tag:** `v1.1.1`

**Delivered:** Polish and accessibility improvements on top of the v1.0 WordPress.org release: keyboard reordering, modified indicators, per-item reset affordances, solid bundled icons, edit-mode visual polish, documentation/listing updates, and the v1.1.1 compact-control refinements.

**Archives:** v1.1 lives in the active roadmap history for Phases 6–8; v1.0 remains archived under `.planning/milestones/`.

