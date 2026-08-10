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

## ✅ DECIDED 2026-08-10 — folded into Phase 28

**Keep forcing unfold. Stop lying about it. De-hardcode the width.**

Implementation moves to **Phase 28 (Configurable Admin Menu Width)**; this todo
stays as the decision record and the seed.

**1. Forced unfold is KEPT — it is justified, not incidental.**
A folded menu is a 36px icon rail with hover flyouts. Maestro's model is *click a
row, edit its label*: you cannot rename what you cannot read, and submenu editing
would happen inside a flyout that vanishes when the pointer leaves — hostile for
drag-reorder and text entry. The core value is that editing happens directly on
the menu, which requires the menu to be legible. `docs/archive/FIXES.md` #4
records that the editing UI *broke* in folded mode historically; forcing unfold
was the fix, not an oversight.

**2. The silent swallow is the actual defect, and it goes.**
`#collapse-menu` currently renders, takes focus, and does nothing — a
capture-phase `preventDefault()` + `stopImmediatePropagation()`. Replace with a
VISIBLY disabled control carrying a reason, matching the treatment the
derived-locked checkbox got in Phase 25. A dead control that looks dead is not a
bug; a live-looking one is.

**3. The "conflict" with the width feature was mis-framed — corrected.**
It is not fold-versus-width. `160px` is simply HARDCODED IN THREE PLACES
(`maestro.css:22` width, `:28` margin-left, `:523` the toolbar's `left`), one of
which is the exact constant the width feature makes configurable. That is a
constant needing to become a variable, not a design conflict. Outside edit mode
width applies to the expanded menu and folding works normally; inside edit mode
folding is off, so width simply applies.

**Net effect: this decision UNBLOCKS the width work rather than constraining it.**

## Options considered (rejected)

- **Keep forcing unfold, but say so.** Cheapest. Disable the control visibly
  (`aria-disabled` + a title explaining why, matching the treatment the
  derived-locked checkbox got in Phase 25) instead of silently eating the click.
  A dead control that *looks* dead is not a bug.
- **Allow folding, and adapt.** Editing in a 36px rail needs a different
  affordance — possibly the toolbar becomes the whole editing surface. Much
  larger, but it is the honest answer if people actually want to edit folded.
- **Allow folding and adapt the editor to a 36px rail** — rejected. It is a much
  larger piece of work whose payoff is editing in a mode where the labels being
  edited are invisible. Revisit only if users actually ask for it.
- **Auto-restore on exit — VERIFIED 2026-08-10, no action needed.** The folded
  preference DOES return. `forceUnfold()` only ever runs from `init()`, which is
  reached solely in edit mode, and it strips the class client-side. Leaving edit
  mode is a page navigation, so core re-renders `body.folded` from user meta on
  the next load and the `MutationObserver` dies with the page. Nothing to undo
  and nothing leaks — this option is closed, not open.

## Not urgent

Nothing is broken in the sense of losing data, and the toolbar works. But the
silently-dead control is a small, real papercut on a plugin whose whole pitch is
that editing happens in place with zero ceremony — and the fold decision gates a
feature already in the backlog.


## Verified findings (2026-08-10)

Recorded so the next person does not re-derive them:

1. **The control is inert, not merely overridden.** `forceUnfold()`
   (`assets/maestro.js` ~L197-215) removes `folded`/`auto-fold`, installs a
   `MutationObserver` to re-remove them if `common.js` writes them back, and
   registers a **capture-phase** listener on `#collapse-menu` calling
   `preventDefault()` + `stopImmediatePropagation()`. Nothing downstream ever
   sees the click.
2. **There is a CSS backstop too.** `maestro.css` ~L11-29 forces
   `width: 160px !important` on `#adminmenu`/`#adminmenuwrap`/`#adminmenuback`
   and a matching `margin-left` on `#wpcontent`/`#wpfooter`, for
   `body.maestro-editing.folded` and `.auto-fold`. So even if the class survives
   a frame, the layout holds. Any fold decision has to change BOTH layers.
3. **The user's preference is safe** — see the verified note above.
4. **It is undocumented outside the code.** The behaviour is explained in
   `maestro.js`'s file header (~L13-16) and at the function, but appears nowhere
   in `README.md`, `readme.txt`, or `docs/` — the only other mentions are in
   `docs/archive/FIXES.md`, which is an archived record of a *historical* folded-mode
   bug and actively misleading if found while searching for this one.

   **Open question for whoever takes this:** should a `readme.txt` FAQ entry be
   added NOW, or only once the fold behaviour is settled? Documenting
   "collapse does nothing while editing" as intended, and then changing it,
   costs a second doc edit and a changelog line. Deliberately not added here.

## Why the conflict matters, restated concretely

`configurable-admin-menu-width` stores a global width and applies it on **every**
admin page. Edit mode forces 160px via `!important`. So with both shipped, a
site with `menu_width: 240` would render 240px while browsing and snap to 160px
the moment edit mode opens — the editor showing a different width than the thing
it is editing. That is not a minor inconsistency; it is the editor lying about
its own subject.

Deciding the fold story first is what prevents that.
