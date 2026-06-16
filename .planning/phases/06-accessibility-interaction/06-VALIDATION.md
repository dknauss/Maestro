---
phase: 6
slug: accessibility-interaction
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-15
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> TDD-first: every pure-logic task ships its failing test before implementation.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | phpunit (existing PHP unit/integration) · Playwright (e2e) · **JS unit runner TBD by planner** (Vitest recommended, dev-only, excluded from build) — only if frontend pure logic is the chosen TDD seam |
| **Config file** | `phpunit-unit.xml.dist`, `phpunit-integration.xml.dist`, `playwright.config.ts` (+ `vitest.config` if added in Wave 0) |
| **Quick run command** | `composer test:unit` (+ JS unit run if added) |
| **Full suite command** | `composer test:unit && composer test:integration && npm run test:e2e` |
| **Estimated runtime** | ~unit <10s · integration ~30–60s (wp-env) · e2e ~30–90s |

---

## Sampling Rate

- **After every task commit:** Run the quick command for the layer touched
  (`composer test:unit` and/or the JS unit run).
- **After every plan wave:** Run the full suite.
- **Before `/gsd:verify-work`:** Full suite green — PHP unit **44/44** (+ new),
  integration **29/29** (+ new), e2e **9/9** (+ new), Plugin Check **0 errors**.
- **Max feedback latency:** < 10s for unit-level TDD loops.

---

## Per-Task Verification Map

> Populated by gsd-planner / gsd-nyquist-auditor once tasks are defined. Each
> pure-logic task MUST have a failing unit test committed first (TDD red).

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| _TBD by planner_ | — | — | A11Y-06 | unit + e2e | `composer test:unit` / `npm run test:e2e` | ❌ W0 | ⬜ pending |
| _TBD by planner_ | — | — | UX-01 | unit + e2e | `composer test:unit` / `npm run test:e2e` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] **TDD seam decision realized** (planner): if JS pure-logic path chosen, install
      the JS unit runner (Vitest/`node:test`) as a dev dependency and add its config —
      **must not** be bundled by `bin/build.sh`. If PHP path chosen, no new tooling.
- [ ] Failing unit-test stubs for the **reorder-move** pure function (A11Y-06).
- [ ] Failing unit-test stubs for the **modified-state diff** pure function (UX-01).
- [ ] Failing unit-test stub for **per-item reset** state recomputation (UX-01).
- [ ] e2e stub(s) in `tests/e2e/editor.spec.ts` for the keyboard-only reorder
      walkthrough and the modified-indicator / discoverable-reset assertions.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Screen-reader announcement quality of each reorder move | A11Y-06 | AT phrasing/UX judgment isn't meaningfully automatable | With VoiceOver/NVDA, select an item, trigger move up/down, confirm a sensible position announcement via `wp.a11y.speak()` |
| "Modified" indicator is perceivable & not color-only | UX-01 | Visual/contrast judgment | In edit mode, modify an item; confirm a non-color cue (icon/text) at AA contrast; confirm reset is reachable by keyboard without prior knowledge |

*Automated coverage still asserts the wiring (a move occurs, indicator class/text present, reset removes the delta); manual rows cover perceptual quality only.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s for unit loops
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
