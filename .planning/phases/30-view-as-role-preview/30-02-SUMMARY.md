# Phase 30 · Plan 02 — Summary

**Date:** 2026-10-23
**Status:** built on top of 30-01 (#248). Needs Dan's deep review with 30-01
before merge, plus a real-site check of the banner and picker.

## What it adds

- **Toolbar picker** (`assets/maestro.js`, `buildPreviewPicker()`): a "Preview
  as" label, a native select of roles that hold `read`, and a Preview button.
  Choosing a role does nothing on its own. Pressing Preview waits for
  `waitForSaveIdle()`; if the last save failed it stays, shows the save error
  and announces why, otherwise it opens
  `index.php?maestro_preview=<role>&maestro_preview_nonce=…`. Multisite super
  admins see an explanation instead of the picker.
- **Banner** (`Preview::render_banner()`, `in_admin_header`): "Previewing menu
  as {Role} — read-only", the approximation note, a plain GET form that
  switches role (with a fresh nonce), and Exit preview. It is PHP, rendered
  after the window has closed, so it appears even when the previewed role has
  no Maestro access; the editor script and CSS do not load in preview.
- **Refusal notices** (`Preview::render_refusal()`, `admin_notices`): an
  expired link, a role that cannot be previewed, a role without admin access,
  a super admin, and a page other than the Dashboard each get a sentence.
  Someone without Maestro's capability is told nothing, and AJAX, REST, cron
  and other admin screens never reach the notice.
- **Admin bar**: while previewing, the Maestro toggle reads "Exit preview" and
  goes to `index.php?maestro_edit=1`. Without it the "Edit Menu" link kept the
  preview arguments and could not leave the preview.
- **Localized data**: `maestroData.preview` (`url`, `nonce`, `available`,
  `roles`) and four strings.
- **Helpers**: `Preview::previewable_roles()`, `available()`, `url()`,
  `exit_url()`.

## After Dan's review (2026-10-24)

- Merged main (Visibility groups rename #249/#250, phone fixes #252); the
  group wording, guidance and coachtips are kept as main has them.
- **Phones:** #252 packs the toolbar into two rows upright and one on its
  side, to the pixel, so the inline select cannot fit. Below 783px (or 500px
  tall) the picker is one "Preview as" toolbar button that opens the same
  labelled select and Preview button in the phone sheet, both 44px targets.
  To keep the row budget with that button, the upright rename field gives up
  one button's width and Reset All shows its icon only at phone widths (its
  name, title and confirm are unchanged).
- **Tour:** a "Preview as" coachtip between Visibility groups and Settings,
  shown at every width, so the phone tour's numbering stays continuous.

## Tests

- `tests/integration/PreviewUiTest.php`, 11 tests: banner contents, picker
  limited to roles with `read` and carrying a nonce, no banner without a
  preview, each refusal message, silence for a viewer without the capability,
  the admin-bar Exit preview node, `url()` with a verifiable nonce,
  `previewable_roles()` and `available()` (super admin on the multisite lane).
- `tests/e2e/specs/role-preview.spec.ts`: banner, approximation note and exit
  (banner and admin bar); switching role from the banner; a refused nonce; an
  editor getting no preview and no message; a rule for Editors applying in the
  preview but not to the admin, with no config writes; a pending rename saved
  before the preview opens; a failed save keeping the editor open.
- **Parity** (ROADMAP criterion 4): for Editor, Author, Contributor and
  Subscriber the previewed menu's links equal those of a real signed-in user of
  the role, first with no rules and then with Maestro rules for the role
  (Profile hidden, Dashboard sub-items hidden).
- Local: unit 234/234; integration 238 single site (15 skipped) and 238
  multisite (1 skipped); JS 142; phpcs and PHPStan clean; e2e as reported in
  the PR.

## Not done here

- Real-site and screen-reader checks of the picker and banner, and touch.
- Previewing a person or a Visibility group, and editing inside the preview,
  stay out of scope (ROADMAP).
