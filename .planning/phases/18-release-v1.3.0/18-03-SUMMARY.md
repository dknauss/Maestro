---
phase: 18-release-v1.3.0
plan: 03
status: complete
completed: 2026-06-30
reconstructed: 2026-07-02
reconstructed_note: "Written retroactively during the v1.3.0 milestone audit. The release + SVN-deploy steps executed on 2026-06-30 but were never recorded as a SUMMARY; this reconstructs them from the release.yml/wp-deploy.yml workflow runs, the published GitHub Release, and the live WordPress.org SVN state."
commit: 884c6df
requirements: [REL-09]
---

# 18-03 Summary: Publish GitHub Release + deploy to WordPress.org

**Objective met.** The `v1.3.0` tag drove a green release pipeline: the GitHub
Release published with the runtime zip attached, and the 10up deploy landed the
release on WordPress.org SVN `trunk` + a `1.3.0` tag. **v1.3.0 is live.** This
completes REL-09 and the v1.3.0 milestone.

## What was done

| Task | Result |
|------|--------|
| `release.yml` (on push of tag `v1.3.0`) | Run **`28431793092` — success, 2026-06-30T08:43:43Z**. Verified `tag == header Version == Stable tag`, built `build/maestro-menu-editor.zip` via `bin/build.sh`, published GitHub Release **v1.3.0** (non-draft) with the zip asset attached |
| `wp-deploy.yml` ("Deploy to WordPress.org") | Run **`28432154051` — success, 2026-06-30T08:50:18Z**. 10up `action-wordpress-plugin-deploy` → SVN `trunk` updated + `tags/1.3.0` cut + `.wordpress-org` assets staged |
| Plugin Check + regression gate | 0 errors / suites green — carried from the authoritative `ci.yml` gate on PR #65 (13/13); the release commit is a descendant of that green gate |

## Verification (observable release state — live sources)

- **GitHub Release:** `gh release view v1.3.0` → tag `v1.3.0`, draft `false`, prerelease `false`, asset `maestro-menu-editor.zip`, published 2026-06-30T08:43:54Z ✓
- **wp.org SVN trunk:** `plugins.svn.wordpress.org/maestro-menu-editor/trunk/readme.txt` → `Stable tag: 1.3.0` ✓
- **wp.org SVN tag:** `tags/1.3.0` present ✓
- Both workflow runs `completed / success` ✓

## Outcome

REL-09 satisfied. v1.3.0 shipped end-to-end following the v1.2 pipeline
(prep-release bump → tag on main → release.yml → wp-deploy.yml). No new plugin
features; the payload is the Phase 17 slug-normalization fixes (FIX-01/02/03).
