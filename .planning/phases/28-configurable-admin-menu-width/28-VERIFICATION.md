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

## Acceptance exceptions and fixes — 2026-10-22 (afternoon)

Dan's acceptance pass (with Codex) reopened Phase 28 on three exceptions. Dan
had already passed the two independent-review checks by hand: Escape and reopen
keep focus on the slider, and typing 250.5 gives 251.

| Exception | Cause | Fix | Regression test (`menu-width.spec.ts`) |
|---|---|---|---|
| Narrow viewports: toolbar icons crowd together | At 782px and below the right zone (Settings, Help, Reset All) never shrinks, so on a shared row it squeezed the panel to one control's width and every panel control took a row of its own (374px tall at 320px) | The right zone takes its own row below 783px; the panel gets the first row and its controls wrap side by side (216px at 320px, 164px at 375px). Panel and right-zone dividers now use logical properties, so they also sit on the correct side in RTL | "narrow toolbar lays the panel controls out in rows" at 320, 375, 600px |
| Arabic RTL: untranslated English inherits RTL, misplacing punctuation and the tour counter | Untranslated strings arrive in English and took the page's RTL base direction | Every editor string is set through `setText()`, which adds `dir="auto"`, so each string takes its direction from its own text. English reads LTR, a translation or an Arabic menu title RTL, and an LTR admin is unchanged. The rename and search fields and the admin-bar label get `dir="auto"` too | "untranslated English keeps its own direction"; "the tour counter keeps its digits in order" |
| Keel live width changes during edit mode | Maestro checked for another plugin's width only when the dialog opened or a drag started, so a width changed live (Keel's slider preview) left the handle and dialog stale, and a takeover mid-drag kept saving widths that did not show | The menu's ResizeObserver now re-reads who owns the width. The handle reports the width on screen with `aria-disabled="true"` and the override text, the open dialog's notice updates live, and a drag stops when a takeover begins, keeping the last width that actually showed | "a width another plugin changes live updates the dialog and the handle"; "a takeover that starts mid-drag stops the drag" |

Machine verification on the local SQLite WordPress 7.1.3 site: 91 e2e tests
pass across the width, mobile, editor, toolbar, picker, separator, save-race
and tour specs. JS 99/99, PHP unit 192/192, WPCS clean. CI runs the full gate.
RTL was exercised by switching the page to RTL, not with installed Arabic
translations, and Keel's live preview was reproduced with an injected
`!important` width, not real Keel.

**Still outstanding:**

- [ ] Real touch-device testing (Dan's call to keep it open).
- [ ] A person re-checks the three exceptions above on a real site: narrow
      toolbar, Arabic admin, and real Keel's slider moved during edit mode.
- [ ] The four person-only checks above stay unchecked until then.
