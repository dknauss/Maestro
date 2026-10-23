# Phase 27 · Plan 04 — Summary

**Date:** 2026-10-23
**Status:** Built. Unit 218/218, JS 120/120, phpcs and PHPStan clean, and
checked by hand in a real browser against a local WordPress 7.1.3 site. The
integration lane, including the new `ReplayMenuModelProfilesTest`, is proved in
CI; the authoring sandbox has no WordPress test library.

## What the editor can do now

- **Hiding profiles dialog**: a toolbar button (a "groups" icon next to
  Settings) opens it. You can add a profile by name, rename it in place, choose
  its people with the same person picker the Visibility popover uses, and
  delete it after a confirmation that says how many items it hides and how
  many people are in it. Every change autosaves.
- **Visibility popover**: two more groups, "Hide this item for profiles:" and,
  on parents with children, "Hide its sub-items for profiles:", with one
  checkbox per profile. A "Manage profiles…" link opens the dialog. When there
  are no profiles yet it says "No profiles yet." in place of the groups.
- Reset Item unassigns the item from every profile. The profiles themselves,
  and their people, are left alone.

## Where the truth lives

The item model axes (`hiddenProfiles`, and `childHiddenProfiles` on top-level
rows) are the client's source of truth for which items a profile hides, exactly
as `hiddenRoles` is. The client never puts profile axes on an item, because the
server ignores them there. On every save `buildConfig()` folds them into
`cfg.profiles` with `buildProfilesPayload()`, in menu order, and
`Config::sanitize()` compiles the map back onto the items (27-02).

- `profiles` is sent only when `D.canPickUsers` is true. Leaving the key out
  keeps the stored map, so an editor who cannot see profiles can never wipe
  them by accident. The server enforces that anyway.
- An empty map deletes every profile, so it is sent only when the editor has
  actually deleted the last one.
- Deleting a profile strips its ID from every model node in one pass, and the
  next save rebuilds the map from the model. Nothing stale is left behind.

## The model (Task 1)

- `get_menu_model()` resolves `hiddenProfiles` and `childHiddenProfiles` per
  top-level node, and `hiddenProfiles` per child, through the **same**
  `resolved_override_list()` and `resolved_child_override_list()` used for the
  role and user axes. A hide naming `upload.php?ver=9` shows on `upload.php`,
  just as replay applies it there.
- `decorate_user_axes()` drops references to profiles that no longer exist,
  matching the deleted-user precedent. For a viewer without `list_users` it
  empties all profile axes.
- `get_editor_profiles()` is the registry: `[{id, name, users: [{id, name}]}]`
  in stored order, built from **one** `get_users()` call across every profile.
  It is empty without `list_users`.
- All reads of the profiles map in Replay go through one `stored_profiles()`
  accessor. The tripwire, now named
  `test_replay_never_resolves_hides_from_the_profiles_map`, asserts that Replay
  never reads `'hides'` or `'child_hides'` and that only the accessor touches
  `['profiles']`.

## Two additions beyond the plan

**1. The localized config no longer carries the profiles map, for anyone.**
`D.config` used to be the raw stored option, so the planned gate on the model
would have been bypassed: names and member IDs would still have reached every
editor through `D.config.profiles`. `Assets::editor_config()` now removes the
map. The compiled item axes stay, since they hold only profile IDs.

**2. Hides for items that are not on screen are carried forward.** The save
is a full replace, and the editor rebuilds each profile's hides from the rows
it renders. Without a carry, a profile hiding a page whose plugin is switched
off for now would lose that hide on the next unrelated edit. Here is how the
carry works:

- `Assets::profile_carry()` (localized as `D.profileCarry`) lists, per profile,
  the stored keys that match no rendered row. It compares **normalized** keys,
  the way replay does.
- A child's bare slug counts as rendered, because a legacy bare key can
  resolve onto it.
- A key that does match a rendered row is left to the model. If it were
  carried as well, unticking it would never stick. A unit test and an
  integration test pin both halves of that rule.
- `buildConfig()` also covers model rows that have no `<li>`. That happens
  when another plugin rewrites the sidebar after it is printed: those rows
  were not walked, but their axes are still current.

The carry is built in Assets, not Replay, so the tripwire keeps meaning what
it says.

## Lessons from earlier phases, applied

- **Shared resolvers.** Covered above. `ReplayMenuModelProfilesTest` checks
  that the item the popover shows ticked is the item replay removes for a
  member.
- **A server-side gate.** The registry, the model axes, the carry list and
  the localized config are all withheld or stripped on the server, and the
  27-02 save gate still applies.
