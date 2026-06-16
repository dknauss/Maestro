---
phase: 7
slug: visual-polish-icons
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-15
---

# Phase 7 — Validation Strategy

> Per-phase validation contract. ICON-01 bundle generation is TDD-tested logic;
> UX-02 visual polish is UI styling (e2e regression + screenshots, not unit TDD).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (JS unit, from Phase 6) · phpunit (unit/integration) · Playwright (e2e) |
| **Config file** | none for JS (`node --test tests/js/`) · `phpunit-*.xml.dist` · `playwright.config.ts` |
| **Quick run command** | `npm run test:js` · `composer test:unit` |
| **Full suite command** | `npm run test:js && composer test:unit && npm run test:php && npm run test:e2e` |
| **Estimated runtime** | JS unit <2s · unit <10s · integration ~30–60s (wp-env) · e2e ~30–90s |

---

## Sampling Rate

- **After every task commit:** quick command for the layer touched.
- **After every plan wave:** full suite.
- **Before `/gsd:verify-work`:** full suite green — PHP unit 44/44, integration
  29/29 (edit-mode payload-budget contract still satisfied with the new bundle),
  e2e green, Plugin Check 0 errors, `composer lint` clean, `npm run test:js` green.
- **Max feedback latency:** < 2s JS unit · < 10s PHP unit.

---

## Per-Task Verification Map

> Populated by gsd-planner. ICON-01 generator logic is test-first.

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 07-01 T1 — TDD resolveIcon (fill→synonym→outline policy, no-drop invariant, data-URI shape + baked grey) | 07-01 | 1 | ICON-01 | unit (node:test) | `node --test tests/js/icons-bundle.test.mjs` | ⬜ pending |
| 07-01 T2 — regenerate `includes/icons-bootstrap.php` to solid variants (87 entries, no drops) | 07-01 | 1 | ICON-01 | logic+grep | `node bin/generate-bootstrap-icons.mjs && test "$(grep -c "=> 'data:" includes/icons-bootstrap.php)" = "87"` | ⬜ pending |
| 07-01 T3 — confirm/adjust edit-mode payload-budget contract for the smaller solid bundle | 07-01 | 1 | ICON-01 | integration (phpunit) | `npm run test:php` | ⬜ pending |
| 07-02 T1 — toolbar hierarchy/spacing + non-color status states (CSS/markup) | 07-02 | 1 | UX-02 | static check + lint | `node -e "…non-color status assertion…"` (see plan) | ⬜ pending |
| 07-02 T2 — ~20px scannable grid + dismissible first-run cue (CSS/markup/i18n) | 07-02 | 1 | UX-02 | grep + lint | `grep -q firstRun includes/class-assets.php && composer lint` | ⬜ pending |
| 07-03 T1 — e2e regression: side-by-side grid, no-overlap/no-resize @1200/700, first-run once | 07-03 | 2 | UX-02, ICON-01 | e2e (Playwright) | `npm run test:e2e` | ⬜ pending |
| 07-03 T2 — UX-02 walkthrough notes + full zero-regression suite | 07-03 | 2 | UX-02 | full suite | `npm run test:js && composer test:unit && npm run test:php && npm run test:e2e && composer lint` | ⬜ pending |

*Checkpoint (07-03, between T1 and T2) is human-verify (perceptual icon-weight / native-polish judgment); not an automated row.*

---

## Wave 0 Requirements

- [x] **Mapped to a task:** Failing test(s) in `tests/js/icons-bundle.test.mjs` for the
      icon-bundle resolver — every CURATED name maps to an existing fill/synonym/outline
      source (no silent drops, count 87), output entries are well-formed base64
      `data:image/svg+xml` with baked menu-grey. This is Plan 07-01 Task 1 (RED-first).
- [x] **Mapped to a task:** e2e regression in `tests/e2e/editor.spec.ts` for the UX-02
      checks (grid renders/scans; no text-overlap; controls not resized; first-run once).
      This is Plan 07-03 Task 1.
- *No new test framework needed — the `node:test` seam exists from Phase 6 (Plan 06-01).
  The `test:js` npm script is a Phase 6 deliverable and MUST exist before Phase 7 runs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Fill icons "mix" with dashicons (don't read lighter) | ICON-01 | Visual weight judgment | Side-by-side screenshot of the bundled-icons tab vs the dashicons tab (07-03 Task 1 captures it; the 07-03 checkpoint judges it); decide Heroicons fallback only if still light |
| Edit-mode polish reads as native WP admin, hierarchy/spacing/status clarity improved | UX-02 | Aesthetic/UX judgment | Before/after screenshots (07-03 Task 1) + keyboard/mouse walkthrough notes (07-03 Task 2); confirm no text-overlap or awkward control resize |

*Automated coverage still asserts the wiring (bundle generates valid 87 entries, grid
renders N icons, controls present and not overlapping, first-run once); the manual rows
cover perceptual/aesthetic quality only — handled at the 07-03 human-verify checkpoint.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (every logic/test/CSS task has an automated command; the lone non-automated step is the explicit human-verify checkpoint)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (icon-bundle RED test → 07-01 T1; e2e regression → 07-03 T1)
- [x] No watch-mode flags
- [x] Feedback latency < 10s for unit loops (JS unit <2s, PHP unit <10s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validation strategy satisfied — every logic task is test-first with an automated verify; UX-02 styling is covered by e2e regression + the human-verify checkpoint.
