---
phase: 9
slug: editor-ux-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-19
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (JS logic unit) · `phpunit` (PHP unit + integration) · Playwright (e2e) |
| **Config file** | `phpunit-unit.xml.dist`, `phpunit-integration.xml.dist`, `playwright.config.ts` (all existing); JS via `tests/js/` + `npm run test:js` |
| **Quick run command** | `npm run test:js` (JS logic, <2s) |
| **Full suite command** | `npm run test:js && composer test:unit && composer test:integration && npm run test:e2e` |
| **Estimated runtime** | ~2s (JS) · ~10s (PHP unit) · e2e is Docker/Playwright (minutes) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:js` (after any `assets/maestro-logic.js` change) and/or `composer test:unit` (after any PHP change)
- **After every plan wave:** Run the full suite — `npm run test:js && composer test:unit && composer test:integration && npm run test:e2e`
- **Before `/gsd:verify-work`:** Full suite must be green + Plugin Check 0 errors + `composer lint` clean
- **Max feedback latency:** ~2s for the JS logic seams (the red-first TDD loop); minutes for the e2e/visual layer

---

## Per-Task Verification Map

> Task IDs are provisional (`9-WW-TT` = phase-wave-task) until plans are written; the planner refines them to real plan/task IDs. Behavioral-JS rows are red-first (test committed failing, then implementation).

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 0 | UX-03 | unit | `node --test tests/js/mode-status.test.mjs` | ❌ W0 | ⬜ pending |
| 9-01-02 | 01 | 0 | UX-03 | unit | `node --test tests/js/first-run-gate.test.mjs` | ❌ W0 | ⬜ pending |
| 9-01-03 | 01 | 0 | UX-04 | unit | `node --test tests/js/placeholder.test.mjs` (optional seam) | ❌ W0 | ⬜ pending |
| 9-02-01 | 02 | 1 | UX-03 | unit→impl | `npm run test:js` (`modeStatusLabel` green) | ✅ after W0 | ⬜ pending |
| 9-02-02 | 02 | 1 | UX-03 | integration | `composer test:integration` (`modeLabel` key in `LocalizationTest`) | ✅ (update) | ⬜ pending |
| 9-02-03 | 02 | 1 | UX-03 | e2e | `npm run test:e2e` (mode label `<span>` + dashicon child; idle `.maestro-status::before` still `none`) | ✅ (extend) | ⬜ pending |
| 9-03-01 | 03 | 1 | UX-03 | unit→impl | `npm run test:js` (`firstRunSeen` green) | ✅ after W0 | ⬜ pending |
| 9-03-02 | 03 | 1 | UX-03 | e2e | `npm run test:e2e` (pulse class present after first-run cue; absent after dismiss / under reduced-motion) | ✅ (extend) | ⬜ pending |
| 9-04-01 | 04 | 1 | UX-04 | integration | `composer test:integration` (`renamePlaceholder` key) | ✅ (update) | ⬜ pending |
| 9-04-02 | 04 | 1 | UX-04 | e2e | `npm run test:e2e` (no visible "Rename " text node; `getByLabel` resolves; placeholder shows only when empty; field pre-filled) | ✅ (extend) | ⬜ pending |
| 9-05-01 | 05 | 2 | UX-07 | e2e | `npm run test:e2e` (every button + rename input ≥44px tall at ≤782px — bounding-box) | ❌ W0 (new assertion) | ⬜ pending |
| 9-05-02 | 05 | 2 | UX-07 | e2e | `npm run test:e2e` (no toolbar overflow / no control overlap at 700px — existing guards still pass) | ✅ | ⬜ pending |
| 9-06-01 | 06 | 2 | UX-03/04/07 | regression | `npm run test:js && composer test:unit && composer test:integration && npm run test:e2e` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/js/mode-status.test.mjs` — RED unit for `modeStatusLabel(state, strings)` (UX-03 save-state → text mapping); must FAIL before implementation
- [ ] `tests/js/first-run-gate.test.mjs` — RED unit for `firstRunSeen(storage)` (UX-03 localStorage gate abstraction, storage stub); must FAIL before implementation
- [ ] `tests/js/placeholder.test.mjs` — RED unit for `placeholderVisible(value)` (UX-04 empty-vs-filled); optional — planner decides whether the seam earns a unit test or is pure DOM glue
- [ ] New e2e assertion in `tests/e2e/editor.spec.ts`: touch-target size check (≥44px on every button + the rename input at ≤782px) — currently missing; required for UX-07
- [ ] `tests/integration/LocalizationTest.php` — add `modeLabel` and `renamePlaceholder` to `expected_i18n_keys()`, committed in the SAME change that adds those keys to `includes/class-assets.php` (keeps integration at 29/29 + new assertions, never red in between)

*New JS logic functions extend `assets/maestro-logic.js` via its existing dual-export guard (browser `window.maestroLogic` + `.mjs` `createRequire` import), per the Phase 6 pattern.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| First-run pulse reads as a deliberate, non-annoying attention cue (visual quality) | UX-03 | Subjective visual quality; automation only asserts class presence/removal | Fresh profile (clear `localStorage`), enter edit mode, confirm the first editable top-level item pulses once (~1–2s) then stops; banner still dismissible by keyboard |
| `prefers-reduced-motion` degradation | UX-03 | Browser-media-dependent rendering | With OS "reduce motion" on, re-run first-run: confirm static outline or no motion, and the pulse class is still cleaned up (no stuck state) |
| Dashicon idle glyph does not read as an interactive control (avoid BUG-04 regression) | UX-03 | Affordance perception | Visual check: the `dashicons-edit` glyph beside "Edit Mode" reads as a label adornment, not a clickable/toggle control |
| Mobile density at ≤782px reads well, not just fits | UX-07 | Visual/ergonomic judgment | Screenshot at 700px (and a real phone width) with the panel open: controls are denser but tap targets still comfortably ≥44px; capture before/after |
| Placeholder text contrast (WCAG AA) | UX-04 | Token/render-dependent | Verify "Menu label" placeholder meets AA against the input background (admin color tokens) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (3 new test files + the LocalizationTest update + the 44px e2e assertion)
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s on the JS logic seams
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
