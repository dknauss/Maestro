---
phase: 17
slug: slug-normalization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-29
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Research
> is disabled for this milestone (no RESEARCH.md); this strategy is derived
> directly from `17-CONTEXT.md` and the established test conventions
> (`Maestro\Ordering` + `tests/unit/OrderingTest.php` as the pure-class template).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Frameworks** | PHPUnit (PHP unit + integration), node:test (JS logic), Playwright (E2E) |
| **Config files** | `phpunit-unit.xml.dist`, `phpunit-integration.xml.dist`, `playwright.config.ts` |
| **Quick run command** | `composer test:unit` (= `phpunit -c phpunit-unit.xml.dist`; WP-free, no Docker) |
| **Full suite command** | `composer test:unit && composer lint && composer analyse:phpstan && npm run test:js && npm run env:start && npm run test:php && npm run test:e2e` |
| **Estimated runtime** | unit ~seconds; integration + E2E minutes (Docker via wp-env) |

---

## Sampling Rate

- **After every task commit:** Run the quick command, filtered to the class under
  test — `composer test:unit -- --filter SlugTest` for the `normalize()` cases,
  `--filter OrderingTest`/`--filter ReplayTest` when touching the wiring seams.
- **After every plan wave:** Run `composer test:unit` (full unit suite) +
  `composer lint` + `composer analyse:phpstan`. **Integration + E2E (Docker) run
  only at the wave boundary** — Docker/sandbox blocks per-task E2E (established
  Phase 9/11.1 pattern, STATE.md). The planner MUST schedule a final-wave
  full-suite + Plugin Check gate plan.
- **Before `/gsd:verify-work`:** Full suite green + WPCS clean + PHPStan clean +
  Plugin Check 0 errors.
- **Max feedback latency:** unit < ~10s; integration/E2E deferred to wave
  boundary by design.

---

## Per-Task Verification Map

> Task IDs are assigned by the planner; this seeds the requirement→test mapping.
> `❌ W0` = test file/data-provider created red-first in Wave 0. The `normalize()`
> work is overwhelmingly **unit**-testable (the Nyquist strength of this phase):
> a pure function with a six-fixture data provider gives near-zero feedback
> latency before any Replay wiring is touched.

| Task (planner-assigned) | Req | Wave | Test Type | Automated Command | File |
|-------------------------|-----|------|-----------|-------------------|------|
| `normalize()` absolute-URL → admin-relative (host strip) + `ver=` strip | FIX-01 | 1 | unit | `composer test:unit -- --filter SlugTest` | ❌ W0 `tests/unit/SlugTest.php` |
| `normalize()` external-URL host kept + `utm_*` strip + param sort | FIX-02 | 1 | unit | same | ❌ W0 |
| `normalize()` `html_entity_decode` decode-first (`&amp;` ⇄ `&`) | FIX-03 | 1 | unit | same | ❌ W0 |
| Idempotency + no-op on plain slugs (zero-regression precondition) | FIX-01..03 | 1 | unit | same | ❌ W0 |
| Collision-guard: 4 asserted cases (2 must-NOT-collapse, 2 MUST-merge) | FIX-01..03 | 1 | unit | same | ❌ W0 |
| Edge/malformed rows (empty, non-string, dup params, `foo=`, `#`) | FIX-01..03 | 1 | unit | same | ❌ W0 |
| Replay top-level items[] lookup uses normalized keys | FIX-01..03 | 2 | integration | `npm run test:php` | existing `tests/integration/ReplayTest.php` (+W0 cases) |
| Replay submenu items[] lookup uses normalized keys | FIX-01..03 | 2 | integration | same | same |
| `Ordering::submenu` child-slug comparison normalized (reorder seam) | FIX-01..03 | 2 | integration/unit | `composer test:unit -- --filter OrderingTest` / `npm run test:php` | existing (+W0 cases) |
| Zero-regression gate: full unit+integration+E2E green, WPCS, PHPStan, Plugin Check 0 | FIX-01..03 | final | full suite + Plugin Check | full suite command above | existing |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/SlugTest.php` — new pure-class test mirroring
  `tests/unit/OrderingTest.php`. Add `Maestro\Slug` (`class-slug.php`) to
  `tests/bootstrap-unit.php` alongside `class-ordering.php` (line ~110) so the
  unit harness loads it WP-free.
- [ ] **Shared data provider** in `SlugTest.php` — one row per R1 fixture
  (`rendered-slug`, `stored-key variant`, `expected normalized output`, comment
  citing `SURV-NN Ix`). Sources confirmed present:
  `SURV-02 I2` (Jetpack Settings absolute URL),
  `SURV-04 I230` (Elementor Website Templates absolute URL + `ver=`),
  `SURV-04 I229` / `SURV-01` / `SURV-06` (`&amp;` taxonomy slugs),
  `SURV-05` (WPForms upgrade external URL + UTM). One traceable table drives both
  the `expect(normalize(in)).toBe(out)` cases and the collision-guard pairs.
- [ ] Integration coverage for the Replay/Ordering wiring lands as new methods in
  the **existing** `tests/integration/ReplayTest.php` (Docker-backed) — no new
  integration file required; `class-replay.php` is not loaded by the unit
  bootstrap, so the resolve-path behavior is asserted in integration.

*No new framework install required — all tooling already present.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| (none) | — | — | All three FIX behaviors are verifiable via the pure `normalize()` unit data provider plus integration assertions on the Replay resolve path. The collision-guard test proves conservatism automatically. |

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`SlugTest.php` + data provider + bootstrap-unit registration)
- [ ] No watch-mode flags
- [ ] Feedback latency acceptable (unit fast; integration/E2E deferred to wave boundary by design)
- [ ] `nyquist_compliant: true` set in frontmatter (after planner/checker confirm)

**Approval:** pending
