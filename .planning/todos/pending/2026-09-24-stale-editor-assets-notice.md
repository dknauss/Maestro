---
created: 2026-09-24T00:00:00.000Z
title: Warn when the browser runs cached editor files from an older Maestro version
area: editor-ux
files:
  - includes/class-assets.php (enqueue(), the edit-mode maestro.css / maestro.js)
  - assets/maestro.js, assets/maestro.css
  - bin/prep-release.sh (version bump)
  - .github/workflows/release.yml (tag/version check)
---

## What happened

Found on a live PX site (TripSpark, Kinsta + Cloudflare) the day after 1.6.0
shipped. The site ran 1.6.0 and its server files were 1.6.0, but edit mode
still showed two defects 1.6.0 fixed: the jagged submenu edge (#200) and the
toolbar over a widened menu (#199). Clearing the server caches did nothing; a
hard refresh fixed it.

The mechanism, measured with a console probe:

- Something on the site strips `?ver=` from plugin asset URLs in wp-admin:
  `maestro.css` and `maestro.js` loaded with no query string, while core's
  `load-styles.php` kept `ver=7.1.2`. Not Kinsta or Cloudflare (they don't
  rewrite the HTML) and not PX (no `*_loader_src` filter); most likely a
  performance or security plugin (WP Rocket was the first suspect; unconfirmed).
- The host sends `cache-control: max-age=315360000` (ten years) for static
  files. Harmless with versioned URLs; with the version stripped, the 1.5.4
  file stays in each browser under the same URL after an update.
- Cloudflare `DYNAMIC` and Kinsta `BYPASS`: no server-side cache involved, which
  is why purging did nothing.

So every editor who used Maestro before an update keeps running the old
editor, with no sign that anything is wrong. Maestro can't stop a plugin
stripping `?ver=`, but it can notice the result.

## Proposed design

1. **The server states the version in the page HTML, which is never
   stale.** Attach an inline script to the `maestro` handle with
   `wp_add_inline_script( 'maestro', ..., 'after' )`, carrying
   `MAESTRO_VERSION`. Inline code arrives with the page itself, so it is
   always current.
2. **Each cached file states its own version.**
   - `maestro.js` sets `window.maestroBuild = '<version>'`.
   - `maestro.css` sets `--maestro-build: "<version>"` on `:root`.
3. **The inline script compares them.** It checks `window.maestroBuild` and
   the computed `--maestro-build` against the server's version. A missing
   value counts as a mismatch, so **this catches the 1.6.0 files and older
   from the first release that ships it**; they set neither.
4. **On mismatch,** show a notice in edit mode: "The menu editor's files in
   this browser are from an older version. Reload to update." Include a
   **Reload** button that re-fetches the stale files with
   `fetch( url, { cache: 'reload' } )`, which replaces the browser's cached
   copy, then reloads the page. (`location.reload( true )` no longer forces a
   cache bypass in current browsers.) Log a `console.warn` naming the files.
5. **Keep the versions in sync at release.** `bin/prep-release.sh` bumps the
   two new constants alongside the plugin header, and `release.yml`'s "verify
   tag matches plugin versions" step checks them too, so a release can't ship
   with mismatched files and warn everyone.

**Rejected:** versioned file names (`maestro.1.6.0.css`). They beat any query
stripping, but need a build step and rename files on every release in SVN.
That's out of scale for this.

## Check when doing it

- e2e: serve `maestro.js` with a stale `maestroBuild` (route interception in
  Playwright) and assert the notice appears and Reload clears it. No notice in
  the normal case.
- Also cover a stale CSS file with a current JS file, and the reverse.
- The notice must not appear outside edit mode, and must not block editing.
- Mention in the changelog that a site stripping `?ver=` from admin assets is
  the usual cause, so site owners can fix it at the source.
