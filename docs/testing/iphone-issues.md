# iPhone acceptance issues

## 1. Dialog focus, geometry and wording

- Orientation: portrait; landscape not yet reported by Dan.
- Reproduce: open Visibility groups from the toolbar.
- Actual: Close shows a focus border immediately after a tap, its radius differs
  from Add group, and the help text refers to “Visibility controls”.
- Expected: shared button geometry, keyboard-only button focus indicators,
  sentence case, and consistent references to named UI controls.
- Status: fix implemented; awaiting device verification.

## 2. Empty-group deletion claims restored visibility

- Orientation: portrait.
- Reproduce: create a group with no assigned menu items and no members; delete it.
- Actual: confirmation says “Those people will see the items again.”
- Expected: “Delete ‘Group name’? It hides 0 items from 0 people.” Only describe
  removal of visibility rules when both counts are nonzero; never promise that
  overlapping role, person or other group rules will stop hiding the items.
- Status: fix implemented; awaiting device verification.

## 3. Toolbar tool switching and icon colours

- Orientation: portrait; also test landscape.
- Reproduce: open Preview, then tap Visibility groups in the toolbar.
- Actual: Preview remains open; focus styling changes on the toolbar instead.
- Expected: the newly chosen tool replaces the dialog, and only the open tool
  has an active background. Preserve icon colours in hover/focus/active states.
- Cause: the mobile sheet's document capture handler swallowed toolbar clicks.
- Status: fix implemented; awaiting device verification.

## 4. Toolbar wrapping crowds out the menu

- Orientation: portrait and landscape.
- Reproduce: select a menu item; rotate to landscape.
- Actual: three portrait rows or two landscape rows consume the editing area.
- Expected: at most two portrait rows and one short-landscape row, preserving
  44px targets. Tool groups scroll horizontally when needed.
- Status: fix implemented; awaiting device verification.

## 5. Duplicate eye icons for unrelated tools

- Orientation: both; visible in the portrait and landscape reports above.
- Reproduce: select a menu item and compare Visibility with Preview as.
- Actual: both tools use an eye glyph despite performing different actions.
- Expected: retain the eye for Visibility rules; use a monitor with an eye for Preview as,
  with distinct accessible labels and stable icon colours.
- Introduced: role preview in PR #251; retained by PR #260.
- Status: fix implemented; awaiting device verification.
