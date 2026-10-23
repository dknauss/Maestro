# Real touch-device acceptance — Phases 27–29

**Status: outstanding.** Use actual hardware; desktop emulation and automated
browser results do not complete these checks. Dan reported testing was underway
on 2026-10-23, but has not supplied device details or item-level results yet.
Retain the accepted desktop checks in the three phase verification records.

Record tester, date, Maestro commit/version, device, OS/browser versions, admin
language, Keel version (if active), and portrait/landscape results. Note any
unavailable desktop-only control as not applicable, rather than a pass.

- [ ] **Toolbar:** open the responsive menu, enter edit mode, and tap each
  control. Check wrapping, tap targets and accidental menu dismissal in both
  orientations.
- [ ] **Dialogs and popovers:** use Menu settings, Visibility, the icon picker
  and Visibility groups (called Hiding profiles on older builds). Scroll long
  content; controls remain reachable and background scrolling does not steal
  the interaction. Dismiss and reopen without losing the menu.
- [ ] **Group editing:** create a group, search for people, add/remove members,
  rename and assign the group to an item, then reload. Check that the on-screen
  keyboard does not obscure inputs or required actions. Check deletion and its
  confirmation.
- [ ] **Role controls:** select and clear All other roles in both role groups;
  partial selections show mixed state and locked rows retain their behavior.
- [ ] **Tour:** Next, Back, Skip and Done work at narrow widths; coachmarks stay
  on screen and skip unavailable controls in both directions.
- [ ] **Arabic/RTL:** repeat key toolbar, dialog and group interactions in an
  actual Arabic admin. Check alignment, English fallback punctuation and tour
  counters.
- [ ] **Width controls where available:** drag the edge handle and use the
  slider/number field. The edge handle is not expected below 961 CSS pixels.
  With real Keel, change width during edit mode, including shrinking to Leave
  unchanged; submenu, content and toolbar alignment survives save/reload.

For a failure, record the steps, expected/actual result and a screenshot or
recording where useful. Do not mark acceptance from “testing underway.” Record
confirmed results here and reconcile the relevant phase checklist:

- [Phase 27](phases/27-cloned-role-hiding-profiles/27-VERIFICATION.md)
- [Phase 28](phases/28-configurable-admin-menu-width/28-VERIFICATION.md)
- [Phase 29](phases/29-select-all-role-control/29-VERIFICATION.md)
