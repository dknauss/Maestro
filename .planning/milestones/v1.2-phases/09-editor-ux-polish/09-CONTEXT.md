# Phase 9: Editor UX Polish - Context

**Gathered:** 2026-06-19
**Status:** Ready for planning
**Source:** `/gsd:discuss-phase 9` — four gray areas selected and deep-dived with the user

<domain>
## Phase Boundary

Refine the **existing** edit-mode toolbar surface for clarity and small/mobile
use. No new architecture, no storage/REST change — every behavioral change carries
its accessibility guardrail. Three roadmap requirements, all on `assets/maestro.js`
+ `assets/maestro.css` (+ the i18n strings in `includes/class-assets.php`):

- **UX-03** — Replace the verbose idle status with a short, glanceable edit-mode
  indicator (signalled by more than colour), and on first run draw the eye to the
  menu itself.
- **UX-04** — Move the rename field's visible label into the input as a placeholder,
  while keeping a programmatic accessible name.
- **UX-07** — Denser control/input sizing at narrow widths so the toolbar fits and
  reads well on mobile, keeping a ≥44px real touch-target floor.

Out of scope: reparenting, separators, drag-drop rework, icon-set changes, any
change to the cosmetic-delta storage model or the `maestro/v1/config` REST contract,
and any new capability beyond polishing these three surfaces.

</domain>

<decisions>
## Implementation Decisions (LOCKED — from user)

### UX-03 — Status indicator copy + mode signal
- **Idle copy: "Edit Mode"** (replaces `'Editor active — click an item to edit.'`,
  `includes/class-assets.php:97`).
  - **Reconciliation note (for plan-checker):** the roadmap success criterion #1
    literally reads `"Menu Edit Mode"`. The user chose the shorter **"Edit Mode"**.
    This is a deliberate wording refinement, not a missed criterion — treat
    "Edit Mode" as the locked target and record that it satisfies the *intent* of
    criterion #1 (short, glanceable, non-colour-signalled). Same reconciliation
    pattern Phase 8 used for REL-06.
- **Non-colour signal: a leading dashicon** beside the green status (WCAG 1.4.1 —
  not colour alone). Recommended glyph **`dashicons-edit`** (pencil); final glyph is
  planner's discretion.
  - **Supersedes** the `assets/maestro.css:285` note ("idle deliberately has NO
    icon"). UX-03 explicitly wants an icon/label signal, so the leading idle icon is
    now intended. The net idle indicator = green + dashicon + "Edit Mode" text.
- **Save states:** the "Edit Mode" mode indicator **persists**; transient
  `Saving…` / `Saved` / `Save failed` states render as a **separate** element beside
  it (mode is always legible). Keep the existing `wp.a11y.speak()` save-announcement
  plumbing.

### UX-03 — First-run attention cue
- A first-run cue already exists: `buildFirstRunCue()` (`assets/maestro.js:194`) +
  `.maestro-firstrun` (`assets/maestro.css:373+`) — localStorage-gated,
  keyboard-dismissible text banner ("Click a menu item to start editing." / "Got it").
- **Keep the existing text banner AND add a subtle one-shot pulse/outline** that
  draws the eye to the menu.
  - **Target:** the **first editable top-level menu item** (teaches the core
    "click an item to edit" gesture directly).
  - **Duration:** **one short animation (~1–2s), then stops** — no persistent/looping
    motion. Under `prefers-reduced-motion: reduce` it degrades to a static outline or
    nothing (reuse the existing `@media (prefers-reduced-motion)` block at
    `assets/maestro.css:307`).
  - **Gate:** same localStorage first-run gate as the banner (cue shows once).

### UX-04 — Rename placeholder + accessible name
- **Field stays pre-filled** with the selected item's current title (current
  `populatePanel` behavior). The placeholder only appears when the field is empty —
  **rename / commit-on-Enter / revert-on-Escape logic is unchanged** (no empty-commit
  behavior change to design or test).
- **Remove the visible "Rename " text label** that currently wraps the input
  (`assets/maestro.js:379–381`) and set it as the input's **placeholder: "Menu label"**
  (noun describing the value — better placeholder semantics than the action verb).
- **Keep a programmatic accessible name via a visually-hidden `<label>`**
  (`class="screen-reader-text"`, tied to the input) — consistent with the existing
  `screen-reader-text` convention in `maestro.js` (panel label, modified badge).
  A placeholder is NOT an accessible name.
- Ensure placeholder text meets WCAG AA contrast.

### UX-07 — Mobile / small-screen pass
- **Density-first, restructure only if needed:** primarily reduce control + input
  **padding and font-size** at narrow widths (CSS-only, no architecture change).
  Adjust toolbar layout (wrap/stack) **only where density alone still overflows.**
- **Breakpoint: 782px** — align with WordPress's own admin mobile breakpoint (below
  782px WP already switches the admin menu/toolbar to mobile mode).
- **≥44px floor on ALL real tap targets** at touch widths: the rename input and every
  interactive button (Icon, Visibility, Reset Item/All, Exit) keep a ≥44px height
  even as font/padding shrink.

