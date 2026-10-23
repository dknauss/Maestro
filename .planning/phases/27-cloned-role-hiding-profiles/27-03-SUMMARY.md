# Phase 27 · Plan 03 — Summary

**Date:** 2026-10-22
**Status:** Built locally; unit 218/218, phpcs and PHPStan clean. The
integration lanes (single-site and multisite), which carry every new
assertion, are proved in CI; the authoring sandbox has no WordPress test
library. Hiding profiles now hide rows. The editor UI is 27-04.

## Task 1 — Term 3 and live membership

- **The reserved slot, filled.** `Replay::is_hidden_for_current_user()` gains
  a third independent term after Term 2. Nothing was restructured. The fast
  path now also checks `hidden_profiles`, so a config with no rule of any kind
  still returns before resolving the current user.
- **Membership is the only thing read from the map.**
  `Replay::current_profile_ids()` reads `profiles[*].users` once per user per
  request. It is memoized and keyed by user ID, so a `wp_set_current_user()`
  partway through a request cannot reuse another user's set. Which items a
  profile hides comes from the compiled `hidden_profiles` axis, read through
  the same normalized lookup as the other axes. A tripwire in
  `ProfilesCompileTest` asserts that `class-replay.php` reads `['profiles']`
  exactly once, inside that helper.
- **Live and self-healing.** Editing only the stored member list changes the
  next request with no re-compile. A stale item reference to a deleted
  profile resolves to nothing.
- **Child axis.** `Cascade::effective_hidden_profiles()` unions a child's own
  `hidden_profiles` with its parent's `child_hidden_profiles`. It is fed from
  the same `$parent_ovr` as the other child axes, so it inherits the Axis-1
  and Axis-2 guards, and it feeds the same single `unset()`.
- **Edit mode.** Term 3 is suspended in edit mode and has the multisite
  super-admin exemption, for the same reason as Term 2 (27-01 amendment 3). A
  profile can contain the admin who is editing.
- **No capability decides a hide.** Like Term 2, Term 3 calls `is_edit_mode()`,
  which checks Maestro's capability to decide *whether the editor is open*.
  Nothing on the path consults a capability to decide what is hidden. The
  top-level `current_user_can( $row[1] )` access guard is unchanged.

## Task 2 — the cosmetic-only guardrail

`CosmeticInvariantUsersTest` now also runs the §6 six steps for a profile on
the item axis and on the child axis:

- an identical capability map before, during and after the rule;
- the row genuinely gone while the rule is active, and back after it is removed.

The removal sends `profiles: {}` explicitly, because a payload with no
`profiles` key keeps the map (27-02). The user rebuild in `snapshot_caps()`
is untouched.

## Task 3 — zero regression

No existing role- or user-axis test was edited. The one existing test that
changed is 27-02's own tripwire in `ProfilesCompileTest`. Its docblock said
27-03 would replace it: "never reads the map" became "reads it once, for
membership".

## Verification

- Unit 218/218, including `CascadeTest` for the new union.
- `phpcs` and PHPStan clean.
- Integration in CI:
  - `ReplayHiddenProfilesTest` adds 16 tests; 2 of them are multisite-only.
  - `CosmeticInvariantUsersTest` adds 2 tests.
