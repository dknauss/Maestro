# Inline Admin Menu Editor (AMX)

In-place editing of the WordPress admin menu — rename items, reorder them, swap top-level dashicons, and hide items per role. Global configuration, no separate settings screen: the editor is toggled from the admin bar and operates on the menu itself.

## Status

v1 complete. The server core (replay engine, REST API, sanitization) and the editor are done, and all three test layers are green (unit 23/23, integration 13/13, E2E 4/4 against wp-env). The editor uses the click-to-select model with debounced autosave specified in [`FIXES.md`](FIXES.md):

- **Debounced autosave (~500 ms)** on reorder, rename, icon pick, visibility toggle, and per-item reset — no manual Save button; a "Saving… / Saved ✓" status indicator instead. Reload only on Exit (which flushes any pending save) and on Reset all.
- **Click-to-select with one shared controls panel.** No edit chrome until an item is selected: each row shows only a hover/focus-revealed drag handle. Selecting an item opens the shared panel (rename, icon picker for top-level items, per-role visibility, reset-this-item).
- **Stable expanded menu while editing.** Folded/auto-fold mode is neutralized on entry and re-stripped if `common.js` reapplies it, so editing always happens against the expanded menu.
- **Icon persistence** is wired into autosave and covered by an E2E test (pick → POST carries the icon → survives reload).

See `FIXES.md` for the resolved punchlist and `SPEC.md` for the durable design.

## Important: visibility is cosmetic, not access control

Hiding a menu item only declutters the menu — the underlying page still loads for anyone who knows its URL, because a page's own registered capability is the real lock. For actual access control, pair this with a capability manager (User Role Editor, or PublishPress Capabilities). The `amx_capability` filter lets such a plugin hand editing rights to a custom capability instead of the default `manage_options`.

## Repository layout

- **Runtime plugin** — `amx-inline-menu-editor.php`, `includes/`, `assets/`, `readme.txt`. This is all that ships to a site.
- **Dev & tooling** — `tests/`, `composer.json`, `package.json`, `.wp-env.json`, `playwright.config.ts`, `phpunit-*.xml.dist`, `bin/build.sh`.
- **Docs** — `SPEC.md` (durable specification), `FIXES.md` (active punchlist), `TESTING.md` (how to run each test layer).

## Install (to a site)

Build a runtime-only zip and upload it under Plugins → Add New → Upload:

```bash
bin/build.sh        # writes build/amx-inline-menu-editor.zip (runtime files only)
```

Activate it; **Edit Menu** appears in the admin bar. Never ship the dev tooling inside the installed plugin.

## Develop & test

```bash
composer install && composer test:unit          # pure unit tests, no WordPress
npm install && npm run env:start                 # boot WordPress + MySQL (Docker)
npm run test:php                                 # PHP integration tests
npm run test:e2e                                 # Playwright end-to-end
```

See `TESTING.md` for details and the standalone (non-Docker) paths.

## License

GPL-2.0-or-later. See [`LICENSE`](LICENSE).
