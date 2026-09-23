---
created: 2026-09-23T00:00:00.000Z
title: On a phone, edit mode hides the first menu row under the admin bar
area: editor-ux
files:
  - assets/maestro.js (forceUnfold(), ~line 200 — strips `folded` and `auto-fold`)
---

## Problem

At 400px wide, with the menu open:

| | Dashboard row top | Row height |
|---|---|---|
| Normal (menu toggled open) | 58px, below the 46px admin bar | ~47px |
| Edit mode | 12px, **under** the admin bar | ~34px |

So in edit mode the first row, Dashboard, sits behind the admin bar and can't be
seen or tapped. The other rows lose core's touch-sized height.

## Cause

`forceUnfold()` removes `auto-fold` from `<body>` so the menu edits in its
expanded form. Core's narrow-screen menu layout (the top offset below the admin
bar and the taller touch rows) is written against `.auto-fold`, so stripping it
drops that layout too. The unfold is only needed at desktop widths, where
`auto-fold` collapses the menu to icons.

Present since at least 2026-06-15 (`95436b8`), so it predates 1.6.0. Found
during the 1.6.0 follow-up while checking the edit-mode submenu padding fix at
narrow widths.

## Likely fix

Keep `auto-fold` below 783px and strip it only where it would fold the menu to
icons (783–960px), or re-supply the offset and row height for edit mode on
narrow screens. Check against the 2026-08-18 todo, which covers opening the menu
on entry at narrow widths.
