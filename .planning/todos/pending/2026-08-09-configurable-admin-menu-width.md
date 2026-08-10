---
created: 2026-08-09T00:00:00.000Z
title: Configurable admin-menu width (V2-09)
area: editor-ux
files:
  - includes/class-config.php (a global `menu_width`, sibling to items/top_order/sub_order — NOT a per-item key)
  - includes/class-assets.php (would need a stylesheet OUTSIDE edit mode, which nothing currently loads)
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

**It is the first thing Maestro would load outside edit mode.** Every current
asset is edit-mode-gated except `maestro-admin-bar.css`. A width override has to
apply while merely *browsing* wp-admin, which changes the plugin's footprint on
every page load for every admin user — worth being deliberate about, since
"costs nothing unless you are editing" is currently true and would stop being.

Three interactions to get right, none optional:
- **Folded mode** (`.folded`, 36px) must still fold — a fixed width that ignores
  it breaks the collapse control entirely
- **The `<782px` responsive breakpoint**, where the menu becomes an overlay
- **`#wpcontent`'s matching offset** — set one without the other and the content
  column overlaps or leaves a gap

## Prior art

"Wider Admin Menu" does exactly this as a standalone plugin, which is worth
reading before designing — and is also the argument for keeping the scope
narrow: the value here is that it is *integrated with the renaming that caused
the problem*, not that it is a better width slider.
