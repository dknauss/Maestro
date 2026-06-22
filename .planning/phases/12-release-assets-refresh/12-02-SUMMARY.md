---
phase: 12-release-assets-refresh
plan: 02
status: complete
requirements: [REL-08]
completed: 2026-06-22
---

# 12-02 SUMMARY — REL-08 directory screenshots

**Outcome:** Recaptured the WordPress.org directory screenshots against the final
post-Phase-11.2 editor UI. **Final count: 6 screenshots** (was 4 in the original
listing) — this is the number 12-03 must sync the readme captions to.

## What shipped

A new MAESTRO_CAPTURE-gated `tests/e2e/specs/capture-directory-screenshots.spec.ts`
(describe-level `test.skip`, inherits the shared admin storageState, writes each shot to
both `.planning/phases/12-release-assets-refresh/screenshots/` and `.wordpress-org/`),
wired into the `screenshots` npm script. Captured 6 states at 1440×980 (some cropped):

| # | State | Framing |
|---|-------|---------|
| 1 | Editor active, top-level item selected — toolbar + controls panel | full 1440×980 |
| 2 | Icon picker open (Dashicons + Bootstrap tabs) | full 1440×980 |
| 3 | Per-role visibility selector open | cropped to menu + popover + toolbar |
| 4 | Item renamed + transient "Saved" state | cropped to left half (menu + toolbar) |
| 5 | Reorder a top-level **group** — live mid-drag (sortable helper + placeholder) | zoomed crop |
| 6 | Reorder a sub-**item** — ▲/▼ move controls (▼ highlighted) | left-half crop |

All six are ≤210 KB (well under the wp.org 10 MB limit). Each shows the Phase 11.2
icon-only unified toolbar.

## Process notes (interactive visual review)

- Authored by the executor (Task 1: spec + package.json, commit `09a10ef`); the orchestrator
  ran the Docker capture sandbox-disabled and iterated the framing live across the human
  visual-review checkpoint (Task 2).
- **Capture environment:** wp-env tests instance on **port 8899** (port 8889 held by another
  project's wp-env), via `MAESTRO_CAPTURE=1 WP_ENV_TESTS_PORT=8899 npx playwright test …`.
  Required `WP_ENV_TESTS_PORT`-aware global-setup (shipped in 11.2). See
  [[project_maestro_e2e_port_config]].
- **Menu reset between iterations:** repeated capture runs accumulate demo renames/reorders
  in the DB; cleared with `wp option delete maestro_config` on the tests-cli before the final
  run so the captures show a tidy default menu with one intentional rename.
- **Reorder framing (user-directed):** #5 is a live mid-drag of a top-level group; #6 was
  changed from a (confusing) sub-item drag to a sub-item selected with the ▲/▼ move controls
  highlighted — clearer, and shows the OS-independent/accessible reorder path.
- Pre-flight satisfied: Phase 11.2 (PR #50) merged to main, so the captures show the
  redesigned toolbar.

## Verification

- 6 `.wordpress-org/screenshot-*.png` present, each ≤10 MB; same images mirrored in the
  planning review dir.
- Spec is describe-level `test.skip`-gated → a normal `npm run test:e2e` does not regenerate them.
- Human visual review approved the set 2026-06-22.

## Handoff to 12-03

**Screenshot count = 6.** 12-03 must update the `== Screenshots ==` section in `readme.txt`
to exactly 6 captions, in this order, describing the v1.2 UI.
