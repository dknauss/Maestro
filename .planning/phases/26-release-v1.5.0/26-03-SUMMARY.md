# Phase 26 · Plan 03 — Summary

**Completed:** 2026-08-09
**Status:** Gates 9, 10, 11 complete. **Gate 8 (code review) awaiting the Codex pass.**

## Gate 10 — Adversarial security: **one real defect found and fixed**

Probed the authorization boundary rather than reasoning about it. Four questions,
asked as tests against a delegated Maestro editor (`maestro_capability` role
without `list_users`):

| Probe | Result |
|---|---|
| A1 · Can they **inject** a per-user rule? | ✅ No — blocked server-side |
| A2 · Does saving the same item **preserve** an admin's rule? | ✅ Yes |
| A3 · Does **omitting** the item preserve it? | ❌ **NO — rule destroyed** |
| A4 · Does the model leak **display names** to them? | ✅ No |

**A3 was not a hand-crafted-attack edge case — it was ordinary data loss.**
`get_menu_model()` withholds the user axes from a saver without `list_users`
(that is A4 working correctly), so `diffItem()` never flags them client-side, so
an item whose only override is a per-user rule is omitted from that saver's
full-replace autosave entirely. A rule omitted from a full replace is a rule
deleted. **Any edit by a delegated editor silently wiped every per-user rule they
could not see.**

The per-item preserve I wrote in round 2 only fired for items *present in the
payload*, which was never sufficient. The restore now runs over the **stored**
items rather than the submitted ones, re-attaching (or re-creating) any entry
carrying a per-user axis the saver was not allowed to touch.

My own code comment had claimed "the saver can neither add nor destroy". Half of
that was true.

The probe is kept as `tests/integration/PerUserAxisAuthorizationTest.php` rather
than deleted — the symptom is a rule quietly disappearing, not anything failing
loudly, which is exactly the kind of regression that returns unnoticed.

**Also verified:** the edit-mode suspension is unreachable outside edit mode
(`is_edit_mode()` carries its own capability gate); bounds hold at
`MAX_HIDDEN_USERS` / `MAX_ITEMS`; the cosmetic-only invariant still holds for the
per-user path (`CosmeticInvariantUsersTest`, unchanged in substance).

**Consequence for the existing guardrail tests:** two of them removed their rule
while acting as the *editor*, which now correctly no-ops. They author as admin
via `save_as_admin()` and must remove the same way; fixed. Worth noting the fix
made a test fail — that is the fix working, not a regression.

## Gate 9 — Accessibility

**Structure and keyboard: 7/7 verified** in a new
`tests/e2e/specs/person-picker-a11y.spec.ts`:

- the search field has a real `<label for>`, not just a placeholder
- all four groups expose **distinct** accessible names (the failure mode is two
  groups sharing an id, which is precisely v1.4.0's S1 defect in this popover)
- results are keyboard-reachable from the field and activate on Enter
- each chip's remove control names **who** it removes
- status messages sit in a `polite` live region and actually populate
- focus returns to the search field after both add and remove
- the focus trap still holds with the added controls, and Escape restores focus

**Contrast (WCAG 1.4.3 / 1.4.11), computed not eyeballed:**

| Surface | Ratio | Verdict |
|---|---|---|
| chip text, result text, status text, self-warn text | 6.83–10.03:1 | ✅ well clear of 4.5 |
| focus ring `#2271b1` | 5.17:1 | ✅ clear of 3.0 |
| chip / results border `#c3c4c7` | 1.74:1 | ⚠️ note |
| self-warn accent `#dba617` | 2.09:1 | ⚠️ note |

Both notes are **inherited core tokens, not new choices**: `#c3c4c7` already
appears 21 times in `maestro.css` and is documented at line 255 as verified
against core; `#dba617` is core's own notice-warning amber. Neither carries
information alone — the notice's meaning is in its text at 6.93:1, and the
chips/results are identified by their content. Flagging them would be flagging
wp-admin's palette. Recorded rather than "fixed" into an inconsistency.

**What this gate could NOT do:** verify what a screen reader actually announces.
The structure a screen reader depends on is proven; the announcement is not.
A real AT pass remains worthwhile.

## Gate 11 — Performance

Measured against `docs/performance/config-size-and-page-load.md`, whose baseline
puts realistic configs at ~0.1 ms/page.

| Measurement | Result |
|---|---|
| `replay()`, 30 items, role axes only | 0.190 ms |
| `replay()`, same + 5 person targets on **every** item | 0.298 ms |
| **Delta for a pathological all-targeted config** | **+0.108 ms** |
| `get_menu_model()`, 30 items × 5 targets, cold cache | 0.034 ms, **1 query** |
| `sanitize()`, 30 items × 5 ids, cold cache | 0.107 ms, **1 query** |
| `sanitize()`, no user axis at all | 0.021 ms, **0 queries** |

The two claims that mattered both hold, measured cold rather than trusted:
the name lookup is **one batched query** for the whole model, and the round-2
`include`-bounded validation is **one query** rather than a full user-table scan.
The zero-override fast path genuinely costs nothing — 0 queries, confirming a
config with no per-user rule pays for nothing.

+0.108 ms on a deliberately pathological config is the same order as the entire
pre-existing replay cost, and lost in admin TTFB.

## Gate 8 — Code review

**Not complete.** The diff was self-reviewed while running gates 9–11, and the
Gate 10 defect came out of that work. An independent Codex pass over
`v1.4.1..main` is requested on the PR — it has found something real on every
pass so far, including two issues raised against the plans that then shipped as
live bugs anyway.

## Verification

| Check | Result |
|---|---|
| `composer test:unit` | ✅ 167/167, 223 assertions |
| `npm run test:php` | ✅ 119/119, 275 assertions |
| `npm run test:js` | ✅ 83/83 |
| `npm run test:e2e` | ✅ 46 passed, 28 capture-skipped, 0 failed |
| `composer lint` / `analyse:phpstan` | ✅ clean / 0 errors |

## Carried into 26-04

- Gate 8's Codex verdict must land before the tag.
- The multisite super-admin exempt branch remains untested (single-site suite).
- A real screen-reader pass on the picker is still outstanding.
