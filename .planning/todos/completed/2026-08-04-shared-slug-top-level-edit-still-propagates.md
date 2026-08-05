---
created: 2026-08-04T00:00:00.000Z
title: Shared-slug isolation is one-directional — a top-level-only edit still hits the submenu
area: compat
files:
  - includes/class-replay.php (submenu loop — a bare stored key still matches a submenu row when no qualified override exists)
  - includes/class-config.php (Config::sanitize() — top-level edits are stored under the BARE slug by design)
  - assets/maestro.js (buildConfig() — the editor writes bare keys for top-level items, qualified `parent>child` for submenu rows)
  - tests/integration/ReplayTest.php:740 (test_legacy_bare_submenu_key_still_matches_both_scopes_today — asserts the current behavior)
  - tests/e2e/specs/shared-slug.spec.ts:44 (step 1's "submenu untouched" assertion is a client-side DOM check, pre-reload)
---

## ✅ RESOLVED 2026-08-04 — `Config::SCHEMA_VERSION` (v1 → v2)

Fixed by versioning the stored config instead of guessing at intent.

`Config::sanitize()` now stamps `schema_version` on everything Maestro writes
(the stamp is ours — an incoming payload's value is ignored, so a client cannot
talk us into writing a legacy config). `Replay` reads it via
`Config::is_legacy_bare_key_schema()`.

**The gate is narrower than option 1 as originally sketched.** A bare key is
ambiguous exactly when it *also names a rendered top-level row*
(`isset( $top_rendered_matches[ $nk ] )`). Everywhere else a bare key names
exactly one rendered row, so the fallback stands and non-colliding bare submenu
keys keep working. So:

> **Widened once during review.** The first cut tested `$nk === $norm_parent`,
> which only caught WordPress's self-link shape (a CPT's "All Products" child
> re-registering its own parent's slug). Codex pointed out on PR #115 that a
> plugin can park a submenu under one parent whose slug equals an *unrelated*
> top-level row's — same ambiguity, different shape, and the narrow test misses
> it. Verified with a failing test before widening.

- **v1 config (no stamp)** — unchanged in every case. Full zero-regression.
- **v2 config** — a parent-colliding bare key applies to the top-level row only.

`resolved_hidden_roles()` carries the identical gate so the editor popover cannot
drift from what replay applies.

**Migration needs no upgrade routine.** `get_menu_model()` builds from the
already-replayed globals, so a legacy bare key currently retitling both rows
appears on both editor nodes; the next full-replace save writes the bare top key
AND the qualified child key. Nothing visible changes at the bump — asserted by
`test_legacy_v1_bare_key_surfaces_on_both_editor_nodes_for_migration`.

**Coverage added** (each verified to fail with the fix reverted):
- `test_v2_bare_top_level_key_does_not_touch_the_same_slug_submenu`
- `test_v2_bare_top_level_hide_does_not_hide_the_same_slug_submenu`
- `test_get_menu_model_v2_bare_parent_key_does_not_surface_on_same_slug_submenu`
- `test_v2_bare_top_level_key_does_not_touch_a_submenu_under_a_different_parent`
- `test_get_menu_model_v2_bare_top_key_does_not_surface_on_a_submenu_under_a_different_parent`
  — its own test because the two sets are built differently: replay() uses
  `$top_rendered_matches` (only keys that HAVE a stored override, the same
  condition its fallback requires) while `get_menu_model()` builds
  `$top_rendered_keys` from every rendered top-level row
- `test_v2_bare_key_still_applies_to_a_non_colliding_submenu_child` (guards the narrowing)
- `test_legacy_v1_bare_submenu_key_still_matches_both_scopes` (rewritten to seed a
  genuine v1 config via `update_option`, since `save()` now stamps v2)
- `shared-slug.spec.ts` now re-asserts isolation **after a reload**, closing the
  blind spot described below. Reverting the fix makes it fail with the submenu
  reading `"Gadgets•(modified)"`.

The `schema_version` envelope this introduces is also the precursor the
export/import work wants — see [[2026-07-03-config-presets-export-import]].

## Problem (original report — see RESOLVED above)

COMPAT-04's shared-slug isolation only holds in **one direction**, and the
v1.4.0 changelog originally overclaimed it (caught by the Codex review on
PR #113 and corrected before release).

What actually ships in v1.4.0:

- Editing the **submenu** row → stored under a qualified `parent>child` key →
  applies to that row only. The parent is untouched. ✅
- Editing the **top-level** row → stored under the **bare** slug → at replay,
  a bare key still matches BOTH scopes, so a same-slug submenu row is renamed
  or hidden too, until that submenu row gets its own qualified override. ❌

This is deliberate, not an oversight: bare keys matching both scopes is the
zero-regression contract that keeps pre-1.4.0 saved configs behaving exactly as
they did, and it is asserted by
`test_legacy_bare_submenu_key_still_matches_both_scopes_today`
(`tests/integration/ReplayTest.php:740`). But it means a user who renames only
the WooCommerce-style top-level CPT item still sees the "All …" child change
with it.

**Test-coverage gap that hid this:** `shared-slug.spec.ts` step 1 asserts the
submenu is untouched immediately after the top-level rename — but that is the
*client-side* DOM, which only repaints the selected row. The reload assertion in
step 3 runs after the submenu has ALSO been renamed, so a qualified key exists
by then and wins. Neither assertion exercises replay for the
top-level-edited-only case.

## Solution (not yet scoped)

The blocker is telling a *legacy* bare key (must keep matching both scopes) from
a *new* bare key written by a 1.4.0+ editor (should match top-level only). Both
are the same string today. Options:

1. **Qualify top-level keys too** on save (e.g. a `>`-less sentinel or an
   explicit `scope` field per item), so new saves are unambiguous and bare keys
   are read as legacy-only. Needs the `schema_version` envelope that the
   presets todo already wants — see
   [[2026-07-03-config-presets-export-import]].
2. **Migrate on save**: when the editor saves a top-level edit on a slug it can
   see is shared, also write a qualified override pinning the submenu to its
   pristine title. Cheap, no schema change, but it fattens the sparse config and
   only helps slugs shared at save time.
3. Leave as-is and document (what v1.4.0 does).

Whichever path: add an integration test for "bare top-level key + NO qualified
key → submenu row must NOT change" as the guard, and fix the e2e step-1
assertion to survive a reload so the gap cannot reopen silently.

Source: Codex automated review on PR #113 (2026-08-04), verified against
ReplayTest.php:740 during the Phase 24 release gate.