### Methodology — TDD strict (red → green → refactor), carried forward
- **Behavioral JS is test-first** (red `node:test` before implementation lands), per
  the global TDD mandate, roadmap criterion #4, and the Phase 6/7 `tests/js/` seam
  (`npm run test:js`). Specifically test-first where a pure/observable contract exists:
  - mode-indicator state transitions (idle ↔ saving/saved/error state mapping),
  - first-run cue **localStorage gate** (shows once, suppressed after dismiss/seen),
  - placeholder **clear-on-focus / empty-vs-filled** wiring logic.
- DOM glue, focus management, animation, and pure CSS density are **UI/styling** →
  covered by Playwright e2e + before/after screenshots, **not** unit TDD.
- Heuristic: if `expect(fn(input)).toBe(output)` is writable first → TDD.

### Zero-regression bar (must hold at phase close) — carried forward
- PHP unit **44/44**, integration **29/29**, Playwright **e2e green**,
  Plugin Check **0 errors**, `composer lint` clean, `npm run test:js` green.
- New tests are **additive** — they raise counts, never lower the passing set.

### Executor-model guidance (per the user's standing "find tasks for sonnet" pattern)
- Tag every plan task with a recommended executor model.
- **sonnet** — CSS density/responsive work to a checklist, mechanical i18n/string
  edits, writing tests from explicit assertions, DOM markup tweaks to spec,
  screenshot capture, lint/format fixes, read-only verification.
- **opus** — only genuine judgment calls (e.g. final dashicon choice if it needs a
  visual call, deciding whether toolbar restructuring is warranted from screenshots).
- Default sonnet; reserve opus for the few real judgments.

### Claude's Discretion (planner decides, justify in the plan)
- Exact dashicon glyph for the mode signal (recommended `dashicons-edit`).
- Pulse/outline visual treatment (colour token, outline vs box-shadow, exact timing
  within the ~1–2s one-shot bound) — must pass reduced-motion + e2e checks.
- Exact narrow-width padding/font values and whether any single control needs a
  layout tweak beyond density.
- Placeholder contrast implementation details (which admin colour token).

</decisions>

<specifics>
## Specific Ideas — codebase anchors

- **Idle status string:** `includes/class-assets.php:97` (`'idle' => …`) plus the
  sibling `saving` / `saved` / `saveError` strings (98–100). New strings for the mode
  label / dashicon affordance go in this same `i18n` array.
- **First-run cue:** `buildFirstRunCue()` call site `assets/maestro.js:194`;
  `.maestro-firstrun*` styles `assets/maestro.css:373–420`; reduced-motion block
  `assets/maestro.css:307`. First-run strings live at `class-assets.php` `firstRun` /
  `firstRunDismiss` (~124–127).
- **Rename field:** `assets/maestro.js:377–392` — the `screen-reader-text` panel
  label, the `<label class="maestro-panel-field">` wrapping `I.rename + ' '`, and the
  `.maestro-rename-input` with its Enter/Escape/blur handlers. `commitRename` is the
  blur handler; revert sets `rename.value = model[selectedSlug].title`.
- **Status / save plumbing:** `wp.a11y.speak()` is already used for save
  success/failure announcements (reuse, don't reinvent).
- **Test layers:** `tests/js/` (`node:test`, `npm run test:js`) for behavioral JS
  logic; `tests/unit` + `tests/integration` (phpunit, must stay 44/29);
  `tests/e2e/editor.spec.ts` (Playwright) for DOM/responsive/a11y regression.
- **Integration budget caveat:** the Localization/Performance integration checks
  assert the edit-mode payload budget — new i18n strings are tiny but keep them within
  that contract.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `buildFirstRunCue()` + `.maestro-firstrun` + the localStorage gate: extend, don't
  rebuild — the cue mechanism and dismiss/gate already exist.
- `screen-reader-text` visually-hidden convention (panel label, modified badge):
  reuse for the UX-04 programmatic rename label.
- `@media (prefers-reduced-motion: reduce)` block (`maestro.css:307`): the place to
  neutralize the new first-run pulse for reduced-motion users.
- `wp.a11y.speak()` announcement plumbing: reuse for any new status announcements.

### Established Patterns
- Single vanilla-JS editor file (`assets/maestro.js`), no build step; `el()` helper
  builds DOM with `textContent` (XSS-safe — keep it that way).
- All edit-mode styling in `assets/maestro.css`; i18n strings localized from
  `includes/class-assets.php`.
- WP admin mobile breaks at 782px — align UX-07 there.

### Integration Points
- i18n strings: `includes/class-assets.php` `i18n` array → consumed as `I.*` in
  `maestro.js`.
- The toolbar/status DOM is built in `buildToolbar()`; the selected-item panel
  (rename/icon/visibility) in the panel builder around `maestro.js:370+`.

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within the UX-03 / UX-04 / UX-07 scope. (Larger backlog
items — reparenting, separators, custom icon upload, import/export, multisite
defaults, configurable menu width — remain in the PROJECT.md post-1.0 backlog, not
this phase.)

</deferred>

---

*Phase: 09-editor-ux-polish*
*Context gathered: 2026-06-19*
