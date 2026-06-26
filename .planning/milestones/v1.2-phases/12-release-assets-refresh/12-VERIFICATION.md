---
phase: 12-release-assets-refresh
verified: 2026-06-22T20:00:00Z
status: human_needed
score: 8/8 automated must-haves verified
human_verification:
  - test: "Open .wordpress-org/banner-772x250.png and banner-1544x500.png and confirm the four elements (MAESTRO wordmark, 'THE INLINE ADMIN MENU EDITOR' subtitle, tagline, gold underline rule) all end at approximately the same right edge."
    expected: "All four horizontal elements share a common right-edge measure; tagline is not uncomfortably small."
    why_human: "Visual balance of the banner design cannot be verified programmatically; it requires viewing the rendered image."
  - test: "Open .wordpress-org/screenshot-1.png through screenshot-6.png and confirm each shows the Phase 11.2 icon-only unified toolbar (gray square buttons, semantic colour, flat save-status indicators, palette glyph, back-arrow Exit) and the Phase 9 'Edit Mode' label."
    expected: "All 6 captures show the final v1.2 post-Phase-11.2 UI, not a pre-11.2 toolbar. Framing is clear and well-composed."
    why_human: "Visual confirmation of which toolbar generation appears in the screenshots cannot be determined from pixel dimensions alone."
---

# Phase 12: Release Assets Refresh — Verification Report

**Phase Goal:** The WordPress.org/GitHub banner is refreshed to the REL-07 design target (the MAESTRO wordmark, subtitle, tagline, and gold underline rule occupy approximately the same horizontal measure) and the directory screenshots are recaptured against the FINAL v1.2 editor UI (which now includes the Phase 11.2 icon-only toolbar), so the live listing reflects what 1.2.0 ships. Assets-only — no plugin code changes.
**Verified:** 2026-06-22T20:00:00Z
**Status:** human_needed (all automated checks passed; visual quality requires human confirmation)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `build_final.py` tagline auto-fit is constrained to `ww` (wordmark width), not `maxw` | VERIFIED | Line 140: `while dr.textlength(tag,font=ftag)>ww and ts>20*S:` — confirmed in source |
| 2 | `banner-772x250.png` is exactly 772x250 and `banner-1544x500.png` is exactly 1544x500 | VERIFIED | PIL confirms `(772, 250)` and `(1544, 500)` |
| 3 | Each banner PNG is under the 4 MB wp.org limit | VERIFIED | banner-772x250.png: 101 KB; banner-1544x500.png: 225 KB |
| 4 | No `banner-*-v2.png` staging files remain | VERIFIED | `glob('.wordpress-org/banner-*-v2.png')` returns empty |
| 5 | Banners regenerated from source (not hand-edited) — `build_final.py` is the change point | VERIFIED | Commits `52a06a3` (fix build_final.py) and `5a73570` (regenerate banners) confirm pipeline-driven output |
| 6 | Exactly 6 `.wordpress-org/screenshot-*.png` exist | VERIFIED | `glob` returns 6 files: screenshot-1.png through screenshot-6.png |
| 7 | Each screenshot is under the 10 MB wp.org limit | VERIFIED | Largest is screenshot-2.png at 208 KB; all well under 10 MB |
| 8 | `capture-directory-screenshots.spec.ts` is describe-level `test.skip`-gated | VERIFIED | `test.skip( !CAPTURE, ...)` at describe level (line ~54); 160 lines total (well above 30-line minimum) |
| 9 | `package.json` `screenshots` script includes `capture-directory-screenshots` | VERIFIED | Line 18: script includes `tests/e2e/specs/capture-directory-screenshots.spec.ts` |
| 10 | `readme.txt` `== Screenshots ==` has exactly 6 captions | VERIFIED | Caption count via regex: 6 numbered items matching the 6 screenshot files |
| 11 | Assets-only — no plugin PHP/CSS/JS source changed in this phase | VERIFIED | Phase 12 commit range (`52a06a3^..ea46c88`) touches only: `build_final.py`, banner PNGs, screenshot PNGs, `capture-directory-screenshots.spec.ts`, `package.json`, `readme.txt`, planning docs |
| 12 | Banners were overwritten only after human visual review (checkpoint gate) | VERIFIED | SUMMARY documents explicit human-verify task; staging `-v2` files confirmed absent post-phase |
| 13 | Screenshots were overwritten only after human visual review (checkpoint gate) | VERIFIED | 12-02-SUMMARY records human visual review approved 2026-06-22 |

