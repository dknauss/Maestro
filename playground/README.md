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

Installs the plugin from a **clean rolling ZIP built from `main`** — the
`playground-demo` prerelease asset published by
[`.github/workflows/playground-demo.yml`](../.github/workflows/playground-demo.yml)
on every push to `main`, fetched through the CORS proxy:
`…/releases/download/playground-demo/maestro-menu-editor.zip`. So it tracks the
latest `main` build (byte-identical to the runtime package), for previewing
unreleased work.

> `git:directory` is **not** used: it fails in the hosted browser Playground
> (`createHash is not a function`). Both hosted demos install a CORS-proxied
> `.zip` instead.

### [`blueprint-stable.json`](blueprint-stable.json) — hosted, latest release

Playground URL:
`https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/dknauss/Maestro/main/playground/blueprint-stable.json`

Installs the plugin from the latest GitHub **release ZIP** —
`https://github.com/dknauss/Maestro/releases/latest/download/maestro-menu-editor.zip`,
fetched through the Playground CORS proxy (direct GitHub asset URLs fail CORS in
the browser runtime). The `/releases/latest/download/` path always resolves to
the newest release's asset, so this is byte-identical to what users install and
always tracks the current release. This is the primary "Try it live" demo linked
from the README. The release asset is built and attached by the release workflow
(`bin/build.sh` + `.github/workflows/release.yml`).

## Release rule

Nothing to do for the demos. The stable demo installs from
`/releases/latest/download/`, which the release workflow refreshes automatically;
the main demo tracks the `main` branch. Neither blueprint needs a per-release
edit. (`bin/prep-release.sh` bumps the version strings in the plugin header and
`readme.txt`; it no longer touches any blueprint.)
