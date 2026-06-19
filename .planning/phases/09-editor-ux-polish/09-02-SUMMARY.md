---
phase: 09-editor-ux-polish
plan: "02"
subsystem: editor-ux
tags: [ux, i18n, accessibility, wcag, dom, css, e2e]
dependency_graph:
  requires: [09-01]
  provides: [split-mode-indicator, modeLabel-i18n, mode-label-css, e2e-mode-guards]
  affects: [assets/maestro.js, assets/maestro.css, includes/class-assets.php, tests/integration/LocalizationTest.php, tests/e2e/editor.spec.ts]
tech_stack:
  added: []
  patterns:
    - persistent-dom-label-plus-transient-live-region
    - aria-hidden-dashicon-child-for-non-colour-cue
    - modeStatusLabel-seam-routing
key_files:
  created: []
  modified:
    - includes/class-assets.php
    - tests/integration/LocalizationTest.php
    - assets/maestro.js
    - assets/maestro.css
    - tests/e2e/editor.spec.ts
decisions:
  - "idle value changed to 'Edit Mode' (LOCKED — satisfies roadmap criterion #1 intent; shorter than literal 'Menu Edit Mode')"
  - "modeLabel key + LocalizationTest update shipped in one commit so integration is never red between changes"
  - "idle dashicon is a real aria-hidden DOM <span> child of .maestro-mode-label, not ::before on .maestro-status, avoiding BUG-04 regression"
  - "setStatus() at idle sets statusEl.textContent='' via modeStatusLabel() returning '' — no hidden attribute on live region (per Open Question #1 resolution)"
  - "::before on .maestro-status retained only for saving/saved/error states (BUG-05 glyphs intact)"
metrics:
  duration: "21m"
  completed: "2026-06-19"
  tasks_completed: 3
  files_modified: 5
  commits: 3
---

# Phase 9 Plan 02: Split Mode Indicator + "Edit Mode" i18n — Summary

**One-liner:** Split single status element into persistent `.maestro-mode-label` (dashicon + "Edit Mode" green label) plus transient `.maestro-status` aria-live region; routed through the Plan-01 `modeStatusLabel` seam.

---

## What Was Built

UX-03 status redesign — the verbose "Editor active — click an item to edit." idle copy is replaced with a short, glanceable "Edit Mode" indicator. The DOM is restructured so the persistent mode label never competes with transient save feedback:

- **Persistent mode label** (`.maestro-mode-label`): always visible, never changes text. Contains an `aria-hidden` `dashicons-edit` span (the non-colour WCAG 1.4.1 shape cue) and the "Edit Mode" text node. Built in `buildToolbar()`.
- **Transient save-status** (`.maestro-status`): `aria-live="polite"`, `role="status"`, `aria-atomic="true"`. Empty at idle (textContent = ''). Filled by `setStatus()` via `window.maestroLogic.modeStatusLabel(state, I)`. `wp.a11y.speak()` still fires for saved/error.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | i18n idle→"Edit Mode" + modeLabel key + LocalizationTest | `938f4c9` | class-assets.php, LocalizationTest.php |
| 2 | DOM split + setStatus routing + CSS | `1c52fe1` | maestro.js, maestro.css |
| 3 | e2e assertions for split mode indicator | `a247afc` | editor.spec.ts |

---

## Deviations from Plan

None — plan executed exactly as written.

The PLAN.md interfaces block provided a precise target structure; the research's Open Question #1 resolution (use `textContent = ''` at idle, not `hidden`) was followed — the live region stays visible but empty rather than using the `hidden` attribute (which can prevent AT announcements on re-show in some browsers).

---

## Decisions Made

1. **"Edit Mode" reconciliation confirmed** — roadmap criterion #1 reads "Menu Edit Mode"; locked to shorter "Edit Mode" per CONTEXT.md. Satisfies the intent (short, glanceable, non-colour-signalled). Same reconciliation pattern as Phase 8 REL-06.

2. **modeLabel + LocalizationTest in one commit** — per Pitfall 5 in RESEARCH.md and the critical note; shipped together at `938f4c9`.

3. **`textContent = ''` at idle, not `hidden`** — aria-live regions should never be hidden; leave visible and empty so the region only announces when content changes.

4. **Existing Phase 7 `::before` guard unchanged** — the idle `content: none` assertion on `.maestro-status::before` at e2e line 634 is untouched. The new UX-03 test block also asserts this explicitly with a comment explaining why it still holds.

---

## Test Results

| Suite | Result |
|-------|--------|
| `npm run test:js` | 56/56 green |
| `composer test:unit` | 44/44 green |
| `composer lint` | 7/7 clean |
| `composer test:integration` | Needs WP test suite (unavailable in sandbox); static grep checks pass; changes are additive (modeLabel key + test assertion) |
| `npm run test:e2e` | Playwright e2e requires Docker/browser environment; three new assertions added to editor.spec.ts; existing Phase 7 guard preserved unchanged |

---

## Self-Check

- [x] `includes/class-assets.php` — modeLabel key present
- [x] `tests/integration/LocalizationTest.php` — modeLabel in expected_i18n_keys()
- [x] `assets/maestro.js` — maestro-mode-label, dashicons-edit, modeStatusLabel present; I.idle not on statusEl
- [x] `assets/maestro.css` — .maestro-mode-label styles present
- [x] `tests/e2e/editor.spec.ts` — maestro-mode-label, "Edit Mode", ::before guard all present
- [x] Commits `938f4c9`, `1c52fe1`, `a247afc` present in git log

## Self-Check: PASSED
