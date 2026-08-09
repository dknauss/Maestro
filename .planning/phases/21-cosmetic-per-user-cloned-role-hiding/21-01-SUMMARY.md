# Phase 21 · Plan 01 — Summary

**Completed:** 2026-08-08
**Commit:** `2a18acc`
**Status:** ✅ Complete (2/2 tasks)

## What shipped

ROLE-02's storage contract in `Config::sanitize()` — the two per-user axes every
later plan in the phase reads and writes.

| Axis | Key scopes | Cap | Empty |
|---|---|---|---|
| `hidden_users` | bare **and** qualified | `MAX_HIDDEN_USERS` = 50 | key omitted |
| `child_hidden_users` | bare top-level only | `MAX_HIDDEN_USERS` = 50 | key omitted |

Both mirror the shipped role axes: coerce → dedupe → intersect against live →
cap, sparse throughout (reset = key deletion).

## Decisions taken during execution

**Lazy resolution of the live user-ID set.** The plan called for it and the reason
held up: `wp_roles()` on the line above is a cheap read of an already-loaded
global, but `get_users()` is a query. Resolving it lazily on first use means a
config with no per-user axis — which is *every* config written before this
feature — pays nothing, and one with fifty items pays once. Isolated behind
`live_user_ids()` so the query has exactly one call site to audit.

**Intersect before cap, not after.** `clean_user_ids()` intersects against live
IDs first and only then applies the 50 ceiling. Capping first would let 50 slots
be consumed by IDs resolving to nobody, silently dropping the real targets — a
data-loss bug that would only surface on a site that had deleted users.

**Non-scalars skipped rather than cast.** `(int)` on an array yields 1 and on
`null` yields 0, either of which invents a target the client never sent. They are
filtered out before coercion.

**Helpers extracted rather than inlined.** The role blocks are inline, but doing
that twice more would have put four near-identical pipelines in one method.
`live_user_ids()` + `clean_user_ids()` keep both new blocks to six lines each.

## Verification

| Check | Result |
|---|---|
| `composer test:unit` | ✅ 158/158, 210 assertions (was 145/194) |
| `composer lint` (WPCS) | ✅ clean, 11/11 files |
| `composer analyse:phpstan` | ✅ 0 errors |
| RED-before-GREEN | ✅ confirmed — 9 failures pre-implementation, all new cases |

13 new unit cases. The one worth naming is
`test_role_only_config_is_unchanged_by_the_user_axes`: it asserts a role-only
config sanitizes to a byte-identical array, which is the cheapest available proof
that this plan did not disturb v1.4.1 behavior. It passed before the
implementation landed too, which is what makes it a real baseline rather than a
post-hoc rationalization.

`tests/bootstrap-unit.php` gained a `get_users()` stub returning 60 IDs, mirroring
the existing 60-role `wp_roles()` stub so the cap test exercises cleanly. The stub
deliberately honours only the `fields => ID` shape and ignores every other query
arg, so a future caller needing richer behaviour has to extend it consciously
instead of silently receiving a wrong answer.

**Not run here:** integration and e2e. This plan touches no WP-coupled path and
21-01's verification block scopes to unit + lint + PHPStan; CI runs the full
suites on the PR.

## Downstream notes

- `MAX_HIDDEN_USERS` is deliberately equal to `MAX_HIDDEN_ROLES`. A site can
  legitimately have far more users than 50 — but a rule naming more than 50
  individuals is a role rule expressed the hard way, and 21-04's async picker
  exists partly so bulk-selecting a user base is never the obvious move.
- The stored shape is now fixed for 21-02 (resolver + seam) and 21-04 (editor
  model + client payload). Client payload keys must match `hidden_users` /
  `child_hidden_users` exactly or a round-trip save drops the rule.
- **21-03's super-admin checkpoint is CLOSED** — ruled 2026-08-08 as *new axis
  only*: super admins are exempt from the user axes, and the shipped role axes
  keep their v1.4.1 behavior. Recorded in `21-03-PLAN.md`; the asymmetry needs a
  line in the user-facing docs at 21-05 Task 3.

## Next

21-02 — widen `is_hidden_for_current_user()` and generalize the override-list
resolver so both axes share one implementation of the qualified-key, schema-v2,
and Axis-1 rules.
