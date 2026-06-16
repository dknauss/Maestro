---
phase: 8
slug: docs-brand-assets
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-15
---

# Phase 8 — Validation Strategy

> DOC-01 has a testable contract (grep returns no offending bare-path refs) → built
> test-first. REL-06 is verify + reconcile of an already-shipped pipeline.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` / a repeatable doc-link checker script (`node`) · phpunit (regression) · Playwright (regression) |
| **Config file** | none for JS (`node --test tests/js/`) · `phpunit-*.xml.dist` · `playwright.config.ts` |
| **Quick run command** | `node --test tests/js/doc-links.test.mjs` (or `node bin/check-doc-links.mjs`) |
| **Full suite command** | `npm run test:js && composer test:unit && npm run test:php && npm run test:e2e && composer lint` |
| **Estimated runtime** | doc-link check <2s · banner regen <30s · full regression suite ~2–3 min |

---

## Sampling Rate

- **After every task commit:** the doc-link checker for DOC-01 work.
- **After the phase:** full regression suite (doc/asset-only changes must not move it).
- **Before `/gsd:verify-work`:** doc-link checker returns 0 offenders; banner regen
  regenerates valid PNGs at exact dimensions (byte-identity is best-case, not required — visual-review gate applies); PHP unit 44/44, integration 29/29, e2e green, Plugin
  Check 0 errors, `composer lint` clean.
- **Max feedback latency:** < 2s for the doc-link check.

---

## Per-Task Verification Map

> Populated by gsd-planner. DOC-01 checker is test-first (RED = N offenders → GREEN = 0).

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 08-01.T1 (TDD: doc-link checker — scanText/findOffenders flag inline-code refs resolving to real repo files, not yet links; exclude core + readme.txt + fenced + image/linked) | 08-01 | 1 | DOC-01 | unit/script (node) | `npm run test:js` (scanText fixtures green; strict findOffenders()===[] is RED until 08-02) | ⬜ pending |
| 08-01.T2 (wire npm scripts; record RED offender baseline) | 08-01 | 1 | DOC-01 | script (RED gate) | `npm run check:doc-links` (exits non-zero — RED) | ⬜ pending |
| 08-02.T1 (convert flagged refs to markdown links; fix 3 stale paths → GREEN) | 08-02 | 2 | DOC-01 | script (GREEN gate) | `npm run check:doc-links && npm run test:js` (0 offenders) | ⬜ pending |
| 08-03.T1 (verify `npm run assets:banners` regenerates both banners; restore committed PNGs) | 08-03 | 1 | REL-06 | regen + dimensions | `npm run assets:banners && file .wordpress-org/banner-772x250.png \| grep -q "772 x 250" && file .wordpress-org/banner-1544x500.png \| grep -q "1544 x 500"` | ⬜ pending |
| 08-03.T2 (reconcile REL-06 wording: in-code SVG master + Inkscape + Pillow; standalone-svg substitution) | 08-03 | 1 | REL-06 | doc grep | `grep -iq "build_final.py" .planning/REQUIREMENTS.md && grep -iqE "Inkscape\|Pillow" .planning/REQUIREMENTS.md` | ⬜ pending |
| 08-04.T1 (Docker-free zero-regression gates) | 08-04 | 3 | DOC-01, REL-06 | unit+lint+checker | `composer test:unit && composer lint && npm run check:doc-links && npm run test:js` | ⬜ pending |
| 08-04.T2 (flip DOC-01 Complete; mark Phase 8 done; sign off) | 08-04 | 3 | DOC-01 | tracking grep | `grep -q "\[x\] \*\*DOC-01" .planning/REQUIREMENTS.md` | ⬜ pending |

---

## Wave 0 Requirements

- [ ] Failing doc-link checker (RED) listing the inline-code refs that resolve to
      real project files but are not yet markdown links, scoped to the in-scope docs
      (README, SPEC, TESTING, user-guide, planning) and EXCLUDING WP-core refs
      (`common.js`, `menu-header.php`, `wp-admin/*`) and `readme.txt` relative paths.
- *No new framework — reuse the Phase 6 `node:test` seam, or a standalone
  `bin/check-doc-links.mjs` invoked by an npm script.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "Where relative links make sense" / readme.txt policy | DOC-01 | Editorial judgment about which refs benefit from a link | Review flagged refs; confirm core/external files stay code and readme.txt relative paths stay code |
| REL-06 criterion reconciliation reads accurately | REL-06 | Judgment that the wording faithfully records the mechanism substitution | Confirm REQUIREMENTS/ROADMAP note the actual mechanism (in-code SVG master in build_final.py + Inkscape render + Pillow LANCZOS downscale; standalone-.svg substitution) and that banners regenerate from committed source |

*The doc-link checker and banner-regen diff give automated coverage of the wiring; manual rows cover the two editorial judgments only.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s for unit loops
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
