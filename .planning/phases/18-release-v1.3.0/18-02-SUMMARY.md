---
phase: 18-release-v1.3.0
plan: 02
status: complete
completed: 2026-06-30
reconstructed: 2026-07-02
reconstructed_note: "Written retroactively during the v1.3.0 milestone audit. The merge/tag steps executed on 2026-06-30 but were never recorded as a SUMMARY; this reconstructs them from git history, the merged PRs, and the release-workflow run."
commit: 884c6df
requirements: [REL-09]
---

# 18-02 Summary: Merge release PR + tag v1.3.0

**Objective met.** The Phase 17 slug code + 1.3.0 version metadata landed on `main`
via PR #65, and after two follow-up PRs closed the release checklist, `v1.3.0` was
tagged on the resulting `main` commit and pushed — firing the release pipeline.

## What was done

| Task | Result |
|------|--------|
| Push branch + confirm CI green | `gsd/phase-17-slug-normalization` pushed; **PR #65** ("Phase 17: Slug Normalization — overrides survive slug drift") ran the full `ci.yml` gate green (13/13 — unit/JS/WPCS/PHPStan/audits + integration+e2e+Plugin Check on WP 7.0) |
| Merge to `main` | PR #65 **merged 2026-06-30T03:18:48Z** (merge commit `9c4319d`); merge commit contains `includes/class-slug.php` + replay wiring + the 1.3.0 version strings |
| Close remaining release-checklist items | **PR #66** added the missing user-facing changelog line (the #55 toolbar Exit-icon change since `v1.2.0`); **PR #72** refreshed the directory screenshots for the shipping v1.3.0 UI |
| Tag `v1.3.0` + push | Tag `v1.3.0` = commit **`884c6df`** ("Merge pull request #72 …") — the final `main` commit carrying all shipped code + final readme + refreshed assets; pushed to origin, triggering `release.yml` |

## Deviation from plan

18-02-PLAN assumed a **single** PR (`#65`) whose merge commit would be tagged
directly. In practice two follow-up PRs (#66 changelog, #72 screenshot refresh)
were required to satisfy release-checklist items 3 and 5 before tagging, so the
`v1.3.0` tag points at **`884c6df` (PR #72's merge commit)**, not PR #65's merge
commit `9c4319d`. Net effect is identical and stronger: the tag points at a `main`
commit containing all code **plus** the final changelog and refreshed assets.

## Verification (observable git/GitHub state)

- `git merge-base --is-ancestor v1.3.0 main` → true; `v1.3.0` → `884c6df` ✓
- PR #65 state MERGED, base `main`, head `gsd/phase-17-slug-normalization` ✓
- Header `Version: 1.3.0`, `MAESTRO_VERSION '1.3.0'`, readme `Stable tag: 1.3.0` all present at the tagged commit ✓

## Next

**18-03** — confirm `release.yml` published the GitHub Release with the zip asset,
and `wp-deploy.yml` deployed to WordPress.org SVN (trunk + 1.3.0 tag + assets).
