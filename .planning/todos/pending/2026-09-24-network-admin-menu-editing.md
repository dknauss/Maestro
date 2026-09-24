---
created: 2026-09-24T00:00:00.000Z
title: Network admin menu editing (multisite) — a separate scope with its own storage
area: multisite
files:
  - maestro-menu-editor.php (is_outside_site_admin(), is_edit_mode())
  - includes/class-admin-bar.php (Admin_Bar::node(): toggle hidden outside site admin)
  - includes/class-assets.php (Assets::enqueue(): returns early outside site admin)
  - includes/class-replay.php (replay() on admin_menu only; has_top_order()/reorder_top() pass through outside site admin)
  - includes/class-config.php (single per-site option, MAESTRO_OPTION)
  - includes/class-rest.php (maestro/v1/config, per-site)
  - tests/integration/NetworkAdminTest.php (the #198 guards)
---

## Problem

Maestro does not appear in the network admin bar, and cannot edit the network
admin menu. That is deliberate today: #198 (`fix(multisite): keep edit mode and
top-level order out of network and user admin`) closed a data-loss bug where
edit mode opened in network admin and its full-replace autosave posted the
network menu's model to `rest_url()` — the **main site** — replacing that site's
config. It also stopped the site's `top_order` from re-sorting the network menu.
#198 names network-menu editing as "a separate feature with its own storage",
out of its scope. This is that feature, parked.

## Why it is backlog, not next

The network admin menu is the smallest, least cluttered menu WordPress has:
mostly core (Sites, Users, Themes, Plugins, Settings) plus a few plugins'
network settings pages, seen only by super admins. Maestro's core job — per-role
and per-person hiding — barely applies when every viewer is a super admin.
Build it when there is demand to rename or reorder network plugins' items.

**Rejected interim idea (2026-09-24):** an admin-bar "Edit Menu (main site)"
link in network admin, pointing at the main site's dashboard in edit mode. Not
doing it: it assumes the super admin means the main site, which is a guess on a
network whose sites all have their own menus.

## What it would take

1. **Storage.** A network-scoped config in a site option (`get_site_option` /
   `update_site_option`), never the per-site `maestro_config`. Decide whether
   the schema is the same shape (items/top_order/sub_order/separators) and
   whether `Config::sanitize()` can be shared.
2. **REST.** A route (or an explicit scope parameter) that writes the network
   option. It must not depend on `rest_url()` resolving to the right site — that
   ambiguity is exactly what caused the #198 bug. Permission:
   `manage_network_options`, not the site `capability()`.
3. **Replay.** Apply the network config on `network_admin_menu`, and scope
   `custom_menu_order`/`menu_order` to it while in network admin (today they
   pass through there, per #198).
4. **Editor.** Enable edit mode, the toggle, and assets in network admin only
   for the network scope, with the editor model and saves pointed at it.
   Probably hide the role/person visibility controls (all viewers are super
   admins), or decide what they mean on a network.
5. **User admin** (`wp-admin/user/`) is also excluded by #198; decide
   separately whether it is in scope (likely not).

## Testing

- Integration: extend `tests/integration/NetworkAdminTest.php` (multisite-only;
  run with `npm run test:php:multisite`). Keep the #198 guard that a network
  save can never write the per-site option.
- E2E: the wp-env e2e environment is single-site today, so this needs a
  multisite e2e config (a separate `.wp-env.*.json` variant) before the editor
  flow can be tested end to end.

## Risk

High when built: new REST write path, new storage, and a capability boundary
(network vs site). Warrants the mandatory deep review.
