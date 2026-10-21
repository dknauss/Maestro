---
created: 2026-08-09T00:00:00.000Z
title: Configurable admin-menu width (V2-09)
area: editor-ux
files:
  - includes/class-config.php (a global `menu_width`, sibling to items/top_order/sub_order — NOT a per-item key)
  - includes/class-assets.php (would need a menu rule OUTSIDE edit mode; only maestro-admin-bar.css loads there today)
  - assets/maestro-admin-bar.css (the only always-loaded stylesheet today — the natural home or the model for a new one)
---

## Problem

WordPress hard-codes the admin sidebar at 160px. Renaming an item to something
longer — which Maestro exists to let people do — makes it wrap. The plugin
therefore creates the problem it cannot solve.

Extracted from `SPEC.md` Roadmap item 9 / `PROJECT.md`'s V2 paragraph during the
2026-08-09 backlog reconciliation. It had never been schedulable: it existed as
one clause in a long prose sentence.

## Shape

A global `menu_width` in the stored config, applied on **every admin page** via
the same `#adminmenu` / `#wpcontent` rules the folded-mode override already uses.

## What makes this harder than it looks

**It is the first menu styling Maestro would apply outside edit mode.** Every
current asset is edit-mode-gated except `maestro-admin-bar.css`. A width override
has to apply while merely *browsing* wp-admin, so it adds one CSS rule to every
admin page load for every admin user, on sites that set a width. The option read
is not new: `Replay::replay()` already reads `maestro_config` on every admin
request. (Corrected 2026-10-21: this note said the plugin would stop "costing
nothing unless you are editing", which overstated the change.)

Three interactions to get right, none optional:
- **Folded mode** (`.folded`, 36px) must still fold — a fixed width that ignores
  it breaks the collapse control entirely.
  **✅ UNBLOCKED 2026-08-10 — decision made; both this todo and the fold work are now Phase 28.** Formerly blocked: Edit mode currently REFUSES to
  fold: `forceUnfold()` strips the classes, re-strips them via MutationObserver,
  neuters `#collapse-menu` with a capture-phase handler, and `maestro.css` forces
  `width: 160px !important` as a backstop. Ship both features as-is and a site
  with `menu_width: 240` renders 240px while browsing and snaps to 160px the
  instant edit mode opens — the editor showing a different width than the thing
  it is editing. **Settled:** edit mode keeps forcing unfold (a 36px rail cannot show the labels
  being edited), the collapse control becomes visibly disabled instead of
  silently dead, and the three hardcoded `160px` values become the configured
  width. Not a fold-versus-width conflict after all — a hardcoded constant that
  needs to become a variable. Decision recorded in
  `todos/pending/2026-08-10-toolbar-height-and-collapse-menu-parity.md`.
- **The `<782px` responsive breakpoint**, where the menu becomes an overlay
- **`#wpcontent`'s matching offset** — set one without the other and the content
  column overlaps or leaves a gap

## Prior art

"Wider Admin Menu" does exactly this as a standalone plugin, which is worth
reading before designing — and is also the argument for keeping the scope
narrow: the value here is that it is *integrated with the renaming that caused
the problem*, not that it is a better width slider.
