---
created: 2026-10-07T00:00:00.000Z
title: Preview the admin menu as another role ("View as: Editor")
area: editor-ux
files:
  - includes/class-replay.php (replay(), is_hidden_for_current_user(), has_top_order(), get_menu_model())
  - includes/class-assets.php (enqueue(), the `roles` list already sent to the editor)
  - includes/class-admin-bar.php (edit-mode toggle; needs a preview banner / exit)
  - maestro-menu-editor.php (capability(), is_edit_mode())
  - assets/maestro.js (role picker in the controls panel)
  - SPEC.md (Principle 3 and the "never changes a capability" wording)
---

## The idea

Let an admin see the admin menu as a given role would, so they can tell at a
glance what still needs hiding. A role simulator, not a user switcher: no
session change, no second login, no dependency on User Switching.

Today the admin sees their own menu plus Maestro's rules for their own role.
To check an Editor's menu they must log in as one.

## Why it is feasible

Feasibility checked 2026-10-07 against the WP 7.1 core copy in Studio. The
menu a role sees is decided in one narrow window of the page load:

- `wp-admin/admin.php:163` requires `wp-admin/menu.php`, before `admin_init`
  (line 180). Core's own items are registered there.
- `wp-admin/includes/menu.php` fires `admin_menu` (line 168), then strips
  items the user lacks the capability for with `current_user_can()`
  (lines 89 and 176).
- `custom_menu_order` runs at line 291 and `menu_order` at 313. Maestro already
  hooks both at `PHP_INT_MAX`.
- The page-access check, `user_can_access_admin_page()`, is at line 375, after
  all of the above.

So a `user_has_cap` filter that is on from before `wp-admin/menu.php` loads
until `custom_menu_order` makes core and most plugins build the menu as the
chosen role, while the page itself, REST saves and Maestro's own toggle still
run as the real admin.

## Proposed design (read-only first)

1. **Role picker** in the existing controls panel. Choosing a role reloads the
   page with a nonce'd flag. The menu is server-rendered, so a reload is
   unavoidable.
2. **Scoped, subtract-only capability filter.** On `user_has_cap`, intersect
   the admin's `allcaps` with the chosen role's capabilities. It must never
   add a capability. Attach early (the flag is readable at `plugins_loaded`)
   and detach in `has_top_order()`, so it is off before line 375.
3. **One seam for Maestro's own rules.** `is_hidden_for_current_user()` reads
   `$user->roles`; in preview it reads the simulated role instead. The
   per-user axis has no meaning for a generic role and stays off.
4. **Read-only while previewing.** Banner naming the role, with an exit
   control. No selection, no autosave.
5. **Gate** on `capability()`, checked before the filter attaches, plus the
   nonce. The flag does nothing for anyone else.

## Interface direction: a role-attached edit mode

Proposed by Dan, 2026-10-07. Rather than stopping at a read-only preview, the
role picker enters a narrower edit mode bound to that role:

- Edit mode gains a "View as: Editor / Author / Contributor / ..." list.
- Choosing a role shows the menu as that role sees it. Each row carries one
  control, a show/hide toggle, which writes that role into (or out of) the
  item's `hidden_roles`.
- Rename, reorder, icon, separators and reset are unavailable in this mode;
  they are global and belong to the main edit mode.
- Rows Maestro hides from the role stay in the menu, dimmed, so the rule can
  be undone. This is the same reasoning as the edit-mode suspension of the
  per-user axis in `is_hidden_for_current_user()`. Rows core strips for lack
  of capability are simply absent: there is nothing to hide.

Undecided: whether the existing per-role checkboxes in the global panel are
removed or kept. They are the same `hidden_roles` data seen along the other
axis (one item, all roles) and also carry `child_hidden_roles` and
`hidden_users`, which this mode has no control for. Decide after using the
role mode, not before.

The read-only preview below is the first step toward this and can ship alone.

## Open questions

- **Capability principle.** SPEC.md says Maestro never changes a capability.
  This filter is request-scoped, affects only the viewing admin, and can only
  subtract, so it cannot escalate. It still touches capability resolution.
  Decide whether that fits the principle or the wording needs a carve-out
  before building.
- **Editing while previewing.** The useful end state is hiding an item
  directly in the simulated view. Items core strips for the role never reach
  `$menu`, so they are missing from `get_menu_model()`; the comment there says
  autosave is a full replace, so a save from a simulated view could drop rules
  for the missing rows. Not traced through the save path. Needs either a
  merge-style save or a model that carries un-rendered rows. Treat as a
  follow-up, not part of the first cut.
- **Multisite super admins.** `WP_User::has_cap()` returns early for them
  (`class-wp-user.php:796`) before `user_has_cap` runs, so the filter does
  nothing. Options: a `map_meta_cap` variant that adds `do_not_allow`, or a
  documented limitation.

## Known limits on fidelity

- Plugins that check roles directly (`in_array( 'administrator', $user->roles )`)
  or decide their menus before the filter attaches are not simulated.
- A generic role, not a person: per-user capabilities and `hidden_users`
  rules are not reflected.
- Say so in the banner or the user guide, so the preview is not read as a
  guarantee.

## Check when doing it

- Integration: preview as each core role and compare `$menu` / `$submenu`
  against a real factory user of that role, with and without Maestro rules.
- Integration: the filter never adds a capability (previewing as a role that
  holds a cap the admin lacks).
- Integration: the filter is detached before the access check; an admin
  previewing as Subscriber on `plugins.php` still loads the page.
- Integration: a user without `capability()` sending the flag gets no change.
- e2e: pick a role, see the banner and the reduced menu, exit, menu restored.
- Multisite: whichever behaviour is chosen for super admins.

See also [[2026-08-02-cloned-role-hiding-profiles]],
[[2026-09-24-network-admin-menu-editing]].
