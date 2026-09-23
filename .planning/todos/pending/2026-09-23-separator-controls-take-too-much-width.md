---
created: 2026-09-23T00:00:00.000Z
title: The separator controls' text labels take too much toolbar width
area: editor-ux
files:
  - assets/maestro.js (buildToolbar(), ~line 826 — addSepBtn / removeSepBtn)
  - assets/maestro.css (~line 268 — the list of icon-only panel buttons)
---

## Problem

Raised by Dan after 1.6.0 shipped. "Add separator below" and "Remove
separator" show their text, so they are the widest controls in a toolbar that is
otherwise icon-only. That goes against the minimal toolbar the rest of the
editor keeps.

## Why they show text

Both are built with `iconButton()`, the same helper as ▲/▼, Icon, Visibility and
Reset Item, so they already have a glyph, an `aria-label` and a `title` tooltip.
They are just missing from the CSS list that hides `.maestro-btn-label` on the
icon-only buttons (`maestro.css` ~line 268). The text may have been left on
because the glyphs alone are ambiguous: `dashicons-minus` does not say
"separator", and `dashicons-trash` beside the item controls reads as "delete this
menu item".

## Options, least change first

1. **Icon-only, as the other buttons.** Add both to the icon-only list.
   Accessible names and tooltips are already there. Only one of the two is ever
   visible (Add for an item, Remove for a separator), so they never compete.
2. **Plus clearer glyphs.** Add: a glyph that reads as a rule, e.g.
   `dashicons-editor-insertmore` (a dashed line, core's own "insert break"
   icon), or a small inline SVG of a rule with a plus. Remove: keep the trash
   glyph, which is unambiguous there because it only appears while a separator
   is selected.
3. **Short visible label only where there is room.** Icon-only by default,
   with the label shown above a toolbar width where it costs nothing.
4. **Move separator actions off the toolbar.** Offer "Add separator below"
   only in a secondary place (an overflow ⋯ menu or a context menu on the row).
   The cleanest toolbar, but less discoverable, and a new UI pattern for one
   action.

**Recommendation:** 1 with 2's Add glyph. It matches the existing toolbar
pattern and changes no behaviour. It also pairs with the separator edge-case
todo (2026-09-22): Enter on a separator lands focus on Remove, so check that the
icon-only Remove still announces clearly what it removes.

## Check when doing it

- axe: the icon-only buttons keep their accessible name (the release-review
  axe run in `toolbar-dark-surface.spec.ts` style).
- The tooltip text is the full label.
- Recapture screenshot 1 (it shows "Add separator below" in the toolbar).
