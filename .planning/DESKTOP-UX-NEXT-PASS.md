# Contextual selected-row controls — later pass

Status: proposed follow-up; not implemented or accepted by this desktop cleanup.

Keep global actions in the toolbar: Visibility groups, Preview as, Menu width,
tour help and the labelled desktop Reset All action. Preserve its confirmation.

Prototype selected-item controls beside the selected menu row in edit mode:

- Rename through an explicit pencil action or F2, with a labelled input and
  Enter/Escape handling. Retain text-only menu labels outside that action.
- Place Move up/Move down beside the row, respecting the RTL inline direction.
- Make its icon an accessible, touch-sized Change icon button while selected.
- Compare a contextual strip for Visibility, Reset item and separator actions
  against the remaining toolbar panel before choosing their final placement.

Do not widen the stored menu automatically to accommodate controls. Test at
160px and wider widths, with Keel live-width changes, long labels, keyboard-only
navigation, screen readers, RTL, submenu rows and responsive menu transitions.
Separate click-to-edit from drag initiation so renaming does not reorder a row.

Acceptance requires desktop review of a working prototype, then a new real
touch-device pass. Existing iPhone findings remain recorded in the touch-device
checklist; automated viewport tests do not close touch acceptance.

## Prototype (draft, opt-in)

A first working prototype covers rename, move and icon only. Turn it on with
`?maestro_rows=1` on any edit-mode URL (remembered in that browser) and off
again with `?maestro_rows=0`. Without the flag the shipped toolbar flow is
unchanged. Visibility, Reset item and the separator actions stay in the
toolbar; separators keep all their toolbar controls.

- **Rename** uses a pencil in a strip under the selected row, Enter on the
  already-selected row, or F2. A field covers the label in place; Enter and
  blur commit, Escape cancels, and the keyboard paths return focus to the
  pencil. Enter is the primary keyboard path because F2 needs fn on most Mac
  keyboards.
- **Move up/down** sit in the same strip. Focus stays on the pressed arrow
  after the row moves, so presses chain.
- **Change icon** is a button over the selected row's own icon column. The
  first click on any row only selects it; the icon becomes a button only on the
  selected row. The controls are children of the `<li>`, not of its link, and
  are `<button>`s, so they neither navigate nor start a sortable drag.
- **Focus** stays on the row after selection (nothing jumps to the toolbar, and
  a phone tap no longer raises the keyboard). Tab order is row, Change icon,
  Rename, Move up, Move down, then the submenu. Selection is announced.
- **Sizes**: 32px targets with a fine pointer, 44px with a coarse one; the
  phone icon target grows its hit area to 44px without growing the frame. At
  160px the three buttons fit; the strip wraps rather than widening the menu.
- **Folded menu**: edit mode already unfolds the menu from 783px up
  (`forceUnfold()`), so there is no folded state to design for while editing.
- **Phones**: the controls live inside `#adminmenu`, hence inside
  `#adminmenuwrap`, so core never treats a tap on them as an outside click.
- **Tour**: with the flag on, the rename, move and icon tips point at the row
  controls instead of the toolbar, without changing the step count.

Still open: whether Visibility, Reset item and separator actions follow onto
the row or into an overflow; real screen-reader passes (VoiceOver, NVDA); a
real touch-device pass; and whether the toolbar should keep a fallback rename
field for very long labels.
