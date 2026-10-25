# Dialog UI standard

All editor popovers and the guided tour use the shared rules at the end of
`assets/maestro.css`. Avoid per-dialog overrides of control geometry or focus.

- Buttons, text/number/search fields and selects use the 3px
  `--maestro-control-radius` token. Cards keep their own radius; native
  checkboxes and radio buttons keep their native shapes.
- Keyboard focus uses a 2px blue outline with a 2px offset, without a second
  box-shadow ring. Pointer interaction hides button focus rings; the next
  keyboard interaction restores them. Text fields retain visible focus.
- Touch entry keeps focus on Close (or the dialog container when no Close
  exists), so opening a dialog does not open the software keyboard. Close
  targets remain at least 44 by 44 CSS pixels. Never blur focus to hide a ring.
- Use sentence case for headings, labels and actions: “Visibility groups”,
  “Add group”, “Reset all”. Preserve proper names such as WordPress and Dashicons.
- In explanatory text, reproduce a named control's label exactly, for example
  “the menu item's Visibility settings”. Generic uses stay lowercase, as in
  “visibility rules”. Use “people” in visible group membership labels.
- Explain only consequences supported by the current state. Deleting a group
  with no assigned items or no members must not claim to change anyone's menu.
  Other visibility rules may still apply, so never promise restored visibility.
- Keep complete translatable sentences in `includes/class-assets.php`.
  Conditional consequences use separate complete sentences, not word fragments.

Regression coverage: dialog-standard E2E tests cover pointer/keyboard focus and
control radii across dialogs and phone orientations; profile deletion unit tests
cover all combinations of zero/nonzero item and member counts.

Toolbar tools preserve their icon colours on hover, focus and activation; use
background colour for state, with `aria-expanded` tied to the open dialog.
Phone tool groups scroll rather than wrapping beyond two portrait rows or one
short-landscape row; controls keep 44px touch targets.
The coach tips (`?`) launcher is omitted on phones, including short landscape
screens; it remains available on larger screens.

Shared label casing and deletion-message invariants are also enforced in
`tests/js/profile-delete-message.test.mjs`.
Use distinct glyphs for different tools: an eye for Visibility rules, a monitor
for Preview as, and a group of people for Visibility groups. Accessible names
remain explicit even when visible labels are hidden.
