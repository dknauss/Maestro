# Phase 28 — Verification

**Status: implementation built; desktop human checks passed 2026-10-23.**
Dan's desktop recheck closes the narrow-toolbar, Arabic fallback and real Keel
live-width exceptions. Real touch-device testing remains outstanding.

## Desktop human sign-off — 2026-10-23

Dan reported that all desktop human checks passed on the disposable Studio
site prepared from main `312c8b7`: WordPress 7.1.3, PHP 8.4, SQLite,
Keel 0.8.0 (main `7013953`, saved 240px baseline), and Arabic active.
The site included an administrator, two Editors (profile member and same-role
non-member), and an Author for the role comparison. This is Dan's human
sign-off, separate from the automated evidence below. No browser or
assistive-technology version was supplied.

**Real touch-device testing remains outstanding.** Desktop sign-off does not
complete that check or establish full acceptance across devices.

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

## Human acceptance — desktop passed; touch outstanding

Dan initially passed the available core colour schemes and widths, then
qualified the overall sign-off with screenshots of three exceptions. Modern
is no longer a core colour scheme and must not be required for acceptance.
Historical `modern` measurements do not establish current core-scheme coverage.

- [x] Available core colour schemes and several widths, browsing and editing —
      accepted by Dan on 2026-10-22.
- [x] Dan rechecked the narrow toolbar after #235, including populated
      controls at wrapping boundaries and responsive menu interaction.
- [x] Dan rechecked English fallback direction in an Arabic admin after #235.
- [x] Dan rechecked real Keel's width slider while Maestro edit mode is on,
      including shrinking to Leave unchanged and saving/reloading.
- [ ] **Real touch-device testing remains outstanding.** Desktop emulation and
      automated screenshots do not complete this check.

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

**Historical lab status:** human rechecks were open at this point. Dan's
2026-10-23 sign-off above now closes the desktop checks; touch remains open.

## Acceptance exceptions and fixes — 2026-10-22 (afternoon)

Dan's acceptance pass (with Codex) reopened Phase 28 on three exceptions. Dan
had already passed the two independent-review checks by hand: Escape and reopen
keep focus on the slider, and typing 250.5 gives 251.

| Exception | Cause | Fix | Regression test (`menu-width.spec.ts`) |
|---|---|---|---|
| Narrow viewports: toolbar icons crowd together | At 782px and below the right zone (Settings, Help, Reset All) never shrinks, so on a shared row it squeezed the panel to one control's width and every panel control took a row of its own (374px tall at 320px) | The right zone takes its own row below 783px; the panel gets the first row and its controls wrap side by side (216px at 320px, 164px at 375px). Panel and right-zone dividers now use logical properties, so they also sit on the correct side in RTL | "narrow toolbar lays the panel controls out in rows" at 320, 375, 600px |
| Arabic RTL: untranslated English inherits RTL, misplacing punctuation and the tour counter | Untranslated strings arrive in English and took the page's RTL base direction | Every editor string is set through `setText()`, which adds `dir="auto"`, so each string takes its direction from its own text. English reads LTR, a translation or an Arabic menu title RTL, and an LTR admin is unchanged. The rename and search fields and the admin-bar label get `dir="auto"` too | "untranslated English keeps its own direction"; "the tour counter keeps its digits in order" |
| Keel live width changes during edit mode — #235 partial fix | Maestro checked for another plugin's width only when the dialog opened or a drag started, so a width changed live (Keel's slider preview) left the handle and dialog stale, and a takeover mid-drag kept saving widths that did not show | The menu's ResizeObserver now re-reads who owns the width. The handle reports the width on screen with `aria-disabled="true"` and the override text, the open dialog's notice updates live, and a drag stops when a takeover begins, keeping the last width that actually showed | "a width another plugin changes live updates the dialog and the handle"; "a takeover that starts mid-drag stops the drag" |

Machine verification on the local SQLite WordPress 7.1.3 site: 91 e2e tests
pass across the width, mobile, editor, toolbar, picker, separator, save-race
and tour specs. JS 99/99, PHP unit 192/192, WPCS clean. CI runs the full gate.
RTL was exercised by switching the page to RTL, not with installed Arabic
translations, and Keel's live preview was reproduced with an injected
`!important` width, not real Keel.

**Acceptance update — 2026-10-23:**

- [ ] Real touch-device testing (Dan's call to keep it open).
- [x] Dan rechecked the three exceptions above on a real site: narrow
      toolbar, Arabic admin, and real Keel's slider moved during edit mode.
- [x] Desktop checks above passed; the earlier core colour-scheme/width pass is retained.

## Remaining Keel alignment — follow-up to merged #235

The review reproduced a gap after #235: a 240px saved Keel submenu minimum
survived its 300px → Leave unchanged (160px) preview transition. Menu, content
and toolbar moved to 160px, but expanded submenus stayed 240px and covered the
page. Updating the handle/notice did not resolve that layout conflict.

The edit-mode submenu selector now includes the `body` and menu-top ancestor,
so its existing `width: auto !important` and `min-width: 0 !important` outrank
Keel's saved and live-preview rules. Browsing rules and Keel's settings are
unchanged. This extends #235; it does not redo its toolbar or bidi work.

`keel-live-width.spec.ts` adds two regressions (Maestro width unset and stored
240px). They use snapshots of Keel's real preview CSS/slider handler at
`3a19720`, keep the saved submenu minimum loaded, and check every expanded
submenu plus rows, menu, background, content and toolbar through repeated
300/160/200px transitions and reload. Both failed on the merged code at the
160px submenu-containment assertion; both pass with this selector correction.

A separate local Studio site with real Keel also passed saved 240px → 300px →
Leave unchanged 160px → 200px → 160px → reload (saved 240px). This verifies
Keel's existing preview behavior: Leave unchanged previews 160px; reload
restores its saved 240px setting when the form was not saved. The fix keeps
those states aligned rather than changing Keel's preview semantics.

Evidence retained locally in `/Users/dan-knauss/.cache/maestro-keel-review/`:
`before.log`, `after.log`, `real-results.json` and `real-unchanged.png`.
**Desktop human rechecks passed 2026-10-23; real touch-device testing remains open.**


## Tour navigation follow-up — PR #234

The expanded tour skips the width handle below 961px. Back now skips missing
anchors in the backward direction instead of returning to Settings. At a 900px
viewport the new `tour.spec.ts` regression failed before the fix (Settings
remained visible after Back) and passed afterward. It checks backward traversal
across the hidden width step, forward traversal, return to the first step,
Back disabled there, and Escape. The existing 12-step desktop tour also passes;
JavaScript tests: 99/99; doc links and JavaScript syntax pass.

**Desktop human rechecks passed 2026-10-23; real touch-device testing remains outstanding.**
The automated tour evidence above is separate from that human sign-off.

## Partial real touch-device report — 2026-10-23

Dan supplied functional successes and mobile usability findings. See the
[consolidated touch results and remaining checks](../../TOUCH-DEVICE-CHECKLIST.md#dans-reported-touch-results--2026-10-23).
Small targets/accidental dismissal, cramped dialogs, keyboard obstruction and
three-tip tour coverage remain unresolved. Role mixed-state/locked-row checks,
RTL wording clarification and exact device/build details remain open; real Keel
mobile interaction was not tested. This report does not close touch acceptance
or replace the earlier desktop sign-off.
