# Phase 29 — Select-All Role Control · Summary

**Date:** 2026-10-23
**Requirement:** UX-14 ([#214](https://github.com/dknauss/Maestro/issues/214))
**Status:** built (29-01 and 29-02 in one PR). Human check open in
[29-VERIFICATION.md](29-VERIFICATION.md). D3, a tri-state checkbox labelled
"All other roles", was confirmed by Dan on 2026-10-23.

## 29-01 — helpers and payload

- `assets/maestro-logic.js` gains three pure helpers, written test first
  (`tests/js/select-all-roles.test.mjs`, 15 tests, red before the code):
  - `selectAllRoleTargets( roleKeys, ownRoles, isLocked )`: every role except
    the editing user's own and except locked rows, in display order;
  - `selectAllState( set, targets )`: `none`, `some` or `all`, counting only
    targets, so a hand-ticked own role does not make the state "some";
  - `applySelectAll( set, targets, on )`: ticks or clears the targets and
    keeps every other entry (own roles, stored locked roles). It never
    mutates its input.
- `Assets::enqueue()` sends `userRoles`, the editing user's roles on this
  site (the shared seam the roadmap names for Phase 30 too). It is empty for
  a multisite super admin with no role on the site, who then gets every role
  as a target, which is correct because role rules cannot hide anything from
  a user with no role.

## 29-02 — the control

`buildRoleGroup()` builds it, so both role groups get it and the person and
profile groups do not (they use other builders).

- A native checkbox row above the roles, set off by a rule. The visible
  label is "All other roles" and, when the user holds a listed role, a muted
  "(not Administrator)" that names what it leaves alone.
- **Name:** `aria-labelledby` points at the group heading and the label, so it
  reads "Hide this item from: All other roles" and "Hide its sub-items from:
  All other roles". The "(not …)" note is its description.
- **State** follows the rows: checked when every target is ticked, the native
  `indeterminate` flag (read as "mixed") when some are, clear when none.
  Core styles no mixed checkbox, so `maestro.css` draws it as the block
  editor does: the admin theme colour with a white bar.
- **Activation:** from clear or mixed it ticks every target; from checked it
  clears them. One `setSet()` call and one autosave. The group's `refresh()`
  re-derives the rows, the other group's locks follow through the existing
  `onToggle`, and `wp.a11y.speak()` announces "Hide this item from: every
  other role is now ticked." (or "cleared").
- **Locked rows** in "Hide its sub-items from:" are not targets, so the
  control never writes them and never clears a stored entry for them. A
  locked row stays checked and `aria-disabled`.
- **Shown only when it would tick two or more roles.** Locks can change that
  while the popover is open, so `refresh()` re-checks it.
- A single row toggle refreshes the control's state as well.

## Tests

- JS: 138/138 (123 before plus the 15 new).
- `tests/e2e/specs/select-all-roles.spec.ts`, 3 tests:
  - one activation stores every role the admin does not hold, in exactly
    one save; the admin keeps Posts after a reload while an editor's own
    session loses it; unticking Editor shows the mixed state; one
    activation from mixed ticks them all; a second activation clears them in
    one save and the editor sees Posts again. Both announcements are checked
    by recording `wp.a11y.speak()`, because the "Saved" status speaks into the
    same live region straight after;
  - in the sub-items list, with Editor locked by the parent's own hide, the
    control stores Author, Contributor and Subscriber but not Editor or
    Administrator, leaves `hidden_roles` as `['editor']`, and the locked row
    stays checked and `aria-disabled` through tick and clear;
  - the person groups have no select-all.
- Local full e2e (WordPress 7.1.3 + SQLite): 115 passed, 28 skipped, 1
  failed, the known sandbox-only console-error check in
  `shared-slug.spec.ts`, which fails the same way on main.
- Unit 221/221 (540), phpcs and PHPStan clean, doc links clean.

## Checked by eye

At 1280×900 with Editor ticked in the first group and Author in the second,
both "All other roles" rows show the mixed bar, and the locked Editor row in
the second group stays greyed and checked.


## Review follow-up — server role limit

Before this fix the bulk control could select 59 roles while the server stored
only 50. Bulk selection now refuses the whole change with an inline,
programmatically described and spoken limit message when the proposed set
exceeds the server-provided cap. Existing selections remain intact; clearing
is still allowed. No role limit or privacy gate on the server was widened.

Four JS tests and two save/reload browser cases cover overflow in both role
groups and the exact 50-role boundary. The overflow unit cases and browser
refusal assertion failed before the fix. Real touch-device testing remains
outstanding, as do the recorded human acceptance checks.

Follow-up verification: JavaScript 142/142 (19 select-all helper cases), PHP unit
221/221 (540 assertions), integration 202 total on single-site (14 expected
skips) and multisite (1 expected skip), targeted Playwright 6/6 including auth
setup. WPCS, PHPStan, JS syntax, doc links, whitespace and runtime ZIP pass.
