# Phase 28 · Plan 02 — Summary

**Date:** 2026-10-21
**Status:** Built and unit-tested locally. The checkpoint's three choices were
taken on their recommended options and are open for Dan to overturn on the PR.
Integration and e2e lanes are proved in CI (wp-env could not pull images in the
authoring sandbox).

## Task 1 — the always-loaded footprint (checkpoint)

| Question | Decision | Why |
|---|---|---|
| Delivery | `wp_add_inline_style()` on the always-loaded `maestro-admin-bar` handle | No HTTP request, no new hook, and it is emitted only when a width is stored. Equivalent to the plan's inline-`<style>` option, but it rides the handle that already loads on every admin page. |
| Option read | No new read, no separate option | `Replay::replay()` already reads `maestro_config` on every admin request, and `boot()` shares one memoized `Config` with `Assets`. `MenuWidthAssetTest::test_applying_the_width_costs_no_query_beyond_replays_read` asserts `$wpdb->num_queries` is unchanged across the enqueue. A separate autoloaded option would add to `alloptions` on every request, front end included, to save nothing. |
| Standing down | Precedence, no detection | Maestro's rules use `body:not(.folded) #adminmenu…` (outranks core's `#adminmenu`) and never `!important`, so Keel/PX's `!important` rule wins with no plugin list to maintain. Asserted in `menu-width-stored.spec.ts`. |

The plan's premise that this is the first time Maestro "loads outside edit mode"
was corrected on 2026-10-21 (#226): the PHP and `maestro-admin-bar.css` already
did. What is new is one CSS rule on sites that store a width.

## Task 2 — store and bound `menu_width`

`Config::clean_menu_width()`: int, float (rounded) or digit-string only; clamps to
`MIN_MENU_WIDTH` (160) … `MAX_MENU_WIDTH` (320); the default (160) is never stored.
The bounds' reasoning is in the constants' docblocks. `Config::menu_width()`
re-bounds on read. `sanitize()` output for a config without the key is unchanged.

**Found on the way:** the editor's autosave is full-replace, and nothing in the
menu DOM holds the width, so any edit would have erased it. `buildConfig()` now
carries `D.config.menu_width` forward, like `removed_separators`. 28-03's control
will own it from then on.

## Task 3 — apply it outside edit mode

`Assets::menu_width_css()` mirrors core's 160px rules: menu column, open
submenu, flyout offset, and the content column's margin. Scoped to
`min-width: 961px` (core auto-folds at 960px and below), never `body.folded`,
with RTL mirrored because inline CSS is not flipped.

## Verification

- Local: unit 191/191 (286 assertions), WPCS clean, PHPStan 0 errors, JS 92/92, doc links clean.
- CI: integration (single-site + multisite), e2e (`menu-width-stored.spec.ts`, plus the existing `menu-width-measured.spec.ts`), Plugin Check.

## Left for 28-03

The editor control, telling the user when another plugin's width is winning,
and the user-facing docs.
