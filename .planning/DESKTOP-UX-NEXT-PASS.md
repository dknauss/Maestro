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
