---
phase: 09-editor-ux-polish
plan: "03"
subsystem: editor-ux
tags: [ux, animation, accessibility, first-run, css, e2e]
requirements: [UX-03]

dependency_graph:
  requires: ["09-01 (firstRunSeen seam)", "09-02 (maestro-logic.js pattern)"]
  provides: ["UX-03 first-run pulse", "dual-cleanup pattern (animationend + dismiss)"]
  affects: ["assets/maestro.js", "assets/maestro.css", "tests/e2e/editor.spec.ts"]

tech_stack:
  added: []
  patterns:
    - "One-shot CSS animation via class add + animationend cleanup"
    - "Dual-path class removal: animationend (motion) + dismiss() (reduced-motion / early)"
    - "window.maestroLogic.firstRunSeen() seam for localStorage gate"

key_files:
  created: []
  modified:
    - assets/maestro.js
    - assets/maestro.css
    - tests/e2e/editor.spec.ts

decisions:
  - "Outline (not box-shadow) for pulse — sits outside border-box (zero reflow), reads as temporary attention vs the persistent inset box-shadow on selected items"
  - "Color token #2271b1 (WP admin primary) — consistent with dismiss button focus-visible and rename input border"
  - "1.5s timing within the locked ~1-2s one-shot bound"
  - "Dual-cleanup is mandatory: animationend never fires under prefers-reduced-motion:reduce, so dismiss() must also call classList.remove"
  - "Gate swapped from inline try/catch to window.maestroLogic.firstRunSeen() — preserves storage-throws behavior (returns true on throw = skip cue)"

metrics:
  duration: "~15m"
  completed: "2026-06-19"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 9 Plan 03: First-Run Pulse Attention Cue Summary

One-shot outline pulse on the first editable top-level admin menu item, localStorage-gated via the Plan-01 `firstRunSeen` seam, with dual-path class cleanup proving correctness under `prefers-reduced-motion`.

## What Was Built

**buildFirstRunCue() extended (assets/maestro.js):**
- Swapped inline localStorage gate for `window.maestroLogic.firstRunSeen(window.localStorage)` — the Plan-01 seam that returns `true` on storage throws (private-browsing safe)
- After banner is built/appended: selects first `#adminmenu > li.menu-top.maestro-item`, guards for null, adds `maestro-firstrun-pulse`, registers one-shot `animationend` handler that removes the class and itself (motion path)
- Extended `dismiss()` to also call `firstItem.classList.remove('maestro-firstrun-pulse')` — the critical reduced-motion cleanup path where `animationend` never fires

**CSS additions (assets/maestro.css):**
- `@keyframes maestro-pulse-item`: outline fades in at 40%, holds to 60%, fades out — transparent → `#2271b1` → transparent
- `#adminmenu li.maestro-firstrun-pulse`: `animation: maestro-pulse-item 1.5s ease-in-out 1 forwards` — `iteration-count: 1`, never loops
- `@media (prefers-reduced-motion: reduce)`: `animation: none` + static `outline: 2px solid #2271b1` — visible cue with no motion

**e2e assertions (tests/e2e/editor.spec.ts):**
- New `UX-03 — first-run pulse on first editable menu item` describe block
- Asserts `maestro-firstrun-pulse` class is present on `#adminmenu > li.menu-top.maestro-item:first` after cue shows
- Asserts class is absent after `dismiss()` click — directly tests the reduced-motion cleanup path

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `baea0e1` | `feat(09-03): one-shot first-run pulse on first editable menu item (UX-03)` |
| 2 | `de588e9` | `test(09-03): e2e first-run pulse present-then-removed (UX-03)` |

## Test Results

- `npm run test:js`: 56/56 (unchanged — no JS logic seam in this plan; firstRunSeen already tested in 09-01)
- `npm run test:e2e`: assertions written; full Docker run deferred to Plan 06 wave gate per plan spec

## Deviations from Plan

None — plan executed exactly as written.

The `buildFirstRunCue` gate was still using the inline try/catch (Plan 01 added `firstRunSeen` to `maestro-logic.js` but did not swap the call site). This task performed that swap as specified in the plan interfaces block.

## Self-Check: PASSED

- FOUND: assets/maestro.js
- FOUND: assets/maestro.css
- FOUND: tests/e2e/editor.spec.ts
- FOUND: .planning/phases/09-editor-ux-polish/09-03-SUMMARY.md
- FOUND: commit baea0e1 (feat Task 1)
- FOUND: commit de588e9 (test Task 2)
