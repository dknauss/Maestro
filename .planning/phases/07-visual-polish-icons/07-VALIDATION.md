---
phase: 7
slug: visual-polish-icons
status: draft
nyquist_compliant: false
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
| **Full suite command** | `npm run test:js && composer test:unit && composer test:integration && npm run test:e2e` |
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
| _TBD_ (icon-bundle TDD: fill resolution + well-formed data-URIs + count preserved) | — | — | ICON-01 | unit (node:test) | `node --test tests/js/icons-bundle.test.mjs` | ⬜ pending |
| _TBD_ (regenerate `includes/icons-bootstrap.php` to fill variants) | — | — | ICON-01 | logic+grep | `node bin/generate-bootstrap-icons.mjs && composer test:integration` | ⬜ pending |
| _TBD_ (edit-mode UI polish CSS/markup) | — | — | UX-02 | e2e (Playwright) | `npm run test:e2e` | ⬜ pending |
| _TBD_ (UX-02 regression e2e: no text-overlap / no control-resize / scanable grid) | — | — | UX-02 | e2e (Playwright) | `npm run test:e2e` | ⬜ pending |

---

## Wave 0 Requirements

- [ ] Failing test(s) in `tests/js/` for the icon-bundle generator: every CURATED
      name maps to an existing fill SVG (or a justified fallback), output entries
      are well-formed base64 `data:image/svg+xml` with the baked menu-grey, bundle
      count is preserved (no silent drops).
- [ ] e2e stub(s) in `tests/e2e/editor.spec.ts` for the UX-02 regression checks
      (icon-picker grid renders/scans; no text-overlap; controls not resized).
- *No new test framework needed — `node:test` seam exists from Phase 6.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Fill icons "mix" with dashicons (don't read lighter) | ICON-01 | Visual weight judgment | Side-by-side screenshot of the bundled-icons tab vs the dashicons tab; confirm comparable weight; decide Heroicons fallback only if still light |
| Edit-mode polish reads as native WP admin, hierarchy/spacing/status clarity improved | UX-02 | Aesthetic/UX judgment | Before/after screenshots + keyboard/mouse walkthrough notes; confirm no text-overlap or awkward control resize |

*Automated coverage still asserts the wiring (bundle generates valid entries, grid renders N icons, controls present and not overlapping); manual rows cover perceptual/aesthetic quality only.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s for unit loops
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
