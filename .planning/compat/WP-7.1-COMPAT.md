# WordPress 7.1 — compatibility register

**Opened:** 2026-08-18
**Maestro baseline:** v1.5.2 (shipped), `main` at `68f7d6f`
**7.1 status at time of writing:** RC (CI has run against a real `7.1-RC4-63322` build)

This file exists because `#156` introduced the **`WP71-nn`** identifier in code
comments and there was nowhere for `WP71-02` onward to land. It is the registry
for that namespace: one row per 7.1 change that touches Maestro, each either
closed with the commit that closed it or left open with what it would take.

Same spirit as [`COMPATIBILITY-NOTE.md`](COMPATIBILITY-NOTE.md), narrower subject.

---

## What 7.1 actually changes (primary sources only)

| # | Change | Source |
|---|---|---|
| 1 | The admin bar becomes **persistent in the Post and Site Editors** | [Consistent navigation with persistent toolbar](https://make.wordpress.org/core/2026/07/13/consistent-navigation-in-wordpress-7-1-with-persistent-toolbar/) (2026-07-13) |
| 2 | **Design tokens** as CSS custom properties (`--wpds-*`) via a new `wp-theme` stylesheet, explicitly documented as consumable by plugin styles; plus a `ThemeProvider` React component | [Design System Theming](https://make.wordpress.org/core/2026/07/31/design-system-theming-in-wordpress-7-1/) (2026-07-31) |
| 3 | **Sidebar contrast boosted** in admin colour schemes (#65382); focus indicators standardised to **≥2 CSS px** (#65645); **focus states on the admin bar and admin menu improved** (#65765, #65726); **cursor inconsistencies when the admin menu is collapsed fixed** (#65250); Windows High Contrast Mode states (#65153, #65419) | [Accessibility improvements](https://make.wordpress.org/core/2026/08/13/accessibility-improvements-in-wordpress-7-1/) (2026-08-13) |

### One claim deliberately NOT carried

Secondary coverage of 7.1 describes the sidebar gaining **icon-only collapsed
navigation that expands on hover**. That is **not** in any 7.1 dev note, and it
reads as a description of the **7.0** admin makeover — which Maestro already
supports and is already tested against. It is excluded here rather than recorded
as a risk. If it turns out to be real, it lands squarely on `forceUnfold()` and
Phase 28, so it is worth re-checking at 7.1 final rather than assumed either way.

---

## Register

### ✅ WP71-01 — the entry point appeared where the menu does not

**Closed by [#156](https://github.com/dknauss/Maestro/pull/156) (`68f7d6f`).**

7.1 renders the toolbar persistently in the Post and Site Editors. `Admin_Bar::node()`
gates only on `is_admin()` and capability, and both editors are admin screens — so
the **Edit Menu** toggle became reachable on screens whose `#adminmenu` is behind
the editor chrome, leading somewhere with nothing to edit. Before 7.1 the toolbar
was not rendered there at all, so the node was unreachable in practice.

**The fix keys on FULLSCREEN, not on the screen — and that distinction is the
whole point.** The obvious remedy, and the one core's own dev note suggests, is
`$screen->is_block_editor()`. That **over-blocks**: with fullscreen off, the Post
Editor still shows `#adminmenu` and Maestro works there exactly as it did before
7.1. Gating on the screen would have removed working behaviour to fix a broken
case. Fullscreen is the deciding fact — the Post Editor's default, and the Site
Editor's only state, since it has no fullscreen control.

Implemented as defence in depth, because hiding the toggle does not retract a
bookmarked `?maestro_edit=1`: CSS hides the toggle and the editor chrome under
`.is-fullscreen-mode`, and `maestro.js` declines to initialise at all — which is
the half that actually keeps sortables off a hidden menu and the focus-trapping
tour off the block canvas. Covered by `tests/e2e/specs/editor-screen-gate.spec.ts`.

**Known cosmetic cost, accepted:** core prints `is-fullscreen-mode` server-side
unconditionally and strips it during hydration for users who turned fullscreen
off, so the toggle appears a moment after load for those users.

### ◻ WP71-05 — the toggle is reachable in the Post Editor, but entering costs an interruption

**Open. Raised by Dan 2026-08-18, from using it.**

WP71-01 concluded: *with fullscreen off, the Post Editor shows the menu, so
Maestro works there.* That is true of the **menu** and not of the **entry point**.

`Admin_Bar::node()` renders a plain `href` (`class-admin-bar.php:53`), so entering
edit mode is a **full page navigation**. In the Post Editor that navigates away
from an editor which may hold unsaved content, and Gutenberg's own
unsaved-changes guard raises a browser confirm. Maestro has no `beforeunload` of
its own — the dialog is core's, fired because Maestro navigated the page out from
under it.

Answering a browser dialog, and risking post content, in order to edit a menu is a
bad trade even when the menu is visible.

#### Could entry be made interruption-free? Investigated: not cheaply

The idea — enter edit mode client-side, no reload — fails on where the editor
model comes from:

- **The model is a product of an admin page render.** `get_menu_model()`
  (`class-replay.php:710`) reads the live `$menu`/`$submenu` globals, which exist
  only after `admin_menu` has run. Its single caller is `class-assets.php:125`,
  feeding `wp_localize_script`. **It is not exposed over REST**, and the existing
  `READABLE` route on `maestro/v1/config` returns the stored *config*, not the
  model. A REST request has no admin menu to read, so serving the model from one
  would mean bootstrapping the admin menu inside a non-admin request — precisely
  the fragile thing this codebase avoids.
- **Edit mode renders rows normal mode omits.** `class-replay.php:505` skips the
  per-user hide when `is_edit_mode()`, so a row you hid from yourself reappears
  while editing — deliberately, so the rule stays removable. A no-reload session
  would have to inject those rows client-side, i.e. reconstruct markup core
  generates. That is the rebuild model `SPEC.md` principle 4 rejects.
- Asset gating alone would be solvable (lazy-load on click); the model is not.

#### Recommendation: remove the option here

Hide the toggle in the Post Editor **whether or not fullscreen is on**. The
sidebar is one click away on every other admin screen, so nothing is lost, and it
makes WP71-01's guard consistent: *the entry point should not appear where using
it is worse than not.*

**This is a runtime change to #156's guard and should be its own PR**, not folded
into the compat declaration. Note the widened guard would also make the Site
Editor case fall out of the same rule rather than needing fullscreen at all.

#### The invariant this and WP71-01 share

> **The toggle should only appear where edit mode can actually deliver an editable
> menu, without cost.**

Three known violations, only one of them 7.1-related — see
`todos/pending/2026-08-18-mobile-edit-mode-does-not-open-the-menu.md` for the
third, which is pre-existing and has the *opposite* answer.

### ◻ WP71-02 — the "no admin CSS variables exist" rationale has expired

**Open. Not urgent; nothing breaks.**

Phase 23 recorded that Maestro's panel/toolbar colours stay hardcoded because *no
WP admin-colour-scheme CSS variable exists for a custom-drawn surface to inherit*.
That was true when written. 7.1's `--wpds-*` tokens make it false.

Measured on `68f7d6f`: **99 hardcoded hex values in `assets/maestro.css`, zero
`var(--)` usages, zero `wpds` references** across both stylesheets.

Nothing is broken — hardcoded colours still render. What changed is the *reason*:
a plugin whose stated aim is looking native to wp-admin now has a supported way to
actually be native, and its recorded justification for not doing so no longer
holds. Any adoption must stay back-compatible to the 6.4 floor (`var(--wpds-x, #hex)`
fallbacks), which is also what makes this safe to do incrementally rather than as
a sweep.

**Blocked on nothing. Wants a decision, not a fix:** adopt tokens progressively,
or record a *current* reason for staying hardcoded. Either is fine; the stale
rationale is the actual defect.

### ◻ WP71-03 — Phase 25's contrast ratios were measured against 7.0

**Open. Low risk, cheap to settle.**

#65382 boosted sidebar contrast in the admin colour schemes. Phase 25 measured and
recorded specific ratios against 7.0 values — the focus ring at **6.74:1** on
`#1d2327`, toolbar glyphs `#c3c4c7` at **9.11:1** — and chose `#72aee6`
deliberately as a robustness margin over a value that passed by 0.07.

Those numbers are almost certainly still fine, and may well have improved. But
they are currently *asserted* against a palette core has moved. Re-measure against
7.1 and update `25-VERIFICATION.md` with the new figures, or note that they were
re-checked and held.

Related and unexamined: core standardising focus indicators to ≥2px (#65645) and
improving focus states on the admin bar and admin menu (#65765, #65726). Maestro
draws its own 2px ring on its own toolbar, so this is likely alignment rather than
conflict — but "likely" is not "checked".

### ◻ WP71-04 — #65250 lands inside Phase 28's work area

**Open. Read before Phase 28-01, not after.**

"Mouse cursor interaction inconsistencies when the admin menu is collapsed have
been fixed" is in the same code path Phase 28-01 is about to rewrite: `forceUnfold()`
neutering `#collapse-menu`, and the fold-honesty decision recorded in
`todos/pending/2026-08-10-toolbar-height-and-collapse-menu-parity.md`.

Phase 28 was designed against 7.0 collapse behaviour. Reading the #65250 patch
first is cheap insurance against designing around a bug core has already fixed.

---

## What the green 7.1 suite does and does not prove

[#159](https://github.com/dknauss/Maestro/pull/159) (open, CI green, and built on
top of the WP71-01 guard) declares `Tested up to: 7.1` and moves the wp-env pin to
`#7.1-branch`. Its backing is real: the full suite ran against `7.1-RC4-63322` —
unit 167, JS 83, integration 129, e2e 56, phpcs and PHPStan clean.

**The order matters and it is correct.** #156 landed the runtime guard *and* its
e2e coverage first; #159's suite run therefore exercises the editor screens rather
than merely passing without visiting them. Had #159 come first, a green run would
have proven considerably less than it appears to — the suite had **no editor-screen
coverage at all** before #156 added `editor-screen-gate.spec.ts`.

Worth stating because it is the general trap: a green suite on a new WP version
proves the version does not break what is *tested*, which is not the same as the
version not breaking anything. WP71-02/03/04 are all unfalsifiable by that suite.

**Flake named in #159, not introduced by it:** `per-role visibility hides an item
from that role only` timed out on a first full e2e run and passed in isolation and
on re-run. The suite shares one WordPress instance and one option row, which
`tests/e2e/fixtures.ts` already documents as an isolation hazard. It will bite CI
eventually and is worth its own todo.

**Also open, and unrelated to 7.1:** [#157](https://github.com/dknauss/Maestro/pull/157)
(dependabot, `@axe-core/playwright` 4.12.1 → 4.13.0).

---

## Verification status of this note

- Items 1–3 in the changes table are read from the linked dev notes.
- WP71-01's implementation is read from `68f7d6f`'s diff.
- WP71-02's counts are measured on `68f7d6f`.
- **Nothing here was observed running under 7.1 by the author of this note.**
  #159's suite run is the only runtime evidence in the file, and it is quoted from
  that PR rather than reproduced.
