# Phase 21 · Plan 02 — Summary

**Completed:** 2026-08-08
**Commits:** `c0f459b` (refactor), `54c982b` (axis + cascade)
**Status:** ✅ Complete (3/3 tasks)

## What shipped

Per-user hiding now actually hides. A rule naming a user drops that user's menu
row through the same seam the role axis has always used.

**Task 1 — resolver generalization (`c0f459b`, behavior-free).**
`resolved_hidden_roles()` → `resolved_override_list( $field, … )` and
`resolved_child_hidden_roles()` → `resolved_child_override_list( $field, … )`.
Committed on its own with zero test edits and the full suite passing untouched,
so the behavior-bearing diff that followed was small enough to review alone.

**Tasks 2–3 — the axis (`54c982b`).** `is_hidden_for_current_user()` widened to
independent OR'd terms; `Cascade::effective_hidden_users()` added over a shared
type-agnostic union; both axes OR'd into a single `unset()` in the submenu loop.

## Decisions taken during execution

**The resolver was generalized, not duplicated.** `resolved_hidden_roles()`
encodes three rules the user axis must inherit identically — qualified-first
lookup, the schema-v2 bare-key gate (the v1.4.1 fix from #115), and the Axis-1
ambiguity guard. A parallel `resolved_hidden_users()` would have been a second
home for all three to drift apart, which is the defect class already logged in
`todos/pending/2026-08-02-editor-model-replay-axis2-drift.md`.

**The seam is OR'd terms, not a fused condition.** Term 3 (`hidden_profiles`) is
marked with a comment where it lands. The deferred half is now a line, not a
rewrite.

**The no-rule fast path was preserved deliberately.** With neither axis present
the seam returns before calling `wp_get_current_user()` at all, so every config
written before this feature costs exactly what it did.

**The per-user child axis rides the same `$parent_ovr`** as the role one, so it
inherits the Axis-1 and Axis-2 guards for free — an ambiguous parent cascades
nothing on either axis, with no second copy of the guard logic.

**Cascade kept named wrappers over a private shared union.** The union never
inspects member semantics, so one implementation serves role slugs and user IDs.
Naming them separately keeps the axis explicit at the call site; renaming the
shipped method would have churned `CascadeTest` for no behavioral gain.

## ⚠️ Judgment call worth review: the exemption is multisite-scoped

The 2026-08-08 ruling was *new axis only*, and that is what shipped. **How** it
is scoped needed one more decision, and I took it:

`is_exempt_from_user_axis()` fires only when `is_multisite() && is_super_admin()`.

On single-site, `is_super_admin()` is true for **any administrator** (it resolves
to `delete_users`). An unscoped exemption would therefore make administrators
un-hideable on single-site — contradicting the locked "self-target = warn but
allow" decision and breaking the feature on its primary target. The feasibility
note raises super admins under **§12 Multisite**, which is the reading that holds
together.

Pinned by test in both directions:
- `test_administrator_can_be_per_user_hidden_on_single_site` — self-targeting works.
- `test_role_axis_behaviour_is_unchanged_for_administrators` — the shipped role
  axis is untouched by the exemption.

If the intent was a broader exemption, this is the line to change and both tests
will catch it.

## The anti-lockout rail is a tripwire, not a feature

`test_maestro_registers_no_menu_page_that_a_hide_could_remove()` asserts a
property the architecture already has: Maestro owns no `$menu` row, so no `items`
rule can reach its entry point. If someone later adds a real `add_menu_page()`,
that test fails and forces the §11 rail to be reconsidered deliberately. The
tripwire is the point; the assertion is incidental.

## Verification

| Check | Result |
|---|---|
| `composer test:unit` | ✅ 165/165, 218 assertions (was 158/210) |
| `npm run test:php` | ✅ 96/96, 215 assertions (was 82/198) |
| `npm run test:e2e` | ✅ 36 passed, 28 capture-skipped, 0 failed |
| `npm run test:js` | ✅ 0 fail |
| `composer lint` (WPCS) | ✅ clean |
| `composer analyse:phpstan` | ✅ 0 errors |
| RED-before-GREEN | ✅ 5 failures pre-implementation, all new-behavior cases |
| Task 1 behavior-free | ✅ full suite passed with zero test edits |

e2e was run locally beyond this plan's required gate: a seam change is riskier
than a storage change, and the COMPAT-10 cascade specs are the regression that
mattered most. They pass unchanged.

## Downstream notes

- The seam and resolver shapes are now fixed for 21-04. The editor model must
  route `hiddenUsers` / `childHiddenUsers` through `resolved_override_list()` and
  `resolved_child_override_list()` so the popover cannot show a rule replay would
  not honour.
- The pre-existing Axis-2 drift in the editor model was NOT fixed here (out of
  scope, pre-existing). 21-04 must not add a third divergent copy.
- The multisite exemption is untested in CI — the integration suite runs
  single-site, and `test_administrator_can_be_per_user_hidden_on_single_site`
  skips under multisite. The exempt-path branch itself has no direct coverage.
  **21-05 Task 5 must state this coverage gap explicitly at the checkpoint.**

## Next

21-04 — editor model exposure, popover user sections, async user picker. (21-03's
guardrail work is the other open thread; its super-admin checkpoint is already
closed by the ruling recorded here.)
