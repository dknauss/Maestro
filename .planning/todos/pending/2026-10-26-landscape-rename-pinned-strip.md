---
created: 2026-10-26T00:00:00.000Z
title: Landscape phone rename — pinned strip fallback
area: ux
files:
  - assets/maestro.js (startInlineRename, keepRenameInView)
  - .planning/DESKTOP-UX-NEXT-PASS.md (selected-row controls prototype)
---

## Problem

On a small phone held sideways, the keyboard and Safari's form bar leave
about one line of page visible, so renaming a menu row in place is workable
but cramped (Dan, 2026-10-26, iPhone, PR #261).

## Shipped first

`keepRenameInView()` scrolls the in-place field to the middle of the visible
area on short visual viewports (360px or less), once on focus and again as the
keyboard settles.

## Fallback, only if that still feels bad on a real phone

On short touch screens, open rename in a strip pinned to the top of the
visual viewport: one full-width field plus Done, committing and cancelling
like the in-place field (Enter/Done/blur commit, Escape cancels). More reliable,
but a different pattern from the rest of the editor, so try it only after a
real-device pass on the scroll fix.
