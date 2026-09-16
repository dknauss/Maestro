# `per-role visibility hides an item from that role only` fails in full runs, passes alone

**Status as of 2026-08-25:** Investigation remains open. PR #182 changed the
secondary-login path and changed Playwright tracing to retain failed attempts;
the latest full CI run is green, but that does not prove the underlying race is
gone. Keep this todo pending until a retained artefact either identifies the
failure or repeated full runs establish that it no longer reproduces.


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

## A second candidate, with corroborating evidence in the repo — since CONFIRMED

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

**Still not confirmed.** The 2026-08-24 failure artefacts were not kept, but
PR #182 now uploads retained Playwright artefacts and removes the slow secondary
login from the test path. The first successful run after that change is
encouraging, not conclusive; close this todo only after the new evidence is
reviewed or the failure is demonstrated to be gone.

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

## Experiment run 2026-08-24 — it did not reproduce, and that is the result

Step 1 (read the failure mode) could not be completed, because the failure would
not happen.

| Attempt | Result |
|---|---|
| 3 × full suite in CI's order (`test:php` then `test:e2e`) | **65 passed, 0 failed** each time |
| `editor.spec.ts` under 10 synthetic CPU hogs on 8 cores | 27 passed; the per-role test in **4.9s** |

**So the frequency claim in this todo was wrong.** "About one full run in one" was
extrapolated from a single observation. Four consecutive clean runs put it far
lower, and the honest statement is that the rate is unknown and low.

That also means **the single-variable experiment in step 2 cannot be run yet.**
With a baseline of zero failures, adding `test.slow()` and observing a pass
carries no information — it would be a change made on unfalsifiable grounds,
which is the same error as the multi-variable fix this todo criticises, wearing
different clothes. No `test.slow()` has been added.

### The mechanism looks unlikely at ordinary slowness

Measured the secondary login directly, under browser CPU throttling:

| CPU throttle | login | + dashboard | total |
|---|---|---|---|
| 1x | 526ms | 141ms | 667ms |
| 4x | 1224ms | 400ms | 1624ms |
| 10x | 2808ms | 944ms | 3752ms |
| 20x | 5687ms | 1960ms | 7647ms |

At 20x the login is **5.7s** — five times under the 30s per-test budget. Reaching
30s would need roughly 100x, which browser-side slowness does not plausibly
produce.

Note the limit of this measurement: `Emulation.setCPUThrottlingRate` slows the
**renderer**, not the wp-env container. The login is server-bound, so what it
rules out is browser-side cost, not a stalled MySQL or PHP. A cold or contended
container remains a live candidate — `auth.setup.ts` documents exactly that
failure ("a cold/slow wp-env exceeding the nav timeout sank the entire E2E run")
— and this experiment does not touch it.

### What changed instead: CI now keeps the evidence

The useful finding was elsewhere. `playwright.config.ts` sets
`trace: 'on-first-retry'`, and CI runs `retries: 2` — so **CI has been recording a
trace for every one of these failures and discarding it**, because the only
`upload-artifact` step in `ci.yml` was for the runtime ZIP.

Every past occurrence was diagnosable. The diagnosis was binned each time, which
is why two investigations have now bounced off this.

`ci.yml` now uploads `test-results/` and `playwright-report/` after the E2E step,
retained 14 days. Since the flake does not reproduce locally, CI is the only
place the evidence exists, and this is what makes step 1 possible on the next
occurrence rather than the next attempt to force one.

**The upload runs on `always()`, not `failure()`, and that distinction is the
whole point.** This failure *recovers on retry* — which is why CI reports green —
so Playwright exits 0 and the step succeeds. `failure()` would have skipped the
upload for exactly the runs worth reading, capturing only failures that exhausted
both retries. Caught in review on #182; the first version had it wrong.

That uncertainty is now settled, and it needed a second fix. `on-first-retry`
records **the retry** — the attempt that *passed* in a green flake — so the
uploaded trace would have shown the run that worked and explained nothing. The
config is now `trace: 'retain-on-failure'`, which traces every attempt and keeps
the failed ones, so attempt 0 survives a recovered retry.

Cost: recording overhead on every test. #174 bounded CI runtime deliberately, so
watch the E2E job duration on the next few runs and reconsider if it moves much.

### Revised order of work

1. **Wait for the next CI failure** and download the artefact. The trace answers
   the timeout-vs-assertion question directly, and shows where the time went.
2. Only then choose a remedy — and if it is a timeout, apply `test.slow()` to
   `editor.spec.ts:278` alone, as below.

## ✅ CONFIRMED 2026-08-24 — by CI, on the run that added the artefact upload

