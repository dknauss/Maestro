# WordPress 7.1 — compatibility register

**Opened:** 2026-08-18
**Last updated:** 2026-08-21 — WP71-02 closed and WP71-03 half-closed by measurement on `572f472`
**Maestro baseline at opening:** v1.5.2 (shipped), `main` at `68f7d6f`
**7.1 status at opening:** RC (CI had run against a real `7.1-RC4-63322` build); the
2026-08-21 measurements were taken on `7.1.1-alpha-63326`

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

### ✅ WP71-02 — the rationale expired; the conclusion survives, for a better reason

**Closed 2026-08-21 by measurement.** Read on `572f472` (v1.5.3) against a running
`7.1.1-alpha-63326` wp-env instance. First entry in this file backed by observation
rather than by reading a dev note.

Phase 23 recorded that Maestro's colours stay hardcoded because *no admin-colour-scheme
CSS variable exists for a custom-drawn surface to inherit*. That **wording** is now
false: 7.1 puts **167 `--wpds-*` custom properties on `:root`**, and `wp-theme` is both
registered *and* enqueued by default on admin screens (`wp_style_is()` true for both).

The **conclusion** survives anyway, on two findings the dev note does not state.

#### 1. The tokens are scheme-blind. The surface Maestro draws on is not.

| Scheme | `#adminmenuwrap` | current item | `--wpds-…-surface-neutral` | `--wpds-color-stroke-focus` |
|---|---|---|---|---|
| fresh | `rgb(29,35,39)` | `rgb(34,113,177)` | `#fcfcfc` | `#3858e9` |
| midnight | `rgb(51,60,66)` | `rgb(207,67,57)` | `#fcfcfc` | `#3858e9` |
| ocean | `rgb(57,83,90)` | `rgb(86,121,88)` | `#fcfcfc` | `#3858e9` |
| sunrise | `rgb(138,49,45)` | `rgb(173,99,30)` | `#fcfcfc` | `#3858e9` |
| coffee | `rgb(92,76,64)` | `rgb(145,103,69)` | `#fcfcfc` | `#3858e9` |

**Zero of 167 tokens changed value across all five schemes.** Scheme-following was the
entire prize in adopting them, and it is not on offer: a token cannot make
menu-adjacent chrome native to a scheme it has no knowledge of. The `#adminmenuwrap`
subtree does not re-scope the tokens either — it reports root's `#fcfcfc`, i.e. the
light-canvas value, on a surface that is dark in every scheme.

#### 2. The palette is Gutenberg's, not classic wp-admin's.

Every value is a near-miss against what Maestro already uses:

| Role | wpds | Maestro now | contrast between the two |
|---|---|---|---|
| card surface | `#fcfcfc` | `#fff` | 1.03 |
| body text | `#1e1e1e` | `#1d2327` | 1.05 |
| brand / accent | `#3858e9` | `#2271b1` | 1.09 |
| stroke | `#dbdbdb` | `#c3c4c7` | 1.26 |
| secondary text | `#707070` | `#50575e` | 1.48 |

Adopting these would not align Maestro with the classic screens it draws on — it would
align it with the **editor**, by a margin too small to read as deliberate. Of the three
available outcomes (match, differ clearly, almost-match), near-miss is the worst.

#### Decision: stay hardcoded — and this is now the recorded reason

Not "no variables exist" but: *the tokens describe a different design language than the
surface this plugin draws on, and they are scheme-blind where that surface is
scheme-aware.* That is a live justification rather than a stale one, which is what this
entry was opened to obtain. Revisit if core ever seeds `--wpds-*` from the admin colour
scheme — that single change would reverse the decision.

**`ThemeProvider` is separately out of scope.** It is a React component from
`@wordpress/theme`; Maestro has no React and no build step (`class-assets.php:113`
enqueues hand-written JS). It also exists so a plugin can express *brand identity*,
which is the inverse of this plugin's premise.

**Worth taking opportunistically** — the non-colour scales, when that CSS is open for
another reason. `--wpds-border-radius-*` is `1/2/4/8/12px`, and Maestro's `3px` is off
that scale entirely; `--wpds-cursor-control` covers the six `cursor: pointer` sites but
**not** the deliberate `cursor: default` ones (`maestro.css:238`, where the absent hand
cursor *is* the design). These are static too — adoption buys alignment with core's
scale, not the following of a user setting.

**If any of it is adopted, guard the dependency:** test
`wp_style_is( 'wp-theme', 'registered' )` before appending it. `WP_Dependencies` drops
an item whose dependency is unregistered, so an unguarded
`array( 'dashicons', 'wp-theme' )` would mean `maestro.css` does not print **at all** on
the 6.4–7.0 floor.

