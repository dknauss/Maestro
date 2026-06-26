---
phase: 09-editor-ux-polish
plan: "01"
subsystem: js-logic
tags: [tdd, pure-helpers, node-test, maestro-logic]
dependency_graph:
  requires: []
  provides: [modeStatusLabel, firstRunSeen, placeholderVisible]
  affects: [09-02, 09-03, 09-04]
tech_stack:
  added: []
  patterns: [red-green-tdd, dual-export-guard, createRequire-interop]
key_files:
  created:
    - tests/js/mode-status.test.mjs
    - tests/js/first-run-gate.test.mjs
    - tests/js/placeholder.test.mjs
  modified:
    - assets/maestro-logic.js
decisions:
  - "modeStatusLabel returns '' for idle (not the persistent 'Edit Mode' label — that is DOM-built in Plan 02)"
  - "firstRunSeen returns true on storage.getItem throws to safely suppress cue when localStorage blocked"
  - "placeholderVisible mirrors commitRename raw.trim()==='' rule verbatim as the single source of truth"
  - "All three helpers added to the single existing api object — no new export guard, no new module"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-19"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
---

# Phase 9 Plan 01: TDD Seam — Pure Logic Helpers Summary

**One-liner:** Three pure JS helpers (modeStatusLabel, firstRunSeen, placeholderVisible) added to maestro-logic.js via red-green TDD, providing the behavioral seam that Plans 02–04 consume.

## What Was Built

The Phase 9 Wave 0 TDD seam: three pure helpers extending `assets/maestro-logic.js` via its existing dual-export guard. Each was written test-first (RED failing commit, then GREEN implementation commit), following the red→green discipline from the global CLAUDE.md and the plan's `tdd_seam_decision`.

### modeStatusLabel(state, strings)

Maps a transient save-state string to display text for the save-status element. Returns `strings.saving`, `strings.saved`, or `strings.saveError` for those states; returns `''` for `'idle'` and any unknown state so the element stays empty. The persistent "Edit Mode" mode indicator is DOM-built in Plan 02, not here.

### firstRunSeen(storage)

Reads `'maestroFirstRunDone'` from an injected localStorage-like stub. Returns `true` (suppress cue) when `storage.getItem` throws — guarding against blocked/unavailable storage without showing the first-run cue on every load.

### placeholderVisible(value)

Returns `value.trim() === ''`. Mirrors `commitRename`'s trim rule verbatim, pinning the "whitespace-only counts as empty" contract so Plans 02–04 have a single authoritative check.

## Test Results

| Suite | Tests | Pass | Fail |
|-------|-------|------|------|
| mode-status.test.mjs | 5 | 5 | 0 |
| first-run-gate.test.mjs | 4 | 4 | 0 |
| placeholder.test.mjs | 3 | 3 | 0 |
| Phase 6 suites (unregressed) | 44 | 44 | 0 |
| **npm run test:js (total)** | **56** | **56** | **0** |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 2bd1295 | test (RED) | Failing tests for modeStatusLabel — 5/5 fail before implementation |
| cf38cab | feat (GREEN) | modeStatusLabel implementation — 5/5 pass |
| dd7b333 | test (RED) | Failing tests for firstRunSeen + placeholderVisible — 7/7 fail |
| dc032b6 | feat (GREEN) | firstRunSeen + placeholderVisible implementations — 7/7 pass |

## Deviations from Plan

None — plan executed exactly as written. No pre-commit hook was active, so proper separate `test:` (RED) and `feat:` (GREEN) commits were used (the preferred path over the fallback combined GREEN commit).

## Self-Check: PASSED

- tests/js/mode-status.test.mjs — FOUND
- tests/js/first-run-gate.test.mjs — FOUND
- tests/js/placeholder.test.mjs — FOUND
- commit 2bd1295 — FOUND
- commit cf38cab — FOUND
- commit dd7b333 — FOUND
- commit dc032b6 — FOUND
