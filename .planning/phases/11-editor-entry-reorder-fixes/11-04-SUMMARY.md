---
phase: 11-editor-entry-reorder-fixes
plan: "04"
subsystem: testing
tags: [zero-regression-gate, e2e, integration, screenshots, playwright, wp-env, docker]

requires:
  - phase: 11-editor-entry-reorder-fixes/11-01
    provides: wave-0-guards, adminbar-integration-test, ux-08a-e2e, bug-06-e2e, bug-07-e2e
  - phase: 11-editor-entry-reorder-fixes/11-02
    provides: ux-08-implementation
  - phase: 11-editor-entry-reorder-fixes/11-03
    provides: bug-06-fix, bug-07-fix
provides:
  - zero-regression-gate: full suite green at the Wave 2 boundary (sandbox-disabled Docker)
  - capture-spec: guarded MAESTRO_CAPTURE deterministic UX-08a screenshot generator
  - screenshots-script: npm run screenshots (+ prescreenshots plugin-activate hook)
  - artifacts: ux-08a-782.png, ux-08a-600.png
affects: []

tech-stack:
  added: []
  patterns:
    - "Guarded capture spec (MAESTRO_CAPTURE gate) mirrors wp-sudo capture-screenshots.spec.ts — regenerable artifact, never overwritten by normal e2e/CI"
    - "Capture spec inherits shared storageState admin auth from playwright.config.ts (no bespoke auth path)"
    - "prescreenshots hook mirrors pretest:e2e so npm run screenshots is standalone (npm only chains pre/post on exact name match)"

key-files:
  created:
    - tests/e2e/specs/capture-screenshots.spec.ts
    - .planning/phases/11-editor-entry-reorder-fixes/screenshots/ux-08a-782.png
    - .planning/phases/11-editor-entry-reorder-fixes/screenshots/ux-08a-600.png
  modified:
    - package.json
    - tests/integration/AdminBarTest.php

key-decisions:
  - "Wave 2 gate run executed at the orchestrator level, sandbox-disabled (project's known executor/Docker sandbox gap) — wp-env + Playwright cannot run inside the agent sandbox"
  - "AdminBarTest harness gap (Class WP_Admin_Bar not found) routed back to 11-01's file: phpunit integration bootstrap does not auto-load wp-includes/class-wp-admin-bar.php; added a class_exists-guarded require_once in render_toggle_node()"
  - "BUG-06 e2e ran against real WP-core separators (positions 4/9/25/59/99) in wp-env — NOT skipped, so NO mu-plugin separator fixture was needed"
  - "Capture spec waits on the SAME #wp-admin-bar-maestro-toggle anchor the UX-08a guard asserts, so a wrong/error page cannot satisfy the wait and capture silently"
  - "Playwright chromium browser binary installed once (npx playwright install chromium) — was missing in this environment"

requirements-completed: [UX-08a, UX-08b, BUG-06, BUG-07]

duration: ~25min
completed: 2026-06-21
---

# Phase 11 Plan 04: Zero-Regression Gate + Mobile-Capture Spec Summary

**Full suite green at the Wave 2 boundary (sandbox-disabled Docker) — every Phase 11 requirement verified, nothing regressed — plus a guarded, regenerable UX-08a mobile-screenshot generator replacing the old manual browser handoff.**

## Zero-Regression Bar (HELD)

| Suite | Command | Result |
|-------|---------|--------|
| JS logic | `npm run test:js` | 53/53 ✓ |
| PHP unit | `composer test:unit` | 61/61 ✓ |
| PHP integration | `npm run test:php` | 37/37 ✓ (33 baseline + 4 AdminBarTest) |
| Playwright e2e | `npm run test:e2e` | 31/31 ✓ (28 baseline + UX-08a + BUG-06 + BUG-07) |
| phpcs | `composer lint` | clean (8/8 files) ✓ |
| PHPStan | `composer analyse:phpstan` | 0 errors ✓ |
| Plugin Check | `wp plugin check build/maestro-menu-editor` | No errors found ✓ (built runtime tree, CI parity) |

- **BUG-06 (e2e test 29) actually exercised separator preservation** against real WP-core separators — it ran and passed, it did **not** skip. No separator fixture was required.
- **L301 'modified indicator' and L355 'keyboard-only reorder' baselines** still pass (no regression from the BUG-06/BUG-07 DOM changes).
- **UX-08b (AdminBarTest, 4 assertions)** green — compact visible labels ('Edit Menu'/'Exit') with long-form accessible strings retained in `meta.title`.

## Routed-back fix (11-01 file ownership)

The Wave 2 gate surfaced a test-harness gap in `tests/integration/AdminBarTest.php` (authored by 11-01): `new WP_Admin_Bar()` raised `Class "WP_Admin_Bar" not found` because the phpunit integration bootstrap does not load `wp-includes/class-wp-admin-bar.php`. Fixed with a `class_exists`-guarded `require_once` in the helper (commit `236133c`, scoped to 11-01's file per the gate plan's "no source patches from the gate plan" rule). Integration went 33→37 green.

## Capture artifact (replaces manual handoff)

`npm run screenshots` (MAESTRO_CAPTURE-gated) deterministically writes `ux-08a-782.png` and `ux-08a-600.png` showing the fixed icon-only toggle in the admin bar with the Maestro edit toolbar. The guard keeps the normal `test:e2e`/CI run from regenerating or overwriting the committed PNGs. A human glance is optional and non-blocking.

## Deviations

- **Environment setup, not plan logic:** wp-env was started and the Playwright chromium binary installed (`npx playwright install chromium`) — both were absent in this environment. No plan content changed as a result.
- **No production source modified by this plan** — only a new guarded test spec, two npm scripts, the routed-back test-harness require, and the committed PNG artifacts.

## Commits

| Hash | Message |
|------|---------|
| `236133c` | fix(11): load WP_Admin_Bar in AdminBarTest integration helper |
| `e073963` | test(11-04): add guarded UX-08a mobile-capture spec + screenshots script |
