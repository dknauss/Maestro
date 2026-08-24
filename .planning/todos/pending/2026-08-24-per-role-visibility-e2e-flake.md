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

## A second candidate, unverified

The three specs that fail this way — `editor.spec.ts`, `cascade-hide.spec.ts`,
`hidden-users.spec.ts` — are exactly the three that sign in as a **second user**
mid-test via `browser.newContext()`.

`playwright.config.ts` raised `navigationTimeout` to **60000** for that reason,
noting a wp-env login is the slowest navigation in the suite and can exceed the
default on a loaded machine. But the per-test budget is still **`timeout: 30_000`**.

A navigation allowed 60s inside a test allowed 30s cannot use its allowance: the
test dies first, and it presents as a timeout in whichever assertion follows the
login rather than at the login itself. That would explain why it only appears in
full runs (machine already loaded by ~90 preceding tests) and never in isolation.

**Not confirmed** — the failure artefacts from the 2026-08-24 run were not kept,
so the failure mode was not read. Confirming it is the first step, not the fix.

## To settle it

1. Reproduce with artefacts kept, and read whether the failure is a **test
   timeout** or a **failed assertion**. That single fact separates the two
   hypotheses: a timeout points at the budget, an assertion points at state.
2. If it is a timeout, either raise `timeout` for the specs that log in twice
   (`test.setTimeout()` per spec, rather than globally) or make the secondary
   login cheaper — a stored `storageState` for `maestro_editor`, as
   `auth.setup.ts` already does for admin, would remove the login from the test
   path entirely.
3. If it is an assertion, the shared-option theory is back on the table and wants
   the actual leak identified rather than assumed.

## Worth fixing rather than tolerating

CI's two retries hide it, which means the suite reports green while containing a
test that fails roughly one full run in one. That erodes the signal every other
test depends on — and a genuine regression in this test would also be retried
into invisibility.
