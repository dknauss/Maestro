---
created: 2026-08-18T00:00:00.000Z
title: On a narrow viewport, entering edit mode does not open the admin menu
area: editor-ux
files:
  - assets/maestro.js (forceUnfold() ~line 197 — handles the DESKTOP fold only)
  - includes/class-assets.php (~line 55 — the UX-08a comment that deliberately keeps the toggle reachable at <=782px)
  - .planning/compat/WP-7.1-COMPAT.md (WP71-05 — the same invariant, opposite answer)
---

## Problem

Below WordPress's 782px breakpoint the admin menu is off-canvas, opened by
`#wp-admin-bar-menu-toggle`. Maestro's **Edit Menu** toggle is deliberately kept
visible at that width — `class-assets.php` says so explicitly, and loads
`maestro-admin-bar.css` on every admin page for exactly that reason (UX-08a,
Phase 11).

**But entering edit mode there does not open the menu.** You get the edit-mode
toolbar and no menu to edit.

On a wide screen the equivalent state works: a *folded* menu is forced open on
entry. So the same action has two different outcomes depending on viewport width,
and the narrow one is the broken half.

Reported by Dan 2026-08-18 from use, not from a test.

## Cause

`forceUnfold()` (`assets/maestro.js:197`) removes the `folded` and `auto-fold`
body classes and neuters `#collapse-menu`. Those are the **desktop** fold
mechanism. The responsive off-canvas menu is a different mechanism entirely, and
`maestro.js` contains **no `782`, no `menu-toggle`, no `matchMedia`** — nothing
that knows the narrow layout exists.

So this is not a regression. The mobile entry point was made reachable (UX-08a)
without a corresponding step to make the menu visible once you arrive.

## Why this is worth fixing rather than removing

It is the third instance of one invariant, recorded in `WP-7.1-COMPAT.md` under
WP71-05:

> The toggle should only appear where edit mode can actually deliver an editable
> menu, without cost.

The other two instances resolve by **removing** the entry point — the fullscreen
editors (WP71-01, fixed in #156) and the Post Editor (WP71-05, proposed). This
one resolves the other way, and the difference is real:

- There, the model does not exist: `get_menu_model()` needs an admin page render,
  and the editor screens either have no visible menu or would cost a reload
  through unsaved content.
- **Here the page has already rendered in edit mode.** The model is localized, the
  menu markup is in the DOM — it is merely off-canvas. Making it visible is a
  client-side concern with nothing architectural behind it.

Removing the mobile toggle would also undo a deliberate Phase 11 decision and the
always-loaded stylesheet that exists to serve it.

## Shape of the fix

On entering edit mode below the breakpoint, open the off-canvas menu — the same
state `#wp-admin-bar-menu-toggle` produces — instead of (or alongside) the
desktop-only `forceUnfold()`.

Care needed:

- **Do not hardcode 782.** Detect the state, or match core's own breakpoint
  variable, so this does not drift when core moves it.
- **Do not neuter the mobile toggle** the way `forceUnfold()` neuters
  `#collapse-menu`. That capture-phase `preventDefault()` is already logged as a
  defect in its own right
  ([[2026-08-10-toolbar-height-and-collapse-menu-parity]]) — do not add a second
  instance of the same mistake on a narrower screen where the menu is *more*
  expensive to keep open.
- The edit-mode toolbar is `position: fixed`; with the menu open on a small
  screen, check they do not fight for the viewport.
- Coordinate with **Phase 28** (menu width + fold honesty). Phase 28 owns fold
  behaviour and this is the responsive sibling of the same question — the width
  work explicitly must respect the `<782px` breakpoint, so the two should be
  designed together rather than sequentially.

## Not verified

Written from source reading, not from a device or an emulated viewport. The
absence of any breakpoint handling in `maestro.js` is verified; the exact class
or control core uses to open the off-canvas menu is **not** — confirm against a
running 782px viewport before implementing, and confirm whether 7.1 changed it
(#65250 touched collapsed-menu behaviour).
