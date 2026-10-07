---
created: 2026-10-07T00:00:00.000Z
title: Delegate menu editing downward (self-service hiding first)
area: permissions
files:
  - maestro-menu-editor.php (capability(), the `maestro_capability` filter)
  - includes/class-rest.php (can_edit(), save_config(), reset_config())
  - includes/class-config.php (sanitize(), protected_user_axes(), reset())
  - includes/class-replay.php (is_hidden_for_current_user())
  - includes/class-admin-bar.php (edit-mode toggle)
  - SPEC.md ("customizations are global")
---

## The idea

Raised by Dan, 2026-10-07, while designing the view-as-role scope selector
([[2026-10-07-view-menu-as-role-preview]]): could menu editing be delegated
downward, as something more roles can do to some extent?

Today delegation is all or nothing. `maestro_capability` (default
`manage_options`) hands the whole editor to whoever holds the capability. The
only finer boundary is ROLE-02's: writing per-user rules also needs
`list_users`, enforced in `sanitize()` and mirrored in `reset()`.

## Why partial delegation is not a small step

- **WordPress has no role hierarchy.** "Editors may edit menus for lower
  roles" has no native definition of "lower". Maestro would have to invent an
  ordering and maintain it across custom roles.
- **The config is global.** Anyone who can write it can rename, reorder, or
  hide items from administrators. Partial delegation needs scoped write
  checks on the server for every field, not a narrower interface. A boundary
  that holds in the UI and not on the endpoint is not a boundary (the same
  point the comment in `Config::reset()` makes).

## The form that falls out cleanly: self-service

Any user may hide items from their own menu.

- Writes only the user's own ID into `hidden_users`. No other field, no other
  ID.
- Cosmetic, like every Maestro rule: it grants nothing and blocks nothing.
- Needs no simulation. The user is already looking at their real menu, so
  none of the fidelity limits of the role or person preview apply.
- Needs no `list_users`: there is no picker and no other user to look up.

This is a personal-preference feature, not a narrower admin tool, and should
be judged as one.

## Open questions

- **Is it in scope at all?** SPEC.md describes customizations as global, one
  configuration for everyone. Self-service hiding is per-person by design.
  Decide before building.
- **Storage.** `hidden_users` in the shared option is capped at
  `MAX_HIDDEN_USERS` (50) per item per axis, which is sized for an admin
  naming individuals, not for every user on a site opting in. User meta is
  the likely home; that is a second store for `is_hidden_for_current_user()`
  to consult and for uninstall to clean up.
- **A separate endpoint.** A narrow route that accepts only "hide/show item X
  for me" is safer than loosening `can_edit()` on the full-config route.
- **Admin override.** Whether an admin can see, clear, or disable users' own
  hides, and whether the feature is opt-in per site (a filter, off by
  default).
- **Undo.** A user who hides an item needs a way back to it. The edit-mode
  suspension of the per-user axis solves this for admins; self-service needs
  its own entry point and its own "show hidden items" state.
- **Role-scoped delegation** (a role may edit visibility for named other
  roles) stays unaddressed here. It needs an explicit, admin-configured
  mapping of who may edit whom, and per-field write checks. Revisit only if
  there is demand.

## Check when doing it

- Integration: the self-service route can write only the caller's own ID;
  any other ID, field, or item shape is rejected.
- Integration: a self-hide never affects another user's menu.
- Integration: uninstall removes whatever store is used.
- e2e: hide an item as a non-admin, reload, restore it.

See also [[2026-10-07-view-menu-as-role-preview]],
[[2026-08-02-cloned-role-hiding-profiles]].
