---
created: 2026-10-08T00:00:00.000Z
title: "Select all" control for the role visibility checkboxes
area: editor-ux
files:
  - assets/maestro.js (buildRoleGroup(): the shared builder for both role groups)
  - assets/maestro-logic.js (home for a pure "which roles does select-all tick" helper)
  - includes/class-assets.php (enqueue(): `roles` is sent; the current user's roles are not)
  - assets/maestro.css (.maestro-vis-group, .maestro-vis-head)
  - languages/maestro-menu-editor.pot (new strings)
---

## Where it came from

Requested by ChrisL (@chrslcy) in the WordPress.org support thread
"Great plugin! Just a couple of suggestions.." on 2026-10-07: a "Select All"
checkbox or link below the "Hide this item from:" heading and above the role
list, to cut the clicks needed to hide an item from every role but one's own
(typically Administrator). Dan replied in the thread that it is on the
roadmap. This entry makes that true.

## What to build

A single control at the top of each role group that ticks every role the
current user does not hold, and a matching way to clear them.

- **Skip the current user's own roles.** The request is "everyone except me".
  A literal select-all ticks Administrator and hides the item from the admin
  doing the editing. The editor is not told the current user's roles today;
  `enqueue()` would send them alongside `roles`.
- **Both role groups.** `buildRoleGroup()` builds "Hide this item from:" and
  "Hide its sub-items from:" (COMPAT-10), so the control belongs in the
  builder, not in one caller.
- **Leave locked rows alone.** Rows locked by the parent's own hide rule are
  derived, `aria-disabled`, and must not be written into the model. The
  existing change-handler guard shows the rule to follow.
- **Write through the model, once.** Use the group's `setSet` so the change is
  one autosave, not one per checkbox, and `refresh()` re-derives the rows.
- **Not on the per-person group.** That list is search-driven; there is no
  "all" to select.

## Open questions

- **Label.** "Select all" would be inaccurate if it skips the user's own
  roles. Candidates: "All other roles", or "All except Administrator" built
  from the user's role names. Pick with the translations in mind.
- **Checkbox or link.** A tri-state checkbox (none / some / all) is the
  familiar pattern and needs `aria-checked="mixed"`. A pair of links
  ("All other roles" / "None") is simpler and has no mixed state to announce.
- **A user with several roles, or a custom role granted `maestro_capability`.**
  "Roles I hold" covers both, but check the result reads sensibly when the
  editing user is not an Administrator.
- **Overlap with role scope.** If [[2026-10-07-view-menu-as-role-preview]]
  ships, hiding across roles stays here in the Everyone scope; this control
  is the fast path for it.

## Check when doing it

- Unit (node:test): the pure helper returns every role except the user's own
  and except locked ones; clearing returns the set without touching locked.
- e2e: one activation hides the item from every other role in one save; the
  admin still sees the item after reload; a second activation clears it.
- e2e: on a parent, the sub-items group behaves the same and locked rows stay
  locked and checked.
- Accessibility: the control is in the group's tab order before the first
  role, has an accessible name that includes the group heading, and the
  result is announced with `wp.a11y.speak()`.

See also [[2026-10-07-view-menu-as-role-preview]],
[[2026-07-03-config-presets-export-import]].
