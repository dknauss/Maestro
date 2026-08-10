---
created: 2026-08-10T00:00:00.000Z
title: Trim the edit-mode toolbar height, and decide what Collapse menu does while editing
area: editor-ux
files:
  - assets/maestro.css (.maestro-toolbar — padding 10px 16px; .maestro-toolbar .button min-height 36px)
  - assets/maestro.js (~L197-215 forceUnfold — strips .folded/.auto-fold, MutationObserver re-strips, and NEUTERS #collapse-menu)
  - assets/maestro.css (~L11-29 — the defensive folded-mode width:160px !important backstop)
---

## Two things, and the second is the reason to do this

### 1. The toolbar is taller than it needs to be

`.maestro-toolbar` is `padding: 10px 16px` around `min-height: 36px` controls —
roughly 56px of permanently fixed real estate at the bottom of every edit-mode
screen, on a surface whose controls are all icon-only. Trimming it is
straightforward CSS and buys back vertical space on exactly the screens where
the menu being edited is longest.

### 2. `#collapse-menu` is DEAD during edit mode, silently

This is the part worth deciding rather than trimming around.

`forceUnfold()` (`assets/maestro.js` ~L197) does three things on entering edit mode:

1. strips `body.folded` / `body.auto-fold`
2. installs a `MutationObserver` that re-strips them if `common.js` writes them back
3. attaches a **capture-phase** click handler on `#collapse-menu` calling
   `preventDefault()` + `stopImmediatePropagation()`

So the Collapse menu control is not merely overridden — it is **completely
inert**. It still renders, still looks interactive, still takes focus, and does
nothing at all when clicked. `maestro.css` ~L11-29 adds `width: 160px !important`
as a defensive backstop for the same reason.

The intent is sound: you cannot usefully edit a menu you cannot read, and a
folded 36px rail has no room for rename fields or drag handles. The *execution*
is what a user experiences as "collapse is broken in this plugin".

## Why this blocks thinking about menu width

`configurable-admin-menu-width` (V2-09) explicitly has to "respect folded mode".
But edit mode currently **refuses** folded mode outright. Those two positions
cannot both be designed independently — a width feature that honours folding,
sitting next to an edit mode that forcibly unfolds, will produce a config whose
behaviour depends on which screen you are on.

**Decide the fold story first, then design width against it.** Otherwise the
width work inherits an unstated conflict and discovers it late, which is the
pattern this project has already paid for twice (Phase 21's release target,
Phase 25's criterion 1).

## Options for the fold question

- **Keep forcing unfold, but say so.** Cheapest. Disable the control visibly
  (`aria-disabled` + a title explaining why, matching the treatment the
  derived-locked checkbox got in Phase 25) instead of silently eating the click.
  A dead control that *looks* dead is not a bug.
- **Allow folding, and adapt.** Editing in a 36px rail needs a different
  affordance — possibly the toolbar becomes the whole editing surface. Much
  larger, but it is the honest answer if people actually want to edit folded.
- **Auto-restore on exit.** Whatever is chosen, check whether the user's folded
  preference survives leaving edit mode. `forceUnfold()` strips the class; core
  stores the preference in user meta, so it likely returns on reload — but that
  is worth verifying rather than assuming.

## Not urgent

Nothing is broken in the sense of losing data, and the toolbar works. But the
silently-dead control is a small, real papercut on a plugin whose whole pitch is
that editing happens in place with zero ceremony — and the fold decision gates a
feature already in the backlog.
