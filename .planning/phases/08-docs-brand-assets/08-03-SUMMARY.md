---
phase: 08-docs-brand-assets
plan: 03
subsystem: infra
tags: [brand-assets, banners, inkscape, pillow, svg, wordpress-org, docs]

# Dependency graph
requires:
  - phase: 04-release-assets
    provides: the shipped banner pipeline (build_final.py) and committed .wordpress-org/banner-*.png
provides:
  - REL-06 mechanism wording reconciled to the actual shipped pipeline (in-code SVG master + Inkscape + Pillow LANCZOS)
  - Verified deterministic regeneration of both banners (byte-identical from committed source)
affects: [08-04, REL-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Banner/icon assets are generated from an in-code SVG master in build_final.py (no standalone .svg), rasterized via Inkscape subprocess, downscaled 2x->1x with Pillow LANCZOS"

key-files:
  created: []
  modified:
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .wordpress-org/source/HOW-TO-REGENERATE.md

key-decisions:
  - "Option-a: record the mechanism substitution (in-code SVG master vs standalone .svg file) as accurate wording on the REL-06 line + roadmap criteria, rather than extracting a net-new standalone .svg master (option-b, out of scope per CONTEXT and would risk deferred banner churn)"

patterns-established:
  - "Doc-reconcile pattern: when a shipped mechanism diverges from a roadmap's literal success criteria but meets its intent, annotate the criteria with the precise substitution + verification date to keep Done status auditable"

requirements-completed: [REL-06]

# Metrics
duration: 2min
completed: 2026-06-17
---

# Phase 8 Plan 03: REL-06 Banner Pipeline Verification & Mechanism Reconciliation Summary

**Verified the shipped banner pipeline regenerates both wp.org banners byte-identically from committed source (Inkscape render + Pillow LANCZOS off an in-code SVG master in build_final.py), then reconciled REL-06 wording in REQUIREMENTS/ROADMAP/HOW-TO to that actual mechanism — zero banner asset churn.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-06-17T16:13:59Z
- **Completed:** 2026-06-17T16:15:27Z
- **Tasks:** 2 auto + 1 decision checkpoint
- **Files modified:** 3 (docs only)

## Accomplishments
- Confirmed `npm run assets:banners` (`OUT_DIR=.wordpress-org python3 .wordpress-org/source/build_final.py`) runs end-to-end with no manual steps on the present toolchain (Inkscape 1.4.4, Python 3.9.6, Pillow 11.3.0).
- Both regenerated banners validated at exact dimensions: `banner-772x250.png` = 772x250, `banner-1544x500.png` = 1544x500.
- **Determinism outcome: byte-identical.** MD5 hashes matched committed assets exactly before and after regen (772x250 = `2acbb37686b3ebcd40e28407f2e5ed75`, 1544x500 = `78ef93533f633e0f7ad8d121b61d8783`); `git diff --stat` showed no change. Icon outputs were also byte-identical (no diff). This is the best-case determinism signal, exceeding the binding criteria (runs with no manual steps + valid PNGs at exact dimensions).
- Reconciled the REL-06 mechanism wording to the actual shipped pipeline across REQUIREMENTS.md, ROADMAP.md, and HOW-TO-REGENERATE.md, keeping REL-06 Done status auditable.
- Zero banner pixels changed; public assets remain byte-stable (committed PNGs restored via `git checkout` as a guardrail — a no-op since regen was byte-identical).

## Task Commits

1. **Task 1: Verify regeneration from committed source** — no commit (regeneration was byte-identical to committed assets; no files changed; outputs restored, working tree clean). Verification: `npm run assets:banners` exit 0; `file` dimension checks passed; MD5 match; `git status` clean.
2. **Task 2: Reconcile REL-06 wording in REQUIREMENTS.md, ROADMAP.md, HOW-TO-REGENERATE.md** - `82d0758` (docs)

_Task 1 is verification-only and TDD-exempt (no business logic) per project rules; the "test" was the deterministic regeneration + dimension check, which passed._

## Files Created/Modified
- `.planning/REQUIREMENTS.md` - REL-06 line reconciled: editable source is the in-code SVG master in `build_final.py` (`banner_svg()`/`icon_svg()` + `P = dict(...)` palette), rasterized via Inkscape then Pillow LANCZOS downscale; byte-identical regen verified this phase; standalone-.svg form replaced by in-code SVG master, intent met.
- `.planning/ROADMAP.md` - Phase 8 REL-06 success criteria #2 and #3 annotated with the same substitution and verified-pipeline note; criterion intent unchanged.
- `.wordpress-org/source/HOW-TO-REGENERATE.md` - Added a blockquote noting the SVG master is generated inside `build_final.py` (no standalone `.svg` to edit; edit the builders + palette).

## Decisions Made
- **Checkpoint (decision): selected option-a** — record the mechanism substitution as accurate wording on the REL-06 line + roadmap criteria. Rationale: the dispatch instructions and plan both framed this as verify + doc-reconcile (NOT a rebuild/redesign), marked option-a recommended, and CONTEXT explicitly defers creating a net-new standalone `.svg` master (option-b) which would risk the deferred banner image work (REL-07). Auto-advance was not active; the decision was unambiguously pre-resolved by the controlling instructions.

## Deviations from Plan

None - plan executed exactly as written.

The CONTEXT.md framing ("Python/Pillow, NOT Inkscape") was already known-incorrect and corrected in the plan's objective; the executed reconciliation uses the accurate framing (BOTH Inkscape and Pillow are used). This was the intended work, not a deviation.

## Issues Encountered
None. The only notable observation is a positive one: regeneration was byte-identical rather than merely visually-equivalent, so the determinism caveat in the plan (allowing for non-byte-identical-but-valid output under the visual-review gate) did not need to be exercised.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- REL-06 mechanism is now accurately recorded and auditable; Done status stands on verified evidence.
- Ready for 08-04 (zero-regression suite + flip DOC-01 Complete + mark Phase 8 done). Note: 08-04 owns the phase-complete status flip; this plan touched only REL-06 mechanism wording, avoiding conflict (wave 1 vs wave 3 sequencing).
- REL-07 (refreshed banner graphic) remains deferred; the verified pipeline is ready to regenerate when that image work is taken up.

## Self-Check: PASSED

- FOUND: .planning/phases/08-docs-brand-assets/08-03-SUMMARY.md
- FOUND: .planning/REQUIREMENTS.md (REL-06 reconciled)
- FOUND: .planning/ROADMAP.md (criteria 2-3 annotated)
- FOUND: .wordpress-org/source/HOW-TO-REGENERATE.md (in-code SVG note)
- FOUND: commit 82d0758 (docs reconciliation)
- VERIFIED: banner PNGs byte-stable (MD5 unchanged from committed; not modified)

---
*Phase: 08-docs-brand-assets*
*Completed: 2026-06-17*
