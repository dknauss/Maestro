---
created: 2026-08-02T00:00:00.000Z
title: Refine derived-locked sub-item checkbox a11y and outside-click focus return
area: editor-ux
files:
  - assets/maestro.js (buildRoleGroup() locked-row refresh() ~lines 1042-1085)
  - assets/maestro.js (placePopover() outside-click handler ~lines 1221-1228)
  - assets/maestro.js (Escape handler ~lines 1142-1146)
---

## Problem

Two minor accessibility refinements surfaced during the Phase 20 sweep in the
visibility popover's derived-locked sub-item checkbox (COMPAT-10). Neither is a
merge blocker; both are a natural fit for Phase 25 (editor a11y / polish).

### M2 — locked-checkbox semantics

In the derived-locked row (`assets/maestro.js` ~lines 1042-1085) the current
`refresh()` implementation:

- sets BOTH the native `disabled` property AND `aria-disabled="true"`. This is
  redundant: when native `disabled` is present, `aria-disabled` is superfluous
  (the platform already exposes the disabled state).
- folds the lock reason ("already hidden via the parent") into the accessible
  NAME (a `screen-reader-text` span appended inside the `<label>`), rather than
  exposing it as a separate description via `aria-describedby`. The reason reads
  more correctly as a description than as part of the control's name.
- because the checkbox is natively `disabled`, it is skipped in screen-reader
  FOCUS mode — it is only encountered in browse/virtual-cursor mode. A user
  tabbing the popover never lands on it and so may never hear the reason.

### M3 — outside-click focus return

The popover's outside-click dismissal (`assets/maestro.js` ~lines 1221-1228, the
`placePopover` document-click handler) calls `pop.remove()` without restoring
focus to the anchor button. Escape DOES restore focus (~lines 1142-1146,
`anchorBtn.focus()`), so outside-click should mirror that for WCAG 2.4.3 (Focus
Order) parity — otherwise focus is silently dropped to `<body>` when the popover
is dismissed by clicking away.

## Recommended fix

- M2: drop native `disabled` on locked rows; keep `aria-disabled="true"`;
  prevent the toggle in the change/click handler for locked rows (so the value
  cannot actually change even though the control is now focusable); move the lock
  reason from the accessible name to `aria-describedby` pointing at the hint
  span. This makes the locked row reachable in SR focus mode and announces the
  reason as a proper description.
- M3: on outside-click dismissal, restore focus to the anchor button, mirroring
  the Escape handler.

Both minor; defer to Phase 25 (editor a11y / polish).
