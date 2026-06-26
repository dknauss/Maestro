---
phase: 12-release-assets-refresh
plan: "01"
subsystem: ui
tags: [pillow, inkscape, banner, wordpress-org, assets]

# Dependency graph
requires:
  - phase: 12-release-assets-refresh
    provides: build_final.py pipeline (REL-06) and banner source SVG layout
provides:
  - Balanced wp.org banner where wordmark, subtitle, tagline, and gold rule share the same horizontal measure
  - Regenerated banner-772x250.png (772x250, 101 KB) and banner-1544x500.png (1544x500, 230 KB)
  - build_final.py tagline auto-fit constrained to ww (wordmark width) not maxw (full column)
affects: [12-02, 12-03, release-cut]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "VARIANT_SUFFIX env var for non-destructive staging before live asset overwrite"
    - "Human visual-review checkpoint gate before overwriting live wp.org assets"

key-files:
  created: []
  modified:
    - .wordpress-org/source/build_final.py
    - .wordpress-org/banner-772x250.png
    - .wordpress-org/banner-1544x500.png

key-decisions:
  - "Tagline auto-fit loop uses >ww (wordmark width) not >maxw (full column width); subtitle and gold rule were already keyed to ww"
  - "Full tagline string retained: 'Orchestrate your menu in place, inside the dashboard.' — no shortened fallback needed; ww constraint produced legible font size"
  - "Live assets overwritten only after explicit human visual review of VARIANT_SUFFIX=-v2 staged variants"

patterns-established:
  - "VARIANT_SUFFIX staging pattern: always stage -v2 first, review, then overwrite live; never run npm run assets:banners unsuffixed before review"

requirements-completed: [REL-07]

# Metrics
duration: ~20min (split across two sessions with human-verify checkpoint)
completed: 2026-06-22
---

# Phase 12 Plan 01: Release Assets Refresh — Banner Balance Summary

**Tagline auto-fit in build_final.py constrained to wordmark width (ww), balancing all four banner elements to a common horizontal measure; human-approved and regenerated live at exact wp.org dimensions**

## Performance

- **Duration:** ~20 min (Task 1 in session 1; Task 2 post-checkpoint in session 2)
- **Started:** 2026-06-22T18:00:00Z
- **Completed:** 2026-06-22T18:35:21Z
- **Tasks:** 2 (1 auto + 1 checkpoint:human-verify)
- **Files modified:** 3

## Accomplishments

- Changed tagline auto-fit loop in `build_final.py` from `>maxw` to `>ww`, so the tagline shrinks to the MAESTRO wordmark width rather than the full text column
- Staged `-v2` comparison variants non-destructively via `VARIANT_SUFFIX=-v2 npm run assets:banners`, confirmed dimensions (772x250 and 1544x500) before any live overwrite
- Human visually reviewed and approved the balanced design (wordmark, "THE INLINE ADMIN MENU EDITOR" subtitle, tagline, and gold underline rule all ending at approximately the same right edge)
- Regenerated live banners after approval; removed all `-v2` staging variants; verified exact dimensions and <=4 MB (101 KB / 230 KB)

## Task Commits

1. **Task 1: Constrain tagline auto-fit to wordmark width + stage -v2 variant** - `52a06a3` (fix)
2. **Task 2: Overwrite live banners, clean staging** - `5a73570` (feat)

## Files Created/Modified

- `.wordpress-org/source/build_final.py` - Tagline loop condition changed from `>maxw` to `>ww` (line 140)
- `.wordpress-org/banner-772x250.png` - Live standard banner regenerated; 772x250, 101 KB
- `.wordpress-org/banner-1544x500.png` - Live retina banner regenerated; 1544x500, 230 KB

## Decisions Made

- **Tagline string unchanged:** Full tagline "Orchestrate your menu in place, inside the dashboard." (54 chars) was retained. The `ww` constraint produced a legible font size — the shortened-tagline fallback from the plan was not needed.
- **ww is dynamic, not hardcoded:** `ww` is derived from `word.size[0]` at render time (the rendered MAESTRO wordmark pixel width), so tagline, subtitle, and gold rule all track together if the wordmark font or size ever changes.
- **Live overwrite only post-review:** Staging via `VARIANT_SUFFIX` and the human-verify checkpoint ensured the live `.wordpress-org/banner-*.png` were never overwritten speculatively.

## Deviations from Plan

None — plan executed exactly as written. The shortened-tagline fallback (Pitfall 1) was not triggered; the ww constraint produced a balanced, readable layout.

## Issues Encountered

None. `npm run assets:banners` ran cleanly in both the staging and live-overwrite runs. Dimension and size verification passed immediately.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- REL-07 banner design goal met; live wp.org banner assets updated on the release branch
- Ready for Phase 12 Plan 02 (REL-08 screenshot refresh) and Plan 03 (readme/caption sync)
- No blockers

---
*Phase: 12-release-assets-refresh*
*Completed: 2026-06-22*
