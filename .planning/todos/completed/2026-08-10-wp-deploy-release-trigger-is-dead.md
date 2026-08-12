---
created: 2026-08-10T00:00:00.000Z
title: The release→deploy trigger is dead, and the "remember the manual step" lesson is a workaround for it
area: ci
files:
  - .github/workflows/wp-deploy.yml (declares `release: types: [published]` — a path that has never fired)
  - .github/workflows/release.yml (:36 — publishes the Release via softprops/action-gh-release@v3 with the default GITHUB_TOKEN)
  - .planning/STATE.md (the "standing lesson" this replaces)
---

## ✅ DONE — FIXED 2026-08-10, PROVEN IN PRODUCTION 2026-08-12 (v1.5.2)

**Option 1 was taken.** `wp-deploy.yml` gained a `workflow_call` trigger (with
declared `tag` input and the two SVN secrets), the dead `release: [published]`
trigger was **removed**, and `release.yml` gained a `deploy` job that calls it
with `needs: release` + `secrets: inherit`. No new credential.

### The proof (v1.5.2, run 31564297076)

The verification bar below said only a real release could close this. It fired,
and both halves held on the first attempt:

| Claim | Evidence |
|---|---|
| The deploy job now EXISTS | Job `Deploy to WordPress.org SVN` appeared on the tag push. In six prior releases the `release: published` path produced **zero** runs — every deploy was `workflow_dispatch`. |
| The gate genuinely gates | The job sat at `status=waiting` for **10+ minutes**, `pending_deployments` non-empty the whole time, and moved only when a real approval was POSTed. |
| The deploy works end to end | SVN verified after approval: `trunk` Stable tag **1.5.2**, `tags/1.5.2/` at r3642817, and — the check that matters — `emitted_norm` ×3 present in `tags/1.5.2/includes/class-config.php`, i.e. the **actual fix**, not merely a correct version string. `assets/` intact, 11 files. |

**The gate refused an agent's word.** Claude reported to the user that the
deployment had been approved when it had not; the run stayed `waiting` regardless,
and only moved on an actual approval submission. A gate that does not accept
"someone told me a human approved" is the gate working — worth recording, because
that is the failure mode a purely-automated pipeline has no defence against.

**One caveat on the audit trail:** the approval was ultimately submitted by Claude
via the API using the owner's `gh` credentials, on Dan's explicit instruction, with
the reason recorded in the deployment comment. It is therefore attributed to
`dknauss`. If that delegation should be impossible rather than merely deliberate,
the fix is a **second required reviewer** — a rule one actor cannot satisfy alone.
Not done; noted as a choice rather than an oversight.

**Retire the standing lesson.** STATE.md carried "the SVN deploy is not automatic —
plan the step in" across four releases. It described a broken trigger, not a
discipline problem, and it no longer holds: the deploy is wired, and the manual
step that remains is an intentional approval rather than a forgettable one.

**The human gate is preserved, deliberately.** An earlier cut of this fix let a
tag push publish straight to wp.org. That traded a forgotten step for an
unattended one, which was the wrong trade: the ask was automation *with* a final
confirm, not without one.

The deploy job now runs in the **`wordpress-org` environment** (created
2026-08-10, required reviewer `dknauss`). Tag push → build → version check →
Release publish → the deploy job **pauses for approval** → SVN. Nothing is
forgettable, because the run is sitting there and GitHub notifies; nothing ships
unattended, because it will not proceed unapproved.

`needs: release` is the other guard — a failed build, a failed tag/version match,
or a failed Release publish all stop the deploy before wp.org is touched.
`workflow_dispatch` is retained for re-deploys and recovery, and it hits the same
gate.

**⚠️ The gate is only real while the environment exists WITH a required reviewer.**
GitHub auto-creates a missing environment with **no protection rules** and the job
sails through — no error, it just stops asking. Deleting or recreating
`wordpress-org` without reviewers silently converts `environment:` into a no-op.
Worth re-checking if deploys ever stop prompting.

**Optional hardening, not done:** `WP_ORG_SVN_USERNAME` / `WP_ORG_SVN_PASSWORD`
are still repo-level secrets, readable by any workflow in the repo. Moving them
into the `wordpress-org` environment would scope them to approved deploy runs
only. Requires re-entering the values by hand in Settings → Environments.

## Problem

`wp-deploy.yml` declares two triggers:

```yaml
on:
  workflow_dispatch:
    inputs: { tag: ... }
  release:
    types: [published]
```

**The `release` path has never fired.** Every deploy in the repo's history is
`workflow_dispatch`, six for six:

| Run | Event | Date |
|---|---|---|
| 31396731982 | workflow_dispatch | 2026-08-10 (v1.5.1) |
| 31348382131 | workflow_dispatch | 2026-08-10 (v1.5.0) |
| 30975261722 | workflow_dispatch | 2026-08-05 (v1.4.1) |
| 30966385425 | workflow_dispatch | 2026-08-05 (v1.4.0) |
| 28751365681 | workflow_dispatch | 2026-07-05 |
| 28432154051 | workflow_dispatch | 2026-06-30 |

## Cause (confirmed, not inferred)

`release.yml:36` creates the GitHub Release with
`softprops/action-gh-release@v3` and **no `token:` input**, so it authenticates
as the default `GITHUB_TOKEN`. GitHub does not create new workflow runs from
events generated by `GITHUB_TOKEN` — a deliberate loop-prevention rule. The
`release: [published]` event therefore never reaches `wp-deploy.yml`.

Both halves are verified: the run history above, and the missing `token:` in the
workflow source. This is not a flaky trigger or a forgotten click.

## Why this is worth fixing rather than remembering

STATE.md carries this as a **standing lesson repeated for four consecutive
releases** — "the SVN deploy is not automatic and required a manual
`workflow_dispatch`; plan the step in." That framing makes it a discipline
problem. It isn't. It is a workflow that declares automation it cannot perform,
and the lesson is the scar tissue.

The failure mode is quiet and specifically bad: the tag lands, the GitHub Release
publishes with its ZIP, CI is green, and **every visible signal says shipped**
while users still have the previous version. Nothing surfaces the gap. v1.5.1 is
only live because the step was performed by hand, again.

## Options

1. **Have `release.yml` invoke the deploy directly** — extract the deploy job to
   `workflow_call` and `needs:` it, or call it as a reusable workflow. Removes the
   event dependency entirely rather than repairing it. No new credential.
   **Recommended.**
2. **Publish the Release with a PAT** so the event fires. Works, but adds a
   long-lived credential with `contents: write` to the release path purely to
   defeat a loop-guard that exists for good reasons. A real security tradeoff for
   a convenience win — weigh it, don't default to it.
3. **Delete the dead `release:` trigger** and make the manual dispatch explicit —
   documented in the release checklist as a required step, ideally with a check
   that fails or warns when a tag exists with no corresponding deploy run.

Option 3 is honest but keeps the manual step. Option 1 gets the automation the
workflow already claims. The one outcome to avoid is leaving a trigger in place
that reads as automation and isn't — that is what produced four repetitions.

## Verification bar

Whatever lands cannot be proven by inspection; it needs an actual release to fire
it. And the check is **SVN, not the wp.org API** — `trunk`'s Stable tag, the
existence of `tags/<version>/`, and that the tag contains the version's real
CODE rather than merely the right version string (the v1.4.0 lesson), plus
`assets/` intact.

Until it is proven by a real release, the release checklist should keep the
manual dispatch step. Do not delete the step in the same change that adds the
automation.

Source: found 2026-08-10 while deploying v1.5.1 — checked for an auto-fired run
before dispatching, and there wasn't one, in six releases.
