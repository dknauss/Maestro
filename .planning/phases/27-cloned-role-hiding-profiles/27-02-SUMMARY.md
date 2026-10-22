# Phase 27 · Plan 02 — Summary

**Date:** 2026-10-22
**Status:** Built and unit-tested locally (unit 217/217, phpcs and PHPStan
clean). The integration lane, including the new `ProfilesCompileTest`, is
proved in CI; the authoring sandbox has no WordPress test library. Storage only:
no change to `class-replay.php` or `assets/*`. Nothing hides yet; Term 3 is
27-03.

## Stored shape

```php
'profiles' => [
    'p_1' => [
        'name'        => 'Reduced view',        // 1–40 characters, unique ignoring case
        'users'       => [ 3, 7 ],              // live users, ≤ 50
        'hides'       => [ 'tools.php', 'parent.php>child.php' ],
        'child_hides' => [ 'edit.php' ],        // top-level keys only
    ],
],
'items' => [
    'tools.php' => [ 'hidden_profiles' => [ 'p_1' ] ],
    'edit.php'  => [ 'child_hidden_profiles' => [ 'p_1' ] ],
],
```

Items store the stable ID, never the name, so a rename touches nothing else.

## Task 1 — the profiles map

`Config::clean_profiles()` follows the axis shape: guard, coerce, intersect
against what is live, cap, sparse lists.

- IDs must match `PROFILE_ID_PATTERN` (`p_<n>`, no leading zero). A plain
  numeric key is refused, since PHP would renumber it.
- Names go through `sanitize_text_field()` and are bounded to
  `MAX_PROFILE_NAME_CHARS` (40) **characters** with a `/u` match, so there is
  no mbstring dependency, and invalid UTF-8 refuses the name instead of
  storing a broken label. If a second name matches an earlier one ignoring
  case, it is dropped.
- Members go through `clean_user_ids()`, capped at `MAX_PROFILE_MEMBERS` (50).
  `candidate_user_ids()` now also collects profile members, so there is still
  exactly **one** bounded `get_users( include )` query per save. A unit test
  asserts the call count.
- Hide-lists clean each slug with `clean_item_key()`. This is the item-key
  logic (entity-decoded qualification, halves cleaned separately), moved out
  of the loop unchanged so both paths share one rule. `child_hides` refuses
  qualified keys, matching `child_hidden_roles`.
- `MAX_PROFILES` is 20, first in incoming order wins.

**Deviation from the plan's "empty profiles are dropped":** a profile with a
valid ID and name is **kept** even with no members or hides. The autosave is a
full replace, so dropping it would delete a profile the moment it was created,
or the moment its last member's account was deleted. Its *lists* stay sparse.

## Task 2 — compile

`Config::compile_profiles()` runs after the items loop and the protected-rule
restore.

- **The map is the only source.** The compile first strips every
  `hidden_profiles` and `child_hidden_profiles` from the items, then rebuilds
  them from the map. Anything a payload claims on an item directly is ignored.
  Deleting a profile, or removing a slug from one, therefore cleans every
  reference on that same save (27-01 Q4). Resolve-time self-healing stays as
  the safety net in 27-03.
- **Idempotent.** It is strip-then-rebuild from the map, and each hide-list is
  rewritten to the key it actually landed on. So sanitizing its own output
  gives the same output; the test runs six passes.
- **Normalized attach.** A hide naming `upload.php?ver=9` lands on a stored
  `upload.php` entry, not a second key the Axis-1 guard would neutralise.
- **MAX_ITEMS.** A slug that would need a *new* entry once the map is full is
  dropped from the profile, so nothing is evicted and the map never claims a
  hide that was not compiled.

## The `list_users` gate (27-01 amendment 4)

- A saver without `list_users` keeps the stored map wholesale, and the compile
  runs from it.
- `protected_user_axes()` now also carries `hidden_profiles` and
  `child_hidden_profiles`. Their item slots are therefore reserved against a
  payload of filler entries, the same starvation path the v1.5.0 review found
  for per-user rules. A unit test covers it.
- `reset()` for such a saver keeps the map alongside the protected items. An
  administrator's Reset All is still a plain wipe.

## One addition: a payload with no `profiles` key keeps the stored map

Full-replace would otherwise mean a missing key deletes every profile. An
editor that predates profiles sends no key at all, for example the shipped
1.7 script before 27-04 lands, or a stale cached copy. A client that means
"delete the last profile" sends an empty map. This is the same reasoning as
28-02 carrying `menu_width` forward in `buildConfig()`, done server-side here
because this plan does not touch `assets/*`.

## Zero regression

- `test_role_and_user_config_is_unchanged_by_profiles` asserts with `assertSame`
  that a config carrying only the role and user axes, orders and a width
  sanitizes byte-for-byte identically.
- `test_all_six_visibility_axes_coexist` checks all six axes on one entry.
- The existing role-only guard is untouched and passes.

## Verification

- `vendor/bin/phpunit -c phpunit-unit.xml.dist`: 217/217, 533 assertions.
  It was 192 before; 25 tests are new. The 11 Task 1 tests failed against the
  pre-change `class-config.php` (9 errors, 1 failure) and pass with it.
- `phpcs` clean on `includes/`; PHPStan clean.
- `ProfilesCompileTest` (6 tests) covers:
  - the compile through the real REST save;
  - no drift over repeated saves;
  - live-member intersection after `wp_delete_user()`;
  - a delegate who can neither change nor destroy a profile, on save or reset;
  - an admin reset that wipes;
  - a tripwire that `class-replay.php` never reads `['profiles']`.

  These run in CI on both the single-site and multisite lanes.

## For 27-03

- The fast path at `class-replay.php:602` must also check `hidden_profiles`.
- Term 3 derives the user's profile set from `profiles[*].users` once per
  request, then intersects it with the item's compiled `hidden_profiles`.
  It is suspended in edit mode.
- A stale member ID (an account deleted since the last save) simply fails to
  match.
