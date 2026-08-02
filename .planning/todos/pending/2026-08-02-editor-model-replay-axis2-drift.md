---
created: 2026-08-02T00:00:00.000Z
title: Editor model applies only Axis-1 guard, not the rendered-collision guards replay uses
area: correctness/editor
files:
  - includes/class-replay.php (resolved_hidden_roles() ~lines 486-506, resolved_child_hidden_roles() ~lines 521-527)
  - includes/class-replay.php (get_menu_model() ~lines 539-607, consumer of both resolvers)
  - includes/class-replay.php (replay() ~lines 99-117, 191-223 — the rendered-collision guards)
---

## Problem

LOW severity, rare, display-only, no data loss.

`resolved_hidden_roles()` and `resolved_child_hidden_roles()`
(`includes/class-replay.php` ~lines 486-527), consumed by `get_menu_model()` to
paint the editor's visibility popover, apply ONLY the Axis-1 `norm_skip` guard
(two distinct STORED keys colliding). They do NOT apply the Axis-2
rendered-collision guards that `replay()` enforces:

- `top_skip_rendered` (two distinct rendered top-level rows normalizing to one key),
- `sub_skip_rendered` (same, bare submenu children),
- `qual_skip_rendered` (same, qualified `parent>child` children).

Consequence: on a *rendered* (Axis-2) collision, `replay()` applies nothing for
that key, but the editor popover still shows the stored roles checked — so the
displayed state and the applied state disagree. It is display-only (the popover
lies about what is in effect); no capability changes and no config is dropped.

## Impact

Rare — requires two live menu rows whose slugs normalize to the same key in one
request (e.g. the same page registered twice under volatile query params). The
apply path is already correct (fail-safe no-op); only the editor's mirror is
stale.

## Recommended fix

Bring the editor-model resolvers into lockstep with `replay()`: either

- share a single resolver helper that both `replay()` and `get_menu_model()`
  call (so apply and display can never drift), or
- have `get_menu_model()` compute the same `top_skip_rendered` /
  `sub_skip_rendered` / `qual_skip_rendered` sets from the live `$menu` /
  `$submenu` and pass them into the resolvers, so an Axis-2-ambiguous item shows
  an empty (unchecked) visibility panel — matching what replay applies.

Not a merge blocker; correctness/consistency polish.
