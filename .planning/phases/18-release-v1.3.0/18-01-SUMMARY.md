---
phase: 18-release-v1.3.0
plan: 01
status: complete
completed: 2026-06-30
commit: 1f7155e
requirements: [REL-09]
---

# 18-01 Summary: Version bump to 1.3.0

**Objective met.** All four shipped version strings now read 1.3.0 / v1.3.0, the
`= 1.3.0 =` Upgrade Notice entry is in place, and the bump is the final commit on
`gsd/phase-17-slug-normalization` so PR #65 carries the FIX-01/02/03 slug code and
the release metadata together.

## What was done

| Task | Result |
|------|--------|
| 1. `bin/prep-release.sh 1.3.0` | Bumped header `* Version:` → 1.3.0, `MAESTRO_VERSION` → '1.3.0', readme `Stable tag:` → 1.3.0, `blueprint-stable.json` ref → v1.3.0; `php -l` clean |
| 2. Upgrade Notice | Added the locked `= 1.3.0 =` reliability entry as the first entry under `== Upgrade Notice ==`; existing 1.2.0/1.1.1/1.1.0 entries untouched |
| 3. Commit | `1f7155e chore(release): bump version to 1.3.0 and add upgrade notice` — HEAD of the release branch; working tree clean; nothing pushed |

## Verification (observable release-state — no new tests; CI is the validation)

- `maestro-menu-editor.php`: `* Version:           1.3.0` + `define( 'MAESTRO_VERSION', '1.3.0' )` ✓
- `readme.txt`: `Stable tag: 1.3.0` + Upgrade Notice `= 1.3.0 =` ending "No configuration changes required." ✓
- `playground/blueprint-stable.json`: `"ref": "v1.3.0"` ✓
- `php -l maestro-menu-editor.php` clean ✓
- Single bump commit at HEAD; **nothing pushed** (push is the gated 18-02 step) ✓

By construction this satisfies `release.yml`'s `tag == header Version == Stable tag`
check for the eventual `v1.3.0` tag.

## Notes

- `prep-release.sh`'s printed "Next steps" (create a `release/` branch) are superseded
  by the locked one-PR-on-this-branch strategy — no new branch created.
- `Tested up to` left at 7.0 per CONTEXT; no translatable strings changed (POT untouched).

## Next

**18-02** — push the branch, confirm PR #65 CI green, self-merge to `main`, tag
`v1.3.0` on the merge commit. All outward-facing steps are confirmation-gated.
