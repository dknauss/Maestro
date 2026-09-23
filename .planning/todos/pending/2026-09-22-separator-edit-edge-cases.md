# Separator editing: four edge cases found in the v1.6.0 release review

**Raised:** 2026-09-22, by the pre-release correctness review of `v1.5.4..main`
(separators shipped in #197). None loses data and none blocked the release;
each was confirmed by reading or by running `carrySeparators` in node.

## 1. Enter can remove a separator by accident

Clicking a separator, or selecting it with Enter, moves focus to **Remove
separator** (`assets/maestro.js`, the separator branch of `populatePanel`). A
second Enter removes it, with no confirmation and no undo. A removed *core*
separator (a `removed_separators` entry) only comes back with Reset All.

Likely fix: focus the panel's ▲ button, or the row itself, rather than Remove;
or offer a way to restore a removed core separator.

## 2. Removing a separator can reveal a hidden one in the same place

When two separators end up adjacent, core drops the second on render, but the
editor keeps its stored position. Remove the visible one and `carrySeparators`
walks back past it and places the hidden one there. After reload a separator is
still in the same spot, so Remove looks like it did nothing; a second Remove
works.

## 3. A separator can be moved where core will drop it

The Add action is guarded by `canAddSeparatorBelow` (never directly above
another separator, never below the last item). Drag and Alt+Arrow have no
equivalent, so a separator moved to the bottom or next to another one vanishes
on reload yet stays in the config, where it can be neither seen nor removed
except with Reset All.

Likely fix: apply the same rule on move, or render such a separator in edit
mode with a "hidden by WordPress" style so it can still be selected.

## 4. Separator rule is nearly invisible on light admin colour schemes

The dashed rule in edit mode is a fixed `rgba(240,246,252,.35)` (see the
`li.maestro-separator .separator` rule in `assets/maestro.css`), which almost
disappears on the "Light" scheme's `#e5e5e5` menu. The selected state (blue
box-shadow) still shows.