### ◻ WP71-03 — Phase 25's ratios re-measured against 7.1: they hold

**Ratio half closed 2026-08-21. Focus-state interaction half still open.**

Phase 25's two recorded figures reproduce **exactly** under 7.1 — focus ring `#72aee6`
at **6.74:1**, toolbar glyphs `#c3c4c7` at **9.11:1**.

They were never at risk, and the reason is worth recording because this entry was
framed slightly wrong when it was opened: both were measured against **Maestro's own**
`#1d2327` toolbar background (`maestro.css:536`), not against core's sidebar. #65382
moved core's palette; it cannot move a colour Maestro hardcodes for itself.

What *does* vary by scheme is the chrome Maestro draws on the **real** menu surface.
Those ratios had never been measured on any version:

| Scheme | menu surface | `#c3c4c7` text (needs ≥4.5) | `#72aee6` ring (needs ≥3) |
|---|---|---|---|
| fresh | `#1d2327` | 9.11 ✅ | 6.74 ✅ |
| midnight | `#333c42` | 6.45 ✅ | 4.78 ✅ |
| ocean | `#39535a` | 4.71 ✅ | 3.48 ✅ |
| sunrise | `#8a312d` | 4.71 ✅ | 3.48 ✅ |
| coffee | `#5c4c40` | 4.70 ✅ | 3.48 ✅ |

All pass on all five. `ocean`, `sunrise` and `coffee` sit within **0.0003** relative
luminance of one another (0.07795 / 0.07789 / 0.07814) — which is why a single
dark-surface choice covers three schemes at once. That is robustness Maestro already
had and had not recorded.

#### Core's own focus token would have been a regression

`--wpds-color-stroke-focus` (`#3858e9`) against the menu surface: **2.83:1** on fresh,
**2.00:1** on midnight, **1.46:1** on the other three — under WCAG 1.4.11's 3:1 floor on
**every** scheme. Phase 25 chose `#72aee6` as a robustness margin over a value that
passed by 0.07; it now also beats the token core ships. Adopting
`--wpds-color-stroke-focus` on Maestro's dark surfaces is specifically contraindicated,
which is the opposite of the assumption that core's token is the safer default.

#### Still open

The `#3c434a` divider (`maestro.css:651`) is hardcoded against a scheme-aware
background — 1.12–1.58:1 across the five. **Not** a 1.4.11 failure: a subtle zone
divider is decoration, and the comment there says subtle is the intent. But it is cool
grey against `sunrise`'s red and `coffee`'s brown, which is a hue question rather than a
contrast one, and it is unexamined.

**Also unchanged:** core standardising focus indicators to ≥2px (#65645) and improving
focus states on the admin bar and admin menu (#65765, #65726). Maestro draws its own 2px
ring on its own toolbar, so this is likely alignment rather than conflict — none of it
was exercised by the probe, so "likely" is still not "checked".

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

[#159](https://github.com/dknauss/Maestro/pull/159) (merged as `0e3b45e`, CI green, built on
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

**Landed since, and unrelated to 7.1:** [#157](https://github.com/dknauss/Maestro/pull/157)
(dependabot, `@axe-core/playwright` 4.12.1 → 4.13.0) merged as `ffc83ed`.

---

## Verification status of this note

- Items 1–3 in the changes table are read from the linked dev notes.
- WP71-01's implementation is read from `68f7d6f`'s diff.
- WP71-02's original hex/`var()` counts were measured statically on `68f7d6f`, and
  re-derived unchanged on `572f472` (99 hex, 0 `var(--)`, 0 `wpds` in
  `assets/maestro.css`): `grep -oE '#[0-9a-fA-F]{3,8}\b' assets/maestro.css | wc -l`.
- **WP71-02 and WP71-03 were observed running under 7.1** on 2026-08-21, on `572f472`:
  a wp-env instance on `7.1.1-alpha-63326`, driven with Playwright through the existing
  e2e auth harness, reading computed `--wpds-*` values off `:root` and computed
  backgrounds off `#adminmenuwrap` across five admin colour schemes. Contrast figures
  are derived from those measured values with the WCAG 2.x relative-luminance formula,
  not read from a source. Two caveats: the build is `7.1.1-alpha`, slightly ahead of
  7.1.0, so specific hex values could still move — the structural findings
  (scheme-blindness, Gutenberg palette) would not. And **the probe was a throwaway spec,
  not committed**, so re-running it means rewriting it; if these figures are ever load
  bearing again, that spec should land env-gated like the capture specs.
- **Everything else here is still unobserved.** WP71-04 and WP71-05 are read, not run.
