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

## A second candidate, with a control already in the repo

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

**`hidden-users.spec.ts` is the control, and it already ran this experiment.** Its
own docblock records the identical signature — *"originally failed in CI on all
three attempts for exactly that reason while passing locally every time"* — and
its fix was `test.slow()` (a 90s budget) plus hoisting both logins into
`beforeAll`. It has not flaked since.

So the two specs that still flake are precisely the two that never got that
treatment. That is a good deal stronger than a bare timing guess, and it makes
the hypothesis falsifiable: if the budget is the cause, the same remedy should
work here.

**Still not confirmed.** The failure artefacts from the 2026-08-24 run were not
kept, so the failure mode was not read.

*(Correlation corrected 2026-08-24 after Codex review on #181: the first draft of
this todo listed `hidden-users.spec.ts` as a third mid-test-login spec. It is not
— its logins are in `beforeAll` and it already carries `test.slow()`. Including it
made the claim false and would have pointed the investigation at a spec that had
already solved the problem.)*

## To settle it

1. Reproduce with artefacts kept, and read whether the failure is a **test
   timeout** or a **failed assertion**. That single fact separates the two
   hypotheses: a timeout points at the budget, an assertion points at state.
2. If it is a timeout, apply what `hidden-users.spec.ts` already proved: add
   `test.slow()` to the affected describes in `editor.spec.ts` and
   `cascade-hide.spec.ts`. Prefer that over raising the global `timeout`, which
   would slow every genuine failure in the suite to a 30s+ crawl.

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
