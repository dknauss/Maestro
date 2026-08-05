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

## Problem

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
