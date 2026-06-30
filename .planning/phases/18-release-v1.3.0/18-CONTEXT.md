# Phase 18: Release v1.3.0 - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Cut and ship **v1.3.0** to WordPress.org (REL-09). Bump the version strings,
run the full regression gate green, tag `v1.3.0` on `main`, publish the GitHub
Release, and land the release on SVN `trunk` + the `1.3.0` SVN tag — following
the **same pipeline used for v1.2.0**. No new plugin features; the FIX-01/02/03
slug-normalization code (Phase 17) is the payload being shipped.

</domain>

<decisions>
## Implementation Decisions

### Branch & merge strategy
- **One PR on the existing branch.** `gsd/phase-17-slug-normalization` is 11
  commits ahead of `main`, 0 behind, working tree clean — it is the de-facto
  release branch. Run `bin/prep-release.sh 1.3.0` as the **final commit** on this
  branch so a single PR carries both the slug code (FIX-01/02/03) and the version
  bump.
- **Tag manually on `main` after merge.** Once the PR merges, `git tag v1.3.0`
  on the merge commit and `git push --tags`. `release.yml` verifies
  `tag == header Version == Stable tag` before building.
- **Self-merge after the gate is green.** Solo-maintained repo (`dpknauss`):
  open the PR for the record/CI, self-merge once CI passes. No external reviewer
  gate.
- The release tag must point at a `main` commit that contains `class-slug.php`
  and the replay wiring — currently those exist only on the feature branch.

### Regression gate & WP version
- **CI on the release PR is the authoritative green bar.** `ci.yml` already runs
  the entire gate on every push/PR: PHP unit (matrix), JS unit, WPCS (`composer
  lint`), PHPStan, composer + npm security audits, and **integration + e2e +
  Plugin Check** inside wp-env Docker (WP 7.0). All jobs green on the PR = the
  gate is satisfied. Per "gates enforce, reviewers judge" — no separate manual
  local full-suite run is required for this release.
- **`Tested up to` holds at 7.0** — matches the WordPress version CI's wp-env
  actually exercises (integration/e2e/Plugin Check). No untested compatibility
  claim. Do not bump without also updating the CI matrix and re-verifying.
- Plugin Check must report **0 errors** (success-criterion 1); CI runs it on the
  `build/maestro-menu-editor` tree produced by `bin/build.sh`.

### Upgrade Notice copy
- The `== Upgrade Notice ==` section stops at 1.2.0 and needs a `= 1.3.0 =`
  entry (the `== Changelog ==` 1.3.0 entry already exists, committed in 17-03).
- **Locked text** (plain-language, ends on the standard no-config line):
  > Reliability fix: your saved menu overrides keep applying after a site moves
  > hosts, a plugin update changes a menu URL's version number, tracking
  > parameters drift, or a slug's `&` is stored as `&amp;`. No configuration
  > changes required.

### SVN deploy & verification
- **Auto via release-published.** No manual deploy step: tagging fires
  `release.yml` (builds the zip, publishes the GitHub Release), and the
  `release: published` event auto-triggers `wp-deploy.yml` → 10up
  `action-wordpress-plugin-deploy` → SVN `trunk` + `1.3.0` tag + `.wordpress-org/`
  assets, using the `WP_ORG_SVN_USERNAME` / `WP_ORG_SVN_PASSWORD` secrets. This
  is exactly the v1.2.0 path. `bin/deploy-svn.sh` (local stage, manual `svn ci`)
  is the fallback only if Actions secrets/credentials are unavailable.
- **Done bar for REL-09 / Phase 18:** both `release.yml` and `wp-deploy.yml`
  complete **green** (zip asset attached to the GitHub Release; deploy job
  succeeds). The SVN `trunk`/`1.3.0` tag and the live wordpress.org listing
  showing 1.3.0 follow automatically and can be spot-checked, but are not gating
  (the live listing can lag the deploy by minutes–hours).

### GitHub Release notes
- **Keep auto-generated.** `release.yml` already sets
  `generate_release_notes: true`; leave as-is. No curated body needed.

