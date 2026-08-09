# Phase 21 · Plan 03 — Summary

**Completed:** 2026-08-08
**Commit:** `fb06067`
**Status:** ✅ Complete (3/3 tasks — two were already satisfied by 21-02)

## What shipped

`tests/integration/CosmeticInvariantUsersTest.php` — the §6 guardrail sketch,
implemented literally and enforcing, for both per-user axes.

Six tests, 31 assertions: the full six-step invariant for the item axis and the
child axis separately (they drop rows through different paths), the role
capability *map* asserted byte-identical, the §11 direct-URL escape hatch, a
no-grant check against control capabilities the role never held, and a bystander
case proving an untargeted user is entirely unaffected.

Design choices carried from the plan: the capability set is read off the **live
role object** rather than hand-listed, so a capability added by a future
WordPress version cannot escape the net; the **whole map** is asserted at once
rather than per-capability, because a broken safety invariant is something you
want to read in full.

## Tasks 2 and 3 were already done

Both were satisfied while executing 21-02 and needed no new work here:

- **Task 2** (super-admin exemption) — implemented under the 2026-08-08 ruling,
  multisite-scoped. Checkpoint closed before this plan started.
- **Task 3** (anti-lockout rail) — the tripwire test landed in
  `ReplayHiddenUsersTest` alongside the axis it constrains.

## The sanity check earned its place

The plan required proving the guardrail can actually fail. It could barely.

Injecting `get_role('editor')->add_cap('manage_options')` into the hide seam
produced **one** failure — and not in a six-step test. It surfaced in an
unrelated test's *precondition*, via the mutated role leaking across tests in the
same process. The six-step tests passed a demonstrably broken seam.

Cause: `current_user_can()` answers from the `allcaps` array cached on the
`WP_User` object at first use. A seam that mutates the role mid-request keeps
returning pre-mutation answers, so a same-request before/after comparison sees
nothing. The obvious fix — calling `wp_set_current_user()` again — is also a
no-op, because core short-circuits when the id is unchanged.

`snapshot_caps()` now drops `$GLOBALS['current_user']` before re-setting it, so
`WP_User::__construct()` re-derives `allcaps` from the role. With that in place
the primary six-step test catches the break directly. The reasoning is recorded
in the method docblock so it does not get "simplified" away later.

Worth stating plainly: without running the sanity check, this phase would have
shipped a guardrail that looked thorough, passed cleanly, and could not detect
the exact failure it exists to prevent.

## Verification

| Check | Result |
|---|---|
| `npm run test:php` | ✅ 102/102, 246 assertions (was 96/215) |
| `composer test:unit` | ✅ 165/165, 218 assertions |
| `composer lint` (WPCS) | ✅ clean |
| `composer analyse:phpstan` | ✅ 0 errors |
| `npm run check:doc-links` | ✅ clean |
| Guardrail proven falsifiable | ✅ break injected → six-step test RED → reverted, `git diff` clean |

## Downstream notes

- The guardrail is axis-agnostic in structure. When the deferred `hidden_profiles`
  half lands, it should extend this file rather than start a new one — the §6
  sketch explicitly anticipates covering the profiles axis with the same steps.
- **Still-open coverage gap (carried from 21-02):** the multisite super-admin
  exempt branch has no direct test. The integration suite runs single-site and
  the single-site assertion skips under multisite. **21-05 Task 5 must state this
  at the checkpoint** rather than let it surface later as a support ticket.
- `snapshot_caps()`'s user rebuild is a correctness requirement, not a style
  choice. Any future refactor that "tidies" it re-breaks the guardrail silently.

## Next

21-04 — editor model exposure, popover user sections, async user picker.
