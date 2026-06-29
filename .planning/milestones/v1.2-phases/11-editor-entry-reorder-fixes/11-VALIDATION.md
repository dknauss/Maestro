---
phase: 11
slug: editor-entry-reorder-fixes
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-21
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | PHPUnit (PHP unit + integration), Playwright (e2e), node:test (JS logic) |
| **Config file** | `phpunit.xml.dist` (unit), `phpunit-integration.xml.dist` (integration), `playwright.config.ts` (e2e) |
| **Quick run command** | `npm run test:js` (fast, no Docker) |
| **Full suite command** | `npm run test:js && npm run test:php && npm run test:e2e` |
| **Estimated runtime** | JS ~seconds; full suite (Docker e2e) several minutes — run sandbox-disabled |

**Baseline (Phase 11.1):** PHP unit 61/61 · JS 53/53 · integration 33/33 · e2e 28/28.

---

## Sampling Rate

- **After every task commit:** Run `npm run test:js` — catches JS logic regressions immediately (BUG-06/BUG-07 DOM glue, no Docker needed).
- **After every plan wave:** Run the full Playwright suite (`npm run test:e2e`, sandbox-disabled for Docker) plus `npm run test:php`.
- **Before `/gsd:verify-work`:** Full suite green — JS ≥53/53, PHP unit ≥61/61, integration ≥33/33, e2e ≥28/28 *plus the new Phase 11 tests*.
- **Max feedback latency:** ~seconds for the JS quick run; full e2e at wave boundaries.

---

## Per-Task Verification Map

> Task IDs are provisional — the planner finalizes them. Mapping is by requirement and test type.

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| UX-08b | PHP label strings changed ("Edit Menu" / "Exit") | unit (PHP) | `phpunit tests/unit/AdminBarTest.php` | ⚠️ verify at plan time | ⬜ pending |
| UX-08b | i18n: no new JS keys → LocalizationTest unchanged | integration | `phpunit tests/integration/LocalizationTest.php` | ✅ | ⬜ pending |
| UX-08a | Toggle visible at ≤782px | e2e | `editor.spec.ts` — `setViewportSize({width:782})` + `toBeVisible()` | ❌ W0 | ⬜ pending |
| UX-08a | Icon-only (label text hidden) at ≤782px | e2e + scripted capture | Playwright `boundingBox` assertion (11-01/11-02 e2e) + deterministic `npm run screenshots` capture at 782/600px (11-04, MAESTRO_CAPTURE-gated) | ❌ W0 | ⬜ pending |
| BUG-06 | Single-node move leaves separators in place | e2e | new test: `li.wp-menu-separator` positions unchanged after Alt+Arrow | ❌ W0 | ⬜ pending |
| BUG-06 | Existing keyboard-reorder happy path still passes | e2e | `playwright test --grep "keyboard-only reorder"` | ✅ | ⬜ pending |
| BUG-07 | Badge renders next to label on item-with-submenu | e2e | `.maestro-modified-badge` inside `#menu-posts .wp-menu-name` | ❌ W0 | ⬜ pending |
| BUG-07 | Existing modified-indicator test still passes | e2e | `playwright test --grep "modified indicator"` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/e2e/editor.spec.ts` — UX-08a viewport-visibility test (new `test()` block at ≤782px / ≤600px).
- [ ] `tests/e2e/editor.spec.ts` — BUG-06 separator-preservation test (new `test()` block; **first confirm** whether a separator fixture is needed — WP core registers separators at positions 4/9/25/59/99, so wp-env may already have them).
- [ ] `tests/e2e/editor.spec.ts` — BUG-07 badge-location assertion (badge inside `.wp-menu-name` for an item-with-submenu).
- [ ] `tests/unit/AdminBarTest.php` — confirm exists or create for the UX-08b PHP string change (LOW priority — existing `LocalizationTest` integration coverage may suffice; decide at plan time).

---

## Manual-Only Verifications

*None blocking.* The UX-08a mobile screenshot — previously a manual browser-handoff checkpoint — is now a **deterministic scripted capture** (11-04 Task 2): a `MAESTRO_CAPTURE`-gated Playwright spec (`tests/e2e/specs/capture-screenshots.spec.ts`, the wp-sudo `capture-screenshots.spec.ts` pattern) writes `ux-08a-782.png` / `ux-08a-600.png` into the phase `screenshots/` dir via `npm run screenshots`, reusing the e2e harness's admin auth. The authoritative visibility + icon-only assertions live in the UX-08a e2e (11-01/11-02).

| Behavior | Requirement | Status | Notes |
|----------|-------------|--------|-------|
| Mobile tap-target reachability (visual glance) | UX-08a | **Optional, non-blocking** | A human may glance at the committed PNGs to confirm comfortable thumb reach; it does NOT gate the phase and requires no separate browser session. |

*Note: this follows the project pattern of scripting deterministic browser cases (per the global capability-detecting browser-handoff rule) rather than handing off to an interactive session.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (3 new e2e tests + AdminBarTest — landed as `tests/integration/AdminBarTest.php`, not unit: `Admin_Bar::node()` needs the WP runtime, and the unit bootstrap is WP-free)
- [x] No watch-mode flags
- [x] Feedback latency < ~5s for JS quick run
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved — plan-checker PASS (goal-backward, all 4 requirements covered test-first; line numbers + file-ownership re-verified). Two non-blocking advisories noted in plan text:
1. 11-04 Task 1 `<automated>` verify is `npm run test:js` only; the full Docker e2e/PHP suite lives in `<action>` (sandbox-disabled at execute time) — executor must not treat the JS verify as the sole gate.
2. BUG-06 separator fixture is probe-first: Wave 0 test `test.skip()`s (reports SKIPPED, never a vacuous pass) if wp-env has no separators; Wave 2 gate MUST add the mu-plugin fixture and confirm the test actually exercises separator preservation — a skipped BUG-06 test does NOT satisfy the phase.
