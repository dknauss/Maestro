---
created: 2026-08-02T00:00:00.000Z
title: Per-request memoization of Slug::normalize() across replay + get_menu_model
area: performance
files:
  - includes/class-replay.php (replay() submenu loop ~lines 196-341 — pre-scan, apply, reorder normalize the same rendered slug 2-3x)
  - includes/class-replay.php (normalized_items() ~lines 452-468 — runs in both replay() and get_menu_model())
  - includes/class-slug.php (Slug::normalize() — pure, memoizable by (raw, base))
---

## Problem

LOW priority, micro-optimization, not user-facing.

Within one edit-mode request the same rendered submenu slug is
`Slug::normalize()`'d 2-3 times (the Axis-2 pre-scan, the apply pass, and the
reorder pass each re-normalize it), and `normalized_items()` runs once in
`replay()` and again in `get_menu_model()` for the same stored config. All of
this is linear and small — normalize is cheap and menus are short — so it is
not a hot path today.

## Recommended fix

Add a per-request memo of `Slug::normalize()` results keyed by `(raw, base)`
(the function is pure), and/or cache the `normalized_items()` result so the
second caller reuses the first's output. Trim only; do NOT bundle this into the
S2 sub_order precompute unless it falls out trivially.

Not a merge blocker; performance polish.
