---
created: 2026-10-26T00:00:00.000Z
title: Landscape phone rename — pinned strip (needs a real-device pass)
area: ux
files:
  - assets/maestro.js (renameInSheet, openRenameSheet, pinRenameSheet)
  - .planning/DESKTOP-UX-NEXT-PASS.md (selected-row controls prototype)
---

## Problem

On a small phone held sideways, the keyboard and Safari's form bar leave
about one line of page visible, so renaming a menu row in place was
workable but cramped (Dan, 2026-10-26, iPhone, PR #261).

## Tried and dropped

Scrolling the in-place field to the middle of the visible area felt bad on a
real phone, and it also ran upright. Removed.

## Now in #261

On coarse-pointer landscape screens 500px tall or less, rename moves into a
strip pinned to the bottom of the visual viewport (just above the keyboard
and below a floating form bar): the item's name, a full-width field and
Done. Enter, Done and blur commit; Escape cancels. Upright phones keep the
in-place field. Needs Dan's real-phone check; if the form bar still covers
it, try pinning to the top of the visual viewport instead.