The experiment could not be forced locally. CI answered it unprompted, on the very
PR that made failures diagnosable ([#182](https://github.com/dknauss/Maestro/pull/182),
run `32789152952`):

```
✘ cascade-hide.spec.ts:60  … (31.5s)
✘ cascade-hide.spec.ts:185 … (31.5s)
✘ hidden-users.spec.ts:146 … (0ms)   ← and on both retries

Test timeout of 30000ms exceeded.
Error: page.waitForURL: Test ended.
1 failed, 2 flaky, 59 passed
```

**It is a timeout, not an assertion** — which settles the two hypotheses. The
shared `maestro_config` row is exonerated; the 30s-test-budget-around-a-60s-
navigation mismatch is the cause, and the failure lands in `waitForURL` on the
secondary login exactly as predicted. 31.5s is the 30s budget plus teardown.

Two refinements the evidence forced:

- **It is not specific to `editor.spec.ts`.** This run hit `cascade-hide.spec.ts`,
  both of its tests. The unit is *any test that logs in mid-test*, which is what
  the table above already said — the per-role test was simply the first instance
  anyone noticed.
- **`hidden-users.spec.ts` is not protected after all**, and Codex called this
  before the evidence arrived. Its tests failed at **0ms on all three attempts**,
  the signature of a blown `beforeAll` — because `test.slow()` extends *test*
  budgets and `a1769f9` moved its two logins into the hook, which kept the
  default 30s while performing the two slowest navigations in the suite.

## Fixed

One variable, applied to every affected site now that the cause is known rather
than guessed:

| Site | Change |
|---|---|
| `editor.spec.ts:278` | `test.slow()` inside the test |
| `cascade-hide.spec.ts:60`, `:185` | `test.slow()` inside each test |
| `hidden-users.spec.ts` `beforeAll` | `test.setTimeout( 120000 )` — `test.slow()` cannot reach a hook |

Scoped per-test, never per-describe: the `Admin Menu Maestro — editor` describe
holds 12 tests and only one logs in.

Local verification is weak by construction — it never reproduced here — so the
proof is CI staying green across subsequent runs. Watch for `flaky` in the
Playwright summary, not just the exit code: a recovered retry still reports
success.

### The fix helped and did not finish the job

Verified on the next CI run (`32790711889`): **63 passed, 2 flaky, 0 failed** —
no hard failure, both tests recover. But they still fail attempt 0:

```
✘ editor.spec.ts:278       (1.1m)   → ✓ retry #1 (4.6s)
✘ cascade-hide.spec.ts:189 (1.1m)   → ✓ retry #1 (8.1s)
```

**The wall moved from 30s to ~60s rather than disappearing.** 66s is
`navigationTimeout: 60000` plus teardown, so what is now being exceeded is the
*navigation* budget, not the test budget. Raising the test budget revealed the
deeper fact it was masking: **on a cold CI container the secondary login really
does take more than 60 seconds**, and the retry passes in 4.6s only because the
container is warm by then.

That is the same failure seen locally on `auth.setup.ts` against a freshly started
wp-env — `page.waitForURL: Timeout 60000ms exceeded` — so it is one problem, not
two.

**So budgets are the wrong lever from here.** Raising `navigationTimeout` again
just moves the wall a third time. The durable fix is to stop paying for the login
at all, which this todo already named as the stronger version:

- a stored `storageState` for `maestro_editor`, exactly as `auth.setup.ts` already
  does for `admin`, so the secondary sessions are restored rather than
  re-authenticated; or
- a warm-up step before the e2e run, so the first login is not the one that pays
  for container start-up.

The first is better: it removes the slow operation instead of budgeting for it,
and the repo already has the pattern. It is a change to shared harness setup
(a second setup project plus a storageState file, and updating the three specs
that log in), so it wants its own PR rather than riding on this one.

**Status at that point: improved, not closed** — hard failures gone, the flake
reduced to a recovered retry. See below: the login has since been taken off the
test path.

### storageState — the login is off the test path

Done. `auth.setup.ts` now stores a **`maestro_editor`** session alongside the
admin one, and the three tests that used to sign in mid-test restore it instead:
`editor.spec.ts:278`, `cascade-hide.spec.ts:60` and `:189`. Exported as
`EDITOR_STATE` from `fixtures.ts` so there is one path, not three literals.

**`hidden-users.spec.ts` could not use the same fix**, and the reason is worth
recording rather than rediscovering. Its two users are created and deleted *by the
spec*, per run — a stored cookie would outlive the account it authenticates. So
the login stays there and got the resilience it was missing instead: the whole
sequence is wrapped in `expect(...).toPass()` with short per-attempt timeouts, the
same shape as the readiness gate `auth.setup.ts` already used.

That mattered, because the failure was **not** a hook-budget problem:
`page.waitForURL: Timeout 60000ms exceeded` is the *navigation* cap, and raising
`test.setTimeout` could never have reached it. Retrying a fast-failing attempt can.

Two things fell out of doing it:

- **The new editor login in setup inherited the same vulnerability** it was added
  to remove, and failed at 60s on a fresh context. `submitLogin()` now retries the
  load *and* the submit, so both sessions are created the same way.
- **`setup.slow()` was actively harmful here.** It triples 30s to 90s, which is
  less than two logins retried for up to 120s each can legitimately need — the
  ceiling would have aborted the recovery it exists to allow. Replaced with an
  explicit `setup.setTimeout( 300_000 )`. The old standalone readiness gate is
  folded into `submitLogin()`, since two nested retry loops stacked their budgets
  for no extra coverage.

**Verified locally:** full suite in CI's order, from a cleared `.auth/`, **65
passed, 0 flaky, 0 failed**. Local verification stays weak — this never reproduced
here — so the real proof is CI runs with no `flaky` in the summary.

The `test.slow()` annotations added earlier are retained transitionally and marked
as such in the specs. Their stated reason is gone; remove them once CI has been
clean for several runs rather than leaving guards whose rationale has expired.

### A related crack this exposed, not yet closed

While verifying the fix, `auth.setup.ts` itself failed against a freshly started
container with `page.waitForURL: Timeout 60000ms exceeded` — the admin login
exceeding `navigationTimeout` on a cold wp-env. Same family, one layer up, and
not addressed by any of the above. It passed on retry once the container warmed.
Worth its own look if it recurs.

## Worth fixing rather than tolerating

CI's two retries hide it, which means the suite reports green while containing a
test that fails roughly one full run in one. That erodes the signal every other
test depends on — and a genuine regression in this test would also be retried
into invisibility.
