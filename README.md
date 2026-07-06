# Maestro

[![CI](https://github.com/dknauss/Maestro/actions/workflows/ci.yml/badge.svg)](https://github.com/dknauss/Maestro/actions/workflows/ci.yml) [![Latest Tag](https://img.shields.io/github/v/tag/dknauss/Maestro)](https://github.com/dknauss/Maestro/tags) [![Docs](https://img.shields.io/badge/docs-available-0a7ea4.svg)](docs/)
[![License: GPL-2.0-or-later](https://img.shields.io/badge/license-GPL--2.0--or--later-blue.svg)](https://www.gnu.org/licenses/gpl-2.0.html)
[![WordPress 6.4+](https://img.shields.io/badge/WordPress-6.4%2B-21759b.svg?logo=wordpress&logoColor=white)](https://wordpress.org/)
[![Tested up to WP 7.0](https://img.shields.io/badge/tested%20up%20to-WP%207.0-21759b.svg?logo=wordpress&logoColor=white)](https://wordpress.org/)
[![PHP 7.4+](https://img.shields.io/badge/PHP-7.4%2B-777bb4.svg?logo=php&logoColor=white)](https://www.php.net/)
[![▶ Playground (latest release)](https://img.shields.io/badge/▶_Playground-Latest_release-3858e9.svg?logo=wordpress&logoColor=white)](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/dknauss/Maestro/main/playground/blueprint-stable.json) [![▶ Playground (main)](https://img.shields.io/badge/▶_Playground-main_branch-6e40c9.svg?logo=wordpress&logoColor=white)](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/dknauss/Maestro/main/playground/blueprint-hosted.json)
[![WordPress.org](https://img.shields.io/badge/WordPress.org-Install-21759b.svg?logo=wordpress&logoColor=white)](https://wordpress.org/plugins/maestro-menu-editor/)

![Maestro banner](.wordpress-org/banner-1544x500.png)

In-place editing of the WordPress admin menu — rename items, reorder them, swap top-level icons, and hide items per role. Global configuration, no separate settings screen: the editor is toggled from the admin bar and operates on the menu itself.

**▶ [Try it live in WordPress Playground](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/dknauss/Maestro/main/playground/blueprint-stable.json)** — boots a throwaway site with the plugin active in edit mode, User Switching, and test users (editor / author / contributor / subscriber, password `password`) so you can try per-role visibility by switching users. This demo installs the **latest released version**. ([Development build (main)](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/dknauss/Maestro/main/playground/blueprint-hosted.json) also available.)

## Screenshots

Click any screenshot to open the full-size image.

| Edit mode | Icon picker |
| --- | --- |
| [![Edit mode with the Posts menu item selected and the shared controls panel open](.wordpress-org/screenshot-1.png)](.wordpress-org/screenshot-1.png) | [![Icon picker with searchable Dashicons and Bootstrap Icons tabs](.wordpress-org/screenshot-2.png)](.wordpress-org/screenshot-2.png) |
| Posts selected, with the shared controls panel open. | Searchable icon picker with Dashicons and Bootstrap Icons tabs. |

| Role visibility | Autosave |
| --- | --- |
| [![Per-role visibility picker for hiding a menu item from selected roles](.wordpress-org/screenshot-3.png)](.wordpress-org/screenshot-3.png) | [![Renamed menu item saved through debounced autosave](.wordpress-org/screenshot-4.png)](.wordpress-org/screenshot-4.png) |
| Per-role visibility picker for hiding a menu item from selected roles. | Renamed menu item saved through debounced autosave. |

## Important: visibility is cosmetic, not access control

Hiding a menu item only declutters the menu — the underlying page still loads for anyone who knows its URL, because a page's own registered capability is the real lock. For actual access control, pair this with a capability manager ([User Role Editor](https://wordpress.org/plugins/user-role-editor/), or [PublishPress Capabilities](https://wordpress.org/plugins/capability-manager-enhanced/)). The `maestro_capability` filter lets such a plugin hand editing rights to a custom capability instead of the default `manage_options`.

## Quick start

1. Activate the plugin, then choose **Edit Menu** in the admin bar.
2. Click a menu item to select it. The shared controls panel opens beside the
   menu.
3. Rename an item by editing its label. Press `Enter` to commit or `Escape` to
   restore the previous label.
4. Reorder items by dragging menu rows. Top-level items reorder among top-level
   items; submenu items reorder inside their current parent.
5. Change a top-level icon from the icon picker. Use Dashicons, bundled
   Bootstrap Icons, "No icon", or a valid WordPress icon value.
6. Hide an item from selected roles with the visibility control. This only
   changes what those roles see in the menu; it does not block the page URL.
7. Use **Reset this item** to discard one item's customizations, or **Reset
   all** to delete the saved configuration and return to WordPress defaults.
8. Choose **Exit Menu Editing** when finished. Pending autosaves are flushed
   before the page reloads.

For the longer walkthrough, see [`docs/user-guide.md`](docs/user-guide.md).

## Status

**v1.1.1 is live on the WordPress.org plugin directory** ([maestro-menu-editor](https://wordpress.org/plugins/maestro-menu-editor/)) — it includes the v1.1 polish release plus follow-up toolbar label refinements over the 1.0.0 base (roadmap in [`.planning/ROADMAP.md`](.planning/ROADMAP.md)). The server core (replay engine, REST API, sanitization) and the editor are done, and all test layers are expected to stay green (unit 44, integration 29, E2E coverage, JavaScript unit tests, phpcs, PHPStan, and Plugin Check on the runtime build). The editor uses the click-to-select model with debounced autosave:

- **Debounced autosave (~500 ms)** on reorder, rename, icon pick, visibility toggle, and per-item reset — no manual Save button; a "Saving… / Saved" status indicator (dashicon + text) instead. Saves are serialized (single-flight) so a slow request can't overwrite newer edits. Reload only on Exit (which flushes any pending save) and on Reset all.
- **Click-to-select with one shared controls panel.** No edit chrome until an item is selected: each row shows only a hover/focus-revealed drag handle. Selecting an item opens the shared panel (rename, icon picker for top-level items, per-role visibility, reset-this-item).
- **Stable expanded menu while editing.** Folded/auto-fold mode is neutralized on entry and re-stripped if `common.js` reapplies it, so editing always happens against the expanded menu.
- **Icons: all four native WordPress forms** (dashicon, `none`, base64 image data-URI, image URL), validated server-side. The picker bundles two sets — dashicons and ~87 curated [Bootstrap Icons](https://icons.getbootstrap.com/) — with a search filter and a "No icon" option, and is keyboard-accessible (dialog/tablist roles, arrow-key navigation, focus trap) and mobile-sized. Icon changes persist via autosave (covered by E2E: pick → POST carries the icon → survives reload).

See [`SPEC.md`](SPEC.md) for the durable design and [`docs/archive/FIXES.md`](docs/archive/FIXES.md) for the historical fix log.

## Localization

The plugin uses the `maestro-menu-editor` text domain and ships a translation template plus starter language packs for Spanish (`es_ES`), German (`de_DE`), Japanese (`ja`), French (`fr_FR`), Portuguese (Brazil) (`pt_BR`), and Italian (`it_IT`). PHP-visible strings use WordPress translation helpers, and the editor receives its UI labels through the localized `maestroData.i18n` payload so JavaScript controls, dialogs, status messages, and button text are translatable. WordPress.org language packs can still override and extend the bundled catalogs; native-speaker and WordPress Polyglots review is welcome.

## Repository layout

- **Runtime plugin** — [`maestro-menu-editor.php`](maestro-menu-editor.php), `includes/`, `assets/`, `languages/`, `readme.txt`. This is all that ships to a site.
- **WordPress.org listing assets** — `.wordpress-org/` contains the directory icon ([`icon.svg`](.wordpress-org/icon.svg), `icon-128x128.png`, `icon-256x256.png`), banners (`banner-772x250.png`, `banner-1544x500.png`), and screenshots (`screenshot-1.png` through `screenshot-4.png`).
- **Dev & tooling** — `tests/`, [`composer.json`](composer.json), [`package.json`](package.json), [`.wp-env.json`](.wp-env.json), [`playwright.config.ts`](playwright.config.ts), `phpunit-*.xml.dist`, [`bin/build.sh`](bin/build.sh).
- **Docs** — [`docs/user-guide.md`](docs/user-guide.md) (user walkthrough), [`SPEC.md`](SPEC.md) (durable specification), [`TESTING.md`](TESTING.md) (how to run each test layer), and [`docs/archive/FIXES.md`](docs/archive/FIXES.md) (historical fix log).

## Footprint & performance

Maestro is deliberately lightweight. *Figures are a v1.3.1 snapshot from a static sweep; run [`bin/build.sh`](bin/build.sh) to re-measure the package.*

**Deployed package** ([`bin/build.sh`](bin/build.sh), with dev/test/tooling excluded): ~90 KB zip, ~330 KB installed (of which ~80 KB is bundled translations).

| Runtime code | Approx. |
|---|---|
| PHP | ~1,760 LOC — 8 classes + bootstrap + uninstall |
| JavaScript | ~1,700 LOC — 2 files, unminified |
| CSS | ~760 LOC — 2 files |

**Storage** — one *non-autoloaded* `wp_options` row (`maestro_config`), created only on first save (a fresh install stores nothing). No custom tables, post/user meta, transients, or cron events. [`uninstall.php`](uninstall.php) deletes that single row — zero residue.

**Per-request query overhead**

- **Front end: 0 extra queries.** Every hook is admin-gated (the admin-bar node bails on `!is_admin()`), so the plugin is inert for public traffic.
- **Admin page: exactly 1 extra query** — a single non-autoloaded `get_option`, cached in-request by [`Config::get()`](includes/class-config.php) (one read no matter how many consumers) and served from the object cache after first read → **0 queries with a persistent object cache**. Not autoloaded, so it adds nothing to `alloptions`.
- **Save: 1 `update_option`**, via the REST endpoint while actively editing. Rename/reorder/hide are applied by mutating the in-memory `$menu`/`$submenu` globals during `admin_menu` — no queries.

## Install (to a site)

Build a runtime-only zip and upload it under Plugins → Add New → Upload:

```bash
bin/build.sh        # writes build/maestro-menu-editor.zip (runtime files only)
```

Activate it; **Edit Menu** appears in the admin bar. Never ship the dev tooling inside the installed plugin.

## Develop & test

```bash
composer install && composer test:unit          # pure unit tests, no WordPress
npm install && npm run env:start                 # boot WordPress + MySQL (Docker)
npm run test:php                                 # PHP integration tests
npm run test:e2e                                 # Playwright end-to-end
```

See [`TESTING.md`](TESTING.md) for details and the standalone (non-Docker) paths.

## Playground demo (role testing)

A WordPress Playground blueprint ([`playground/blueprint.json`](playground/blueprint.json)) spins up a throwaway
site for trying the editor — including **per-role visibility** — without a local
WordPress. It installs [User Switching](https://wordpress.org/plugins/user-switching/),
creates four test users (`editor`, `author`, `contributor`, `subscriber`, all
password `password`), activates Maestro, and drops you into edit mode
as `admin`.

```bash
npm run playground
```

This builds the runtime-only plugin, mounts it into Playground, runs the
blueprint, and serves at `http://127.0.0.1:9400`. Hide a menu item from a role
in the editor, then use **Switch To** (admin bar) to view the menu as that user.

> **Hosted Playground:** two hosted blueprints are available, both served from `main` so their URLs are stable:
>
> - **[Latest release demo](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/dknauss/Maestro/main/playground/blueprint-stable.json)** — [`playground/blueprint-stable.json`](playground/blueprint-stable.json) installs the plugin from the latest GitHub release ZIP (`/releases/latest/download/`, through the Playground CORS proxy) — byte-identical to a release, and it always tracks the newest one. This is the primary "Try it live" link.
> - **[Development build (main)](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/dknauss/Maestro/main/playground/blueprint-hosted.json)** — [`playground/blueprint-hosted.json`](playground/blueprint-hosted.json) installs the current `main` build from the rolling `playground-demo` pre-release ZIP (`/releases/download/playground-demo/`, through the Playground CORS proxy), which CI refreshes on every push to `main`. Use this to preview unreleased changes.
>
> The local [`playground/blueprint.json`](playground/blueprint.json) mounts the working tree instead.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for local setup, quality gates, and pull request expectations. For security reports, use the private process in [`SECURITY.md`](SECURITY.md); do not open public security issues.

## License

GPL-2.0-or-later. See [`LICENSE`](LICENSE).
