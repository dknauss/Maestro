# Playground blueprints

This directory contains three WordPress Playground blueprints for Maestro. They
share the same setup (User Switching, four test users, edit mode landing page)
but differ in how the plugin is installed.

## Blueprints

### [`blueprint.json`](blueprint.json) — local dev (working tree)

Used by `npm run playground`. Mounts the local working tree into Playground via
a `wp-env`-style volume, so you always run the code that is checked out on disk.
Not suited for hosted demos — it requires a local build.

### [`blueprint-hosted.json`](blueprint-hosted.json) — hosted, tracks `main` (bleeding edge)

Playground URL:
`https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/dknauss/Maestro/main/playground/blueprint-hosted.json`

Installs the plugin via a `git:directory` resource pointing at the `main`
branch. Every time this demo loads it pulls the latest commit on `main`, so it
reflects unreleased changes. Use this to preview work in progress.

### [`blueprint-stable.json`](blueprint-stable.json) — hosted, latest WordPress.org release

Playground URL:
`https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/dknauss/Maestro/main/playground/blueprint-stable.json`

Installs the plugin from the **WordPress.org plugin directory** (via the
`"plugins": [ ..., "maestro-menu-editor" ]` shorthand). This is byte-identical
to what users actually install, boots off the Playground CDN (fast and
reliable), and always tracks the current Stable tag — so it needs no
per-release maintenance. This is the primary "Try it live" demo linked from the
README.

## Release rule

Nothing to do for the stable demo. It installs from WordPress.org, which serves
the current Stable tag automatically, so `blueprint-stable.json` never needs a
per-release edit. (`bin/prep-release.sh` bumps the version strings in the plugin
header and `readme.txt`; it no longer touches any blueprint.)
