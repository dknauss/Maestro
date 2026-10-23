# Real touch-device acceptance — Phases 27–29

**Status: partial human results recorded; acceptance remains open.** Use actual
hardware; desktop emulation and automated browser results do not complete these
checks. Dan supplied item-level findings on 2026-10-23. Dan identifies the device as iPhone 17 and the tested source as current main
in WordPress Playground, using Safari on iOS 26.6.2 (reported by Dan). Exact
commit and separate Safari version were not captured.
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
- [x] **Role controls (behavior passed; visual exception below):** select and clear All other roles in both role groups;
  partial selections show mixed state and locked rows retain their behavior.
- [ ] **Tour:** Next, Back, Skip and Done work at narrow widths; coachmarks stay
  on screen and skip unavailable controls in both directions.
- [x] **Arabic/RTL:** repeat key toolbar, dialog and group interactions in an
  actual Arabic admin. Check alignment, English fallback punctuation and tour
  counters.
- [ ] **Width controls where available:** drag the edge handle and use the
  slider/number field. The edge handle is not expected below 961 CSS pixels.
  With real Keel, change width during edit mode, including shrinking to Leave
  unchanged; submenu, content and toolbar alignment survives save/reload.

## Dan's reported touch results — 2026-10-23

Dan reports testing current main in WordPress Playground on an iPhone 17,
using Safari on iOS 26.6.2.
The supplied screenshot shows the older Hiding profiles title and introduction;
no exact commit was captured to resolve that wording discrepancy. #250's renamed
UI is not yet merged. Device/software details are Dan's report, not inferred
from the image.

| Area | Reported result | Remaining acceptance |
|---|---|---|
| Toolbar | Responsive menu opens; enter/exit/re-enter works; every control can be tapped. | Wrapping, hard-to-hit targets and accidental dismissal in some cases remain defects/usability findings. |
| Dialogs/popovers | All four open; long content scrolls, controls remain reachable, and the background does not scroll. | Small-screen viewing/manipulation remains difficult. The width-only Settings entry is reported as pointless at phone widths. |
| Visibility groups | Create, search, add/remove people, rename, assign and reload passed. | On-screen keyboard often obscures inputs/actions; keyboard usability remains open. |
| Role controls | Dan passed all five directed role-control checks: both sections, mixed-state behavior, locked-row refusal, unlocking and reload persistence. | The reported off-center dash has a CSS correction with Chromium/WebKit regression coverage. Behavior passed; actual iPhone visual recheck remains open. |
| Tour | Next, Back, Skip and Done work; only three tips appeared. | Investigate step coverage on the tested build, then recheck current build. Three tips is not accepted as complete current-tour coverage. |
| Arabic/RTL | Dan clarified: “It works in Arabic as well as it does in english.” | RTL parity passed on the tested device/build; the shared mobile usability issues still apply. |
| Width | Handle and slider/number field unavailable at the small screen size. | Mark those desktop-only interactions not applicable at this viewport, rather than failed. Real Keel mobile interaction was not tested. |

The screenshot also shows a native delete confirmation with item/person counts;
no completed deletion result is inferred from that image alone. Earlier desktop
acceptance is retained. RTL parity and role-control behavior are passed on Dan's reports. The
mixed-state dash correction still needs a real iPhone visual recheck. Other compound touch
checkboxes remain open until their defects and missing checks are resolved.

## Directed role-control checks

Use an administrator and a parent menu item with children, such as Posts. In
Visibility, “groups” here means the two **role-checkbox sections**, not saved
Visibility groups or the per-person lists. All other roles belongs only to the
role sections.

1. Start with no role selections in either section. In **Hide this item from**,
   select Editor only. All other roles should show the native partial/mixed
   state, not checked-as-all. With VoiceOver/TalkBack it should announce mixed
   and identify the section. Your own Administrator role stays unselected.
2. Tap All other roles: remaining eligible roles become selected. Tap it again:
   those roles clear. Repeat for **Hide its sub-items from**, starting with the
   first section clear so its roles are not locked.
3. For a lock, select Editor in **Hide this item from**. In **Hide its sub-items
   from**, Editor should become checked and unavailable, because hiding the
   parent already removes its subtree. Tap the locked row: it stays checked.
   With a screen reader, check that the reason is understandable.
4. Select/clear All other roles in the sub-items section: unlocked eligible
   roles change; the locked Editor row stays checked. Clear Editor in the first
   section: its child row unlocks and, if you did not independently select it
   in the child section, becomes unchecked. Reload to verify persistence.

For a failure, record the steps, expected/actual result and a screenshot or
recording where useful. Do not mark acceptance from “testing underway.” Record
confirmed results here and reconcile the relevant phase checklist:

- [Phase 27](phases/27-cloned-role-hiding-profiles/27-VERIFICATION.md)
- [Phase 28](phases/28-configurable-admin-menu-width/28-VERIFICATION.md)
- [Phase 29](phases/29-select-all-role-control/29-VERIFICATION.md)

## Role-control follow-up — 2026-10-23

Dan reported “otherwise 1-5 pass” in response to the five directed role-control
steps, with a screenshot showing an off-center dash near the upper-left of the
mixed checkbox. This is a pass for those role-control behaviors, not for items
1–5 of the overall touch checklist. Track the dash alignment as an unresolved
visual defect; do not attribute its cause to Safari or core without reproduction.

## Mixed-state dash correction — 2026-10-23

Reproduced in Chromium and WebKit: fixed offsets designed for a 16px checkbox
left the dash 4.5 CSS pixels off-center when core enlarged mobile checkboxes to
25px. The dash is now centered relative to the actual checkbox with percentage
positioning and a translation, independent of viewport size and direction.

`tests/e2e/mixed-checkbox.spec.ts` measures the painted dash against the painted
checkbox background, without writing config. Sixteen cases passed across
Chromium and WebKit at 375/782/783/1280px in LTR/RTL. The final WebKit regression
fails with the original CSS and passes with the fix. Desktop WebKit automation
is not a real iPhone recheck.

**Actual iPhone visual recheck remains outstanding.** Retain the functional role
pass, RTL parity and earlier desktop sign-off. Toolbar targets/dismissal,
cramped dialogs, keyboard obstruction, tour coverage and the remaining touch
acceptance remain open; this narrowly scoped CSS fix does not resolve them.
