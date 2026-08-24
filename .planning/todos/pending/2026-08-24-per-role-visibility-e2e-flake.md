# `per-role visibility hides an item from that role only` fails in full runs, passes alone

**Raised:** 2026-08-24. Promised a todo of its own by `compat/WP-7.1-COMPAT.md`
("it will bite CI eventually and is worth its own todo"); this is that todo.

`tests/e2e/editor.spec.ts:278`.

## Observed

- **2026-08-24**, local full run in CI's order (`npm run test:php` then
  `npm run test:e2e`): failed. Re-run in isolation immediately afterwards:
  passed. 64 passed / 1 failed on the full run.
- **First seen in [#159](https://github.com/dknauss/Maestro/pull/159)**, and
  recorded there as timing out on a first full e2e run, passing in isolation and
  on re-run. Not introduced by that PR.

CI sets `retries: 2`, so this currently self-heals there and shows as green. That
is why it has survived: it is only visible locally, where `retries` is 0.

## The register's hypothesis

`compat/WP-7.1-COMPAT.md` attributes it to the suite sharing one WordPress
instance and one `maestro_config` option row, which `tests/e2e/fixtures.ts`
already documents as an isolation hazard.

**That explanation is weak on its own.** `playwright.config.ts` sets `workers: 1`
and `fullyParallel: false` precisely so the shared-option reset cannot race, and
the config comment argues that this makes it race-free rather than merely rarer.
If the shared row were the cause, the mitigation already in place should have
removed it.

## A second candidate, with corroborating evidence in the repo

The specs that sign in as a **second user mid-test**, under the default per-test
budget, are two:

| Spec | Secondary login | `test.slow()` | Flakes? |
|---|---|---|---|
| `editor.spec.ts:300` | mid-test | no | **yes** |
| `cascade-hide.spec.ts:151,255` | mid-test | no | **yes** |
| `hidden-users.spec.ts:129` | in `beforeAll` | **yes** (`:144`) | no |

`playwright.config.ts` raised `navigationTimeout` to **60000** because a wp-env
login is the slowest navigation in the suite. But the per-test budget is still
**`timeout: 30_000`**, so a navigation allowed 60s sits inside a test allowed 30s
and cannot use its allowance — the test dies first, surfacing as a timeout in
whichever assertion follows the login rather than at the login itself.

### `hidden-users.spec.ts` corroborates — it does not isolate

The first version of this todo called it a control that had "already run this
experiment." That claim does not survive reading the history.

`37719b3` ("stop hidden-users.spec.ts flaking in CI") changed **three things at
once**: an explicit `waitForURL( …, { timeout: 60000 } )`, `test.slow()`, and
hoisting into `beforeAll`. `a1769f9` then globalised the navigation budget into
`playwright.config.ts` and moved both login sessions into `beforeAll`. Its
stopping flaking therefore tells us the bundle worked, not which part did.

Two things follow, and they cut against the hypothesis rather than for it:

- **The commit message names a different culprit.** It records the failure as
  *"`signInAs` timing out on waitForURL after clicking submit"*, and its first
  remedy was the explicit 60s navigation budget — the thing `a1769f9` later made
  global. That budget **already applies** to `editor.spec.ts` and
  `cascade-hide.spec.ts`, so the fix that plausibly mattered there is not missing
  here.
- **`test.slow()` is not even covering the login in that spec.** It extends the
  budget of *tests*; since `a1769f9` the logins run in `beforeAll`, which is a
  separate budget. So the annotation being present cannot be what protects the
  login, and pointing at it as proof is wrong on the mechanics.

What remains is narrower and worth stating plainly: the per-test budget is 30s
while a navigation inside it may take up to 60s, so a slow login *can* exhaust
the test before it exhausts the navigation. That is a real inconsistency and it
fits the observed pattern — but `hidden-users.spec.ts` is corroborating evidence
at best, not a demonstration.

**Still not confirmed.** The failure artefacts from the 2026-08-24 run were not
kept, so the failure mode was not read.

*(Two corrections from Codex review on #181, both to this todo rather than to the
code. First: the original draft listed `hidden-users.spec.ts` as a third
mid-test-login spec. It is not — its logins are in `beforeAll` and it already
carries `test.slow()` — and including it made the central claim false. Second:
the remedy originally said to annotate the affected describes, which in
`editor.spec.ts` would have slowed 11 unrelated tests and contradicted this
todo's own argument against a global timeout bump. Third: this todo called
`hidden-users.spec.ts` a control that had already proved the fix, when its repair
changed three variables at once and `test.slow()` does not even cover the
`beforeAll` where its logins now run.)*

## To settle it

1. Reproduce with artefacts kept, and read whether the failure is a **test
   timeout** or a **failed assertion**. That single fact separates the two
   hypotheses: a timeout points at the budget, an assertion points at state.
2. If it is a timeout, run it as a **single-variable experiment**: add
   `test.slow()` to `editor.spec.ts:278` **alone**, change nothing else, and see
   whether full runs stop failing. Changing several things at once is what left
   `hidden-users.spec.ts` unable to answer this question, and repeating that
   would waste the second chance.

   Scope it **inside the individual tests that log in, not on their describes**.

   That distinction matters in `editor.spec.ts`. The
   `Admin Menu Maestro — editor` describe (`:16`) holds **12** tests and only one
   of them (`:278`) logs in mid-test; annotating the describe would hand the
   other 11 a 90s budget and reproduce, at describe scope, exactly the
   slow-every-real-failure cost that argues against raising the global `timeout`.

   In `cascade-hide.spec.ts` both tests (`:60`, `:185`) log in, so describe and
   per-test scope coincide there — but keep it per-test anyway, so the annotation
   marks *why* a given test is slow rather than becoming ambient.

   The stronger version, if it recurs after that: a stored `storageState` for
   `maestro_editor`, as `auth.setup.ts` already does for admin, removing the
   login from the test path entirely rather than budgeting for it.
3. If it is an assertion, the shared-option theory is back on the table and wants
   the actual leak identified rather than assumed.

## Worth fixing rather than tolerating

CI's two retries hide it, which means the suite reports green while containing a
test that fails roughly one full run in one. That erodes the signal every other
test depends on — and a genuine regression in this test would also be retried
into invisibility.
