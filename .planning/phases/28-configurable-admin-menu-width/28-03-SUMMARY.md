# Phase 28 · Plan 03 — Summary

**Date:** 2026-10-21
**Status:** Built and tested. Task 1's choices were offered to Dan with a
recommended option, which this build implements. Task 4's human pass is still
owed; see `28-VERIFICATION.md`.

## Task 1 — the control's form

| Question | Built as | Why |
|---|---|---|
| Field form | Slider **and** number, kept in sync | A slider alone is imprecise, and a number alone loses the live feel. |
| Unset display | "Using the WordPress default (160px)." | "Unset" and "160" are different stored states under the sparse contract, so the label names the default rather than pretending a value is stored. |
| Reset All | Clears the width | It already did: `DELETE` removes the option and the editor reloads. "Back to WordPress defaults" includes the width. |
| Reset Item | Never touches the width | Asserted in `menu-width.spec.ts`. |
| Edge drag | Built, with the WAI-ARIA window-splitter pattern | `role="separator"` with a value, arrow keys (Shift ×5), Home/End. The drag is not pointer-only. |

## Task 2 — the control

- **Settings dialog** (`openSettings()`), opened from a new gear button in the
  toolbar's right zone, per `DECISION-settings-surface.md`. This is the shared
  shell Phase 27's Profiles modal can follow. It reuses the existing popover
  idiom (`role="dialog"`, `aria-modal`, Escape closes, Tab trapped, focus returns
  to the button).
- **One path:** the dialog and the handle both call `setMenuWidth()`, which
  clamps via `maestroLogic.clampMenuWidth()`, previews, and calls the existing
  debounced `scheduleAutosave()`. `buildConfig()` now writes the live
  `menuWidth`, not the value the page loaded with.
- **Preview changes the menu, not the property:** a `<style>` holding
  `maestroLogic.menuWidthCss()`, byte-identical to PHP's
  `Assets::menu_width_css()` (both suites assert the same literal). 28-01's
  measurement moves the toolbar by itself, and a width another plugin forces
  visibly does not change. `widthOverriddenAt()` reads that difference and the
  dialog says so.
- **Found and fixed:** `placePopover()` anchored at the button's left edge, so a
  dialog opened from the right zone ran off-screen and scrolled the page
  sideways. It now clamps into the viewport, which also protects the existing
  popovers.

## Task 3 — e2e, docs, gate

- `tests/e2e/specs/menu-width.spec.ts`: 5 tests (field to reload to ordinary
  page to folded; slider keyboard + Use default + Escape focus return; drag and
  keyboard on the handle; Reset Item; another plugin's width).
- Docs: README quick start and footprint, readme.txt feature list and
  performance, `docs/user-guide.md` "Widen The Menu", TESTING.md.
- Local: unit 192/192, WPCS, PHPStan, JS 99/99, doc links. All 18 width e2e
  tests (28-01, 28-02, 28-03) passed against a local SQLite WordPress 7.1.3.
  CI runs the full gate.