- **No re-inlined predicates.** The marker uses `hasOwnHide()` at every seed
  and toggle site. A new `refreshHiddenMarker()` replaces the two inline
  copies, which had each drifted to cover only roles, or only roles and users.
  The checkboxes call `isProfileAssigned()` and `toggleProfile()`. The dialog
  calls `profileNameProblem()`, `nextProfileId()` and `profileItemCount()`.
- **Detach before the outside click.** `stopPropagation()` is called on
  "Manage profiles…", "Add profile" and "Delete", each of which re-renders or
  replaces the element that was clicked.
- **The person picker** was moved out of `openVisibilityPicker()` to a
  module-level `buildPersonPicker()`. It takes the limit, the limit message,
  the self-warning text and an `onChange` callback as options. The popover's
  two people groups and every profile's member list share it, including its
  `?`/`&` separator handling and the server-side `exclude`.

## Accessibility

- Each profile group is a `role="group"` named by its heading.
- The dialog is `role="dialog"` with `aria-modal`, is labelled by its title
  and described by its intro. It traps Tab, and Escape returns focus to the
  toolbar button (the same keyup ordering as Settings, for core's responsive
  menu).
- The rename and new-name fields have accessible names. A refused name sets
  `aria-invalid` and is explained in a polite live region. A rename that is
  still invalid when you leave the field reverts.
- The delete button is icon-only, so its accessible name says what it deletes
  ("Delete Reduced view") and updates on rename.
- Adding a profile moves focus to its person search. Deleting one moves focus
  to the new-name field. Both are announced.

## The popover-height question

The plan asked for the popover to be checked at a realistic viewport before a
fifth group was accepted. With six groups, Posts at 1280×720 needs 718px of
content. Before this change the popover was anchored by its top edge and could
run past the screen. So:

- The Visibility popover and the profiles dialog now have
  `max-height: calc(100vh - 100px)` and scroll inside themselves.
- `placePopover()` re-anchors those two on resize, through a ResizeObserver,
  so they grow upward from the toolbar. Measured before the fix: once two
  profiles were added, the dialog's top sat at y = −2 and the page scrolled.
  After the fix the top is at y = 138.
- Other popovers keep their fixed place, so filtering icons does not move the
  grid under the pointer.

Inside the popover, assigning items stays in the item's Visibility, which is
where 27-01 put it. Making and filling profiles has its own dialog, so the
popover never lists people per profile. I judged this usable. The remaining
cost is an internal scroll on items with children, at short viewports.

## Verified by hand (local WP 7.1.3 + SQLite, Chromium)

1. As admin, at 1280×720:
   - created "Reduced view" with Enter, picked "Maestro Editor" from the
     search, and checked that a second profile named "reduced VIEW" is
     refused as a duplicate;
   - added "Shop staff";
   - ticked Reduced view on Tools (row marker on) and Shop staff on Posts'
     sub-items;
   - read the save response: `{"p_1":{"name":"Reduced view","users":[2],"hides":["tools.php"]},"p_2":{"name":"Shop staff","child_hides":["edit.php"]}}`.
2. Reloaded: the marker and checkbox state came back from the model.
3. In a second browser context logged in as the editor, Tools was absent.
4. Deleted Reduced view. The confirmation read "Items it hides: 1. People in
   it: 1." The Tools marker cleared, the save dropped p_1 and its compiled
   axis, and the editor's next page load showed Tools again.
5. At 375×667 the dialog sits inside the responsive menu, fits the screen,
   and causes no horizontal scroll.
6. No page errors at any step.

## Verification

- `vendor/bin/phpunit -c phpunit-unit.xml.dist`: 218/218, 537 assertions
  (no unit changes; this plan is model, assets and client code).
- `node --test tests/js/*.mjs`: 120/120. That includes
  `profile-targets.test.mjs` and the `reset-item` shape pin, extended to the
  two profile axes.
- phpcs is clean on `includes/`, and PHPStan is clean.
- `ReplayMenuModelProfilesTest` (7 tests) covers:
  - the model axes and their empty-list convention;
  - agreement between the model and replay for a member;
  - references to missing profiles being omitted;
  - the batched registry;
  - withholding for a viewer without `list_users`;
  - a localized config without the map;
  - a carry list holding exactly the unrendered hides.

  It runs in CI on both lanes.

## For 27-05

- E2E: the hand check above maps step for step onto a spec under
  `tests/e2e/specs/`, including the second user's own session.
- Close ROLE-02's profile half in REQUIREMENTS and update ROADMAP and STATE.
