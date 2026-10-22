# Phase 28 — Verification

**Status:** Automated gate green. **Human pass owed** (Task 4) before the phase
closes and the width todo moves to `completed/`.

## Measured always-loaded cost (28-02)

- **Queries:** 0 added. `MenuWidthAssetTest::test_applying_the_width_costs_no_query_beyond_replays_read`
  asserts `$wpdb->num_queries` is unchanged across the enqueue, because Replay
  has already read the shared, memoized `Config`.
- **Bytes:** one inline rule of about 600 bytes on the `maestro-admin-bar` handle,
  only when a width is stored. A site with no width gets byte-identical output
  (`test_no_stored_width_adds_nothing_to_the_page`).
- **Requests:** 0 added.

## What the control looks like

A gear button in the toolbar's right zone opens **Menu settings**: a **Menu
width** slider and a number field side by side, a state line (WordPress default,
custom width, or "Another plugin sets the menu width…"), a hint, and **Use
default** / **Done**. A thin handle on the menu's right edge (left in RTL)
highlights on hover and focus and drags the width live.

## Reset semantics

**Reset this item** never changes the width. **Use default** clears it. **Reset
all** clears it along with everything else.

## Automated coverage

| Layer | Where |
|---|---|
| Unit (PHP) | `ConfigSanitizeTest` (menu_width cases), `MenuWidthCssTest` |
| Unit (JS) | `tests/js/menu-width.test.mjs` |
| Integration | `MenuWidthAssetTest` (single-site and multisite lanes) |
| e2e | `menu-width-measured.spec.ts`, `menu-width-stored.spec.ts`, `menu-width.spec.ts` |

## Human checks still owed

These have **not** been done by a person:

- [ ] Several widths (e.g. 180, 240, 320) across the **fresh**, **modern** and
      **midnight** admin colour schemes, browsing and editing.
- [ ] Below the 782px breakpoint at a custom width (the overlay menu), and
      between 783 and 960px (auto-fold).
- [ ] An RTL admin language.
- [ ] Keel or PX installed for real, not only the fixture.

What a machine did check: screenshots of the dialog, the edge handle, and a
flyout at 232px under the default scheme at 1280px, taken against the local
SQLite site while building. They showed and fixed the off-screen dialog.

## Follow-up lab pass and fixes — 2026-10-22

See [the local lab record](28-LAB-2026-10-22.md) for the baseline findings and
follow-up. The RTL toolbar offset is fixed with logical CSS offsets. The mobile
settings dialog stays inside the responsive menu and handles its own Tab/Escape
keyup events, preventing core from closing the menu during dialog interaction.

Targeted E2E: **11 passed** (setup, three RTL width regressions, settings at
375/782px, and all five existing mobile editor tests). JavaScript: **99 passed**;
syntax, doc links and whitespace checks pass. A real Arabic admin also passed
toolbar-edge checks at 160/240/320px and settings interaction at 375/782px.
The prior mobile visibility
failures were investigated; assertions now check the visible menu, not its
wrapper, and real settings-input clicks exposed and verified the containment fix.

**Human pass still owed:** the four person-only checklist items above remain
unchecked. Automated evidence covers the listed layouts and real Keel, but does
not replace a person's colour-scheme, touch/mobile, RTL and compatibility
acceptance. Phase 28 stays open; its todo has not moved to completed.