**Score:** 13/13 automated truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.wordpress-org/source/build_final.py` | Tagline auto-fit constrained to `ww` | VERIFIED | Line 140 uses `>ww`; `ww` derived dynamically from `word.size[0]` (not hardcoded) |
| `.wordpress-org/banner-772x250.png` | Standard banner, exactly 772x250, <=4 MB | VERIFIED | Dims: (772, 250); Size: 101 KB |
| `.wordpress-org/banner-1544x500.png` | Retina banner, exactly 1544x500, <=4 MB | VERIFIED | Dims: (1544, 500); Size: 225 KB |
| `tests/e2e/specs/capture-directory-screenshots.spec.ts` | MAESTRO_CAPTURE-gated capture spec, describe-level skip, >=30 lines | VERIFIED | 160 lines; `test.skip(!CAPTURE, ...)` at describe level; dual-write via `dualShot()` to both planning dir and `.wordpress-org/` |
| `package.json` `screenshots` script | Includes `capture-directory-screenshots` | VERIFIED | Script line 18 includes the spec filename |
| `.wordpress-org/screenshot-1.png` through `screenshot-6.png` | 6 files, each <=10 MB | VERIFIED | All present; sizes range 31 KB–208 KB |
| `.planning/phases/12-release-assets-refresh/screenshots/` | Review-dir mirror of captured screenshots | VERIFIED | 6 files committed in `f655122` |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `build_final.py` | `banner-772x250.png`, `banner-1544x500.png` | `npm run assets:banners` (Inkscape + Pillow LANCZOS) | WIRED | `package.json` `assets:banners` script exists; commits `52a06a3` → `5a73570` show source change then regenerated output |
| `capture-directory-screenshots.spec.ts` | `.wordpress-org/screenshot-N.png` | `page.screenshot({ path })` in `dualShot()` | WIRED | `dualShot()` calls `page.screenshot` twice — once to `SCREENSHOTS_DIR`, once to `WP_ORG_DIR` |
| `package.json` `screenshots` script | `capture-directory-screenshots.spec.ts` | `MAESTRO_CAPTURE=1 playwright test ...` | WIRED | Script explicitly names the spec file |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| REL-07 | 12-01-PLAN.md | Banner refreshed to balanced design via `build_final.py` pipeline; `banner-*.png` exact dims, <=4 MB | SATISFIED | Checkboxes `[x]` in REQUIREMENTS.md; `requirements-completed: [REL-07]` in 12-01-SUMMARY frontmatter; artifacts verified on disk |
| REL-08 | 12-02-PLAN.md + 12-03-PLAN.md | 6 screenshots against post-11.2 UI; gated capture spec; 6 readme captions | SATISFIED | Checkboxes `[x]` in REQUIREMENTS.md; `requirements-completed: [REL-07, REL-08]` in 12-03-SUMMARY frontmatter; artifacts verified on disk |

**Note:** The REQUIREMENTS.md traceability table prose reads "Pending (folded in from Phase 8)" for both REL-07 and REL-08, but this is stale table text that was not updated when the phase completed. The authoritative signals — the `[x]` checkboxes on the requirement entries and `requirements-completed` in the plan summaries — confirm both are satisfied. The table text is a cosmetic gap, not a functional one.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.planning/REQUIREMENTS.md` | 163–164 | Traceability table still reads "Pending" for REL-07 and REL-08 after phase completion | Info | Cosmetic only — the `[x]` checkboxes and summary frontmatter are the authoritative signals; the table text is display-only and stale |

No blocker anti-patterns found. No stub implementations. No staging files remaining.

---

## E2E Regression Gate (Orchestrator-Confirmed)

Per the prompt: the full e2e regression gate already passed — orchestrator ran it sandbox-disabled: **32 passed / 10 skipped**. The `capture-directory-screenshots.spec.ts` correctly skipped (describe-level `test.skip` gate intact; zero screenshot churn). This satisfies the gating condition from 12-03-SUMMARY.

---

## Human Verification Required

### 1. Banner visual balance (REL-07 design goal)

**Test:** Open `.wordpress-org/banner-772x250.png` and `.wordpress-org/banner-1544x500.png`
**Expected:** The four horizontal elements — MAESTRO wordmark, "THE INLINE ADMIN MENU EDITOR" subtitle, tagline ("Orchestrate your menu in place, inside the dashboard."), and the gold underline rule — all terminate at approximately the same right edge, forming a balanced common measure. The tagline font size is legible, not uncomfortably small.
**Why human:** Visual balance of a design layout cannot be verified programmatically; requires viewing the rendered bitmap.

**Note:** The 12-01 checkpoint documents human approval on 2026-06-22. This item is flagged as `human_needed` for the record; if the orchestrator already approved at the 12-01 checkpoint, no further action is required.

### 2. Screenshot UI generation (REL-08)

**Test:** Open `.wordpress-org/screenshot-1.png` through `screenshot-6.png`
**Expected:** Each capture shows the Phase 11.2 icon-only unified toolbar (gray square buttons, semantic colour glyphs, flat non-clickable save-status indicator, palette icon-picker glyph, back-arrow Exit button). Screenshot 4 shows the transient "Saved" state. Screenshots 5 and 6 show reorder states.
**Why human:** Determining which toolbar generation is depicted requires visual inspection of the pixels; cannot be inferred from file dimensions or size.

**Note:** The 12-02-SUMMARY documents human visual review and approval on 2026-06-22. This item is flagged for the record; if the orchestrator already approved at the 12-02 checkpoint, no further action is required.

---

## Summary

All automated must-haves for REL-07 and REL-08 are verified on disk:

- **REL-07 (Banner):** `build_final.py` tagline loop uses `>ww` (wordmark width) at line 140; both banner PNGs exist at exact wp.org dimensions (772x250, 1544x500) well under 4 MB; no `-v2` staging files remain; banners were regenerated from source not hand-edited.

- **REL-08 (Screenshots):** Exactly 6 `screenshot-*.png` files exist in `.wordpress-org/`, each under 10 MB; `capture-directory-screenshots.spec.ts` is 160 lines, has describe-level `test.skip(!CAPTURE, ...)`, and uses `dualShot()` to write to both the planning review dir and `.wordpress-org/`; `package.json` `screenshots` script includes the spec; `readme.txt` has exactly 6 numbered captions in `== Screenshots ==` matching the 6 files.

- **Assets-only:** The phase 12 commit range touches only the expected files — no plugin PHP, CSS, or JS source was changed.

- **E2E gate:** Orchestrator confirmed 32 passed / 10 skipped with zero screenshot churn.

The two human_needed items (banner visual balance, screenshot UI generation) were both approved at their respective in-phase checkpoints (12-01 and 12-02). If those approvals stand, the phase is fully complete.

---

_Verified: 2026-06-22T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