### Failure / rollback posture
- **Fix-forward, never partial-publish.**
  - Pre-tag failures (CI red): fix on the branch, re-run CI, tag only when fully
    green. Never tag a red commit.
  - Deploy failures: diagnose and **re-run `wp-deploy.yml` for the same tag** —
    the 10up action is idempotent. If SVN was left partially updated, fix-forward
    with a **1.3.1** rather than rewriting history or trying to un-publish.
- No manual SVN-rollback procedure is specified: a published wp.org version
  can't be cleanly un-published, so a hotfix release is the real recovery path.

### Claude's Discretion
- Exact PR title/body wording and commit message for the version-bump commit.
- Order of operations within the gate (CI handles parallelism).
- Whether to spot-check SVN/live-listing post-deploy beyond the green-workflow bar.

</decisions>

<specifics>
## Specific Ideas

- The release is mechanically identical to v1.2.0 — the value of this phase is
  running the established pipeline correctly, not inventing process. The 12-03
  summary's closing instruction ("tag `v1.2.0` and trigger the `wp-deploy.yml`
  workflow") is the template.
- Single-PR-with-bump keeps the v1.3.0 tag pointing at one clean merge commit on
  `main` that contains both the fix and the version metadata — `release.yml`'s
  `tag == header == Stable tag` check then passes by construction.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/prep-release.sh <version>` — bumps the plugin header `Version:`,
  `MAESTRO_VERSION`, readme `Stable tag:`, and `playground/blueprint-stable.json`
  `ref`; runs `php -l` sanity check. All four currently read `1.2.0` / `v1.2.0`.
- `bin/build.sh` — assembles the runtime-only `build/maestro-menu-editor` tree
  and `maestro-menu-editor.zip` (plugin file, uninstall.php, includes/, assets/,
  languages/, readme.txt).
- `bin/deploy-svn.sh` — manual SVN staging fallback (stages `build/svn`, stops
  before `svn ci`).

### Established Patterns (CI/CD)
- `.github/workflows/ci.yml` — full gate on push/PR: deps/audits, PHP lint,
  WPCS, PHPStan, PHP unit (matrix), JS unit, integration+e2e (wp-env WP 7.0),
  Plugin Check. **This is the authoritative release gate.**
- `.github/workflows/release.yml` — on `push: tags v*`: verifies
  tag==header==Stable tag, builds the zip, publishes a GitHub Release with
  auto-generated notes and the zip asset.
- `.github/workflows/wp-deploy.yml` — on `release: published` (or manual
  `workflow_dispatch` with a tag input): verifies version, builds runtime tree,
  stages `.wordpress-org/` assets, deploys to SVN via the 10up action.

### Integration Points
- Version strings live in `maestro-menu-editor.php` (header + `MAESTRO_VERSION`),
  `readme.txt` (`Stable tag:`), and `playground/blueprint-stable.json` (`ref`) —
  all driven by `prep-release.sh`.
- `readme.txt` `== Upgrade Notice ==` needs the new `= 1.3.0 =` entry (manual,
  not scripted).
- The `package.json` `"version"` field (still `1.2.0`) is private tooling
  metadata, not shipped — out of scope unless the planner wants tidiness.

### Confirmed non-issues
- **i18n/POT:** `class-slug.php` adds no translatable strings → POT and the
  `languages/` catalogs need no refresh for 1.3.0.
- **Blueprint ref:** auto-bumped to `v1.3.0` by `prep-release.sh` (becomes a
  valid ref once the tag exists).

</code_context>

<deferred>
## Deferred Ideas

- **Curated GitHub Release body / changelog-as-release-notes** — could replace
  the auto-generated notes in a future release if a more polished release page is
  wanted; deferred (kept auto for v1.3.0).
- **Explicit SVN rollback runbook** — only worth writing if a future release has
  a genuine rollback need; the fix-forward (1.3.x) posture covers the realistic
  cases.
- **`package.json` version sync to the plugin version** — minor tooling hygiene;
  not release-blocking.

</deferred>

---

*Phase: 18-release-v1.3.0*
*Context gathered: 2026-06-29*
