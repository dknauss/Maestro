---
phase: 12-release-assets-refresh
plan: 03
subsystem: docs
tags: [readme, screenshots, wp.org, assets, release]

requires:
  - phase: 12-release-assets-refresh/12-02
    provides: 6 recaptured .wordpress-org/screenshot-*.png against post-Phase-11.2 UI

provides:
  - readme.txt == Screenshots == section synced to 6 captions (was 4)
  - deterministic asset gate results: banner dims/size + screenshot sizes + caption count verified

affects: [release-cut, wp.org-deploy]

tech-stack:
  added: []
  patterns:
    - "Deterministic asset gate: banner dims + size + screenshot size + caption count == file count, all verifiable without Docker"

key-files:
  created:
    - .planning/phases/12-release-assets-refresh/12-03-GATE-RESULTS.md
  modified:
    - readme.txt

key-decisions:
  - "E2E regression gate deferred to orchestrator: Docker/wp-env required; deterministic gate (banners + screenshot sizes + caption count) runs fully sandbox-OK"
  - "Caption copy reflects v1.2 UX: auto-clearing Saved state, unified icon-only toolbar, sortable group drag, ▲/▼ sub-item move controls"

requirements-completed: [REL-07, REL-08]

duration: 5min
completed: 2026-06-22
---

# Phase 12 Plan 03: Screenshot Caption Sync + Asset Gate Summary

**readme.txt `== Screenshots ==` expanded from 4 to 6 captions matching the recaptured v1.2 set; all deterministic asset gates green (banner dims/size, screenshot sizes, caption count == file count = 6).**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-22T19:31:09Z
- **Completed:** 2026-06-22T19:36:00Z
- **Tasks:** 2
- **Files modified:** 2 (readme.txt, 12-03-GATE-RESULTS.md)

## Accomplishments

- Synced `readme.txt == Screenshots ==` captions to the 6-screenshot set produced in 12-02 — was 4 captions, now 6, each describing the post-Phase-11.2 UI
- Ran and passed the full deterministic asset gate: banner dimensions/sizes (REL-07), screenshot sizes (REL-08), caption count == screenshot file count (6 == 6)
- Flagged the Docker-gated e2e regression run for the orchestrator with the exact command needed

## Task Commits

1. **Task 1: Sync readme.txt Screenshots captions** - `d845209` (docs)
2. **Task 2: Deterministic asset gate results** - `ea46c88` (chore)

**Plan metadata:** (committed with SUMMARY.md below)

## Files Created/Modified

- `readme.txt` — `== Screenshots ==` section updated: 4 captions replaced with 6 v1.2-accurate captions
- `.planning/phases/12-release-assets-refresh/12-03-GATE-RESULTS.md` — deterministic gate pass record with per-asset dimensions and sizes

## Decisions Made

- **E2E gate deferred to orchestrator.** The full `npm run test:e2e` requires Docker/wp-env, which is not available sandbox-mode. The orchestrator must run `WP_ENV_TESTS_PORT=8899 npm run test:e2e` sandbox-disabled to confirm: (a) zero regressions from this assets-only phase, and (b) `capture-directory-screenshots.spec.ts` is SKIPPED (describe-level `test.skip` gate intact — no screenshot churn).
- **Caption copy reflects v1.2 UX changes from Phases 11 and 11.2:** captions mention the icon-only unified toolbar (11.2), the auto-clearing "Saved" transient state (11.1), and the ▲/▼ sub-item move controls (11).

## Deviations from Plan

None — plan executed exactly as written. No code changes; assets and readme captions only.

## Issues Encountered

None.

## E2E Regression Gate (Orchestrator Action Required)

The deterministic asset checks are green. To close the phase, the orchestrator must run the full e2e suite sandbox-disabled:

```
WP_ENV_TESTS_PORT=8899 npm run test:e2e
```

Confirm:
1. Suite is green (zero regressions — this phase touched only readme.txt and planning docs)
2. `capture-directory-screenshots.spec.ts` reports SKIPPED (the describe-level `test.skip` is intact; a normal run must not regenerate or overwrite the committed PNGs)

## Deterministic Gate Results

| Check | Result |
|-------|--------|
| banner-772x250.png — 772x250, ≤4 MB | PASS (99 KB) |
| banner-1544x500.png — 1544x500, ≤4 MB | PASS (225 KB) |
| screenshot-1.png ≤10 MB | PASS (196 KB) |
| screenshot-2.png ≤10 MB | PASS (208 KB) |
| screenshot-3.png ≤10 MB | PASS (36 KB) |
| screenshot-4.png ≤10 MB | PASS (126 KB) |
| screenshot-5.png ≤10 MB | PASS (31 KB) |
| screenshot-6.png ≤10 MB | PASS (127 KB) |
| Caption count == screenshot file count | PASS (6 == 6) |

## Next Phase Readiness

Phase 12 is complete (all three plans done). REL-07 and REL-08 can be flipped to Complete in the v1.2 traceability table. After the orchestrator's e2e gate confirms zero regressions, the 1.2.0 release cut can proceed: tag `v1.2.0` and trigger the `wp-deploy.yml` GitHub Actions workflow.

---
*Phase: 12-release-assets-refresh*
*Completed: 2026-06-22*
