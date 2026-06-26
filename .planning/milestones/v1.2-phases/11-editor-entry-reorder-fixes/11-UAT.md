---
status: diagnosed
phase: 11-editor-entry-reorder-fixes
source: [11-01-SUMMARY.md, 11-02-SUMMARY.md, 11-03-SUMMARY.md, 11-04-SUMMARY.md]
started: 2026-06-21T22:25:00Z
updated: 2026-06-21T22:55:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Mobile editor entry stays visible (UX-08a)
expected: At ≤782px width in wp-admin, the Maestro edit toggle stays visible in the admin bar as an icon-only button (pencil dashicon), not hidden and not showing a full text label.
result: issue
reported: "the maestro edit toggle disappears in mobile-responsive view, but if the user is already in edit mode, the exit icon does remain in view in small viewports. the rest of the edit interface needs work to accommodate all the buttons when a menu item is selected. see screenshot attached"
severity: major

### 2. Compact label with full accessible name (UX-08b)
expected: At normal desktop width, the admin-bar toggle shows a COMPACT visible label — "Edit Menu" (and "Exit" once editing). Hovering it (tooltip) / a screen reader announces the LONG form — "Edit Admin Menu" (and "Exit Editor"). Short text is visible; long text is the accessible name.
result: pass

### 3. Keyboard reorder preserves separators (BUG-06)
expected: Enter edit mode, select a top-level menu item, and use Alt+Arrow (Up/Down) to move it past one of the gray separator lines. The item moves one position, and the separator lines STAY in their original places — the menu is not distorted and separators don't get pushed to the bottom.
result: issue
reported: "option + arrow does not work on mac; the active field is the rename box, and this key combo moves the cursor to the front and end of the menu item name in the form field"
severity: major

### 4. Modified badge sits on the changed row (BUG-07)
expected: In edit mode, change a top-level item that HAS a submenu (e.g. rename "Posts"). The "modified" badge (a bullet •) appears INLINE next to that item's label, in the same row as the item — NOT below or after its expanded submenu list.
result: pass
note: "Badge position correct (on the row). Cosmetic: user reports the bullet is too small / barely visible — logged as a cosmetic gap."

## Summary

total: 4
passed: 2
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "At ≤782px the Maestro edit ENTRY toggle ('Edit Menu') stays visible and reachable in the admin bar — not only the EXIT toggle in edit mode"
  status: failed
  reason: "User reported: the maestro edit toggle disappears in mobile-responsive view; only the exit icon (edit mode) remains visible at small viewports. The entry point — the actual purpose of UX-08 — is still hidden on mobile. NOTE: the UX-08a e2e guard and the committed ux-08a-{782,600}.png both navigated with maestro_edit=1 (edit mode = exit state), so they only ever exercised the exit toggle; the non-edit enter state at mobile width was never asserted. The CSS override (#wpadminbar li#wp-admin-bar-maestro-toggle{display:block} @≤782px) shows the exit node but evidently does not win for the enter node — likely a state-specific node class/position or specificity gap. Fix must also extend the e2e guard + capture to the non-edit (enter) state."
  severity: major
  test: 1
  root_cause: "includes/class-assets.php:55 — enqueue() returns early `if ( ! is_edit_mode() ) return;` BEFORE wp_enqueue_style('maestro', …) at :59, so assets/maestro.css (which holds the ≤782px admin-bar override at :516/:521) loads ONLY in edit mode. In the enter (non-edit) state the stylesheet is absent, so WP core's ≤782px `display:none` for top-level admin-bar items wins and the toggle disappears. The exit state works only because edit mode loads the stylesheet. Node markup in class-admin-bar.php is symmetric and correct — not the cause."
  artifacts:
    - path: "includes/class-assets.php:54-59"
      issue: "is_edit_mode() early-return gates the maestro.css enqueue, so the always-needed admin-bar override is edit-mode-only"
    - path: "assets/maestro.css:511-522"
      issue: "≤782px override lives only in the edit-mode-gated stylesheet"
  missing:
    - "Enqueue the ≤782px admin-bar toggle override unconditionally (e.g. split into a tiny always-loaded assets/maestro-admin-bar.css enqueued before the is_edit_mode() return with a dashicons dependency; or move the maestro.css enqueue above the early return)"
    - "Extend the UX-08a e2e to assert the ENTER state (navigate /wp-admin/index.php with NO maestro_edit) at ≤782px, in addition to the exit state"
    - "Add enter-state screenshot captures (ux-08a-enter-{782,600}.png)"
  debug_session: ""
- truth: "At narrow widths the edit toolbar accommodates all action buttons (Add menu item, Visibility, Reset All, Exit, Reset Item) without crowding/overflow when an item is selected"
  status: failed
  reason: "User reported: the rest of the edit interface needs work to accommodate all the buttons when a menu item is selected — at mobile width the toolbar buttons wrap and crowd (see screenshot: Add menu item / Visibility / Reset All / Exit / Reset Item spill across rows). Distinct from the admin-bar toggle issue; concerns the bottom edit toolbar layout at small viewports."
  severity: minor
  test: 1
  root_cause: "assets/maestro.css toolbar is a single flex-wrap row; when an item is selected .maestro-panel holds 4 controls (rename input + Icon + Visibility + Reset Item) while .maestro-toolbar-right (Reset All + Exit) is flex-shrink:0 with margin-left:auto, so at ≤600–782px the row exceeds viewport width and wraps/crowds. Existing UX-07 density rules shrink gap/padding/font but nothing compresses the panel buttons horizontally when all four are visible."
  artifacts:
    - path: "assets/maestro.css:251-265,471-509"
      issue: "toolbar flex rules; no narrow-width compression for the 4-control selected-item panel"
    - path: "assets/maestro.js (iconBtn/visBtn creation, ~:420-434)"
      issue: "secondary buttons have no aria-label and no .maestro-btn-label span, so they cannot be safely collapsed to icon-only"
  missing:
    - "At ≤600px collapse the secondary panel buttons (Icon, Visibility) to icon-only with min-width:44px to preserve the WCAG 2.5.5 tap-target floor"
    - "JS: add aria-label + a .maestro-btn-label text span to iconBtn/visBtn so only the visible label hides (avoid a 4.1.2 unlabeled-control regression)"
  debug_session: ""
- truth: "Keyboard reorder (Alt/Option+Arrow) moves the selected top-level menu item and is usable on macOS"
  status: failed
  reason: "User reported (macOS): Option+Arrow (= Alt on Mac) does not reorder. When an item is selected the focused field is the rename text box, and Option+Arrow performs macOS caret navigation (jump to start/end of the item name) inside that input instead of triggering the reorder handler — the keyboard reorder is effectively unreachable on Mac. NOTE: the L355 'keyboard-only reorder' e2e passes only because it focuses the menu item and dispatches Alt+Arrow programmatically in headless Linux Chromium — it never exercises the real focus context (rename input focused) or macOS Option+Arrow caret-nav interception. Fix needs a reorder affordance reachable when the rename input has focus and/or a key combo not swallowed by text-field caret navigation, plus an e2e guard reflecting the real focus context. Second instance (with the Test 1 enter-toggle gap) of an automated guard passing on an idealized scenario that masks real-world unreachability."
  severity: major
  test: 3
  root_cause: "assets/maestro.js:247 reorder keydown handler (on #adminmenu, bubble phase) guards `if ( e.target.closest('.maestro-popover, input, button') ) return;` at :252. Selecting an item calls selectItem(li,{focusPanel:true}) → panel.rename.focus() (:355-361), so focus lands in the rename <input>. Option+Arrow then (a) hits the input guard and returns immediately, and (b) on macOS is consumed by the text field as word-wise caret navigation before JS preventDefault can fire. Chicken-and-egg: the documented Alt/Option+Arrow path is unreachable after the first selection on Mac (works only if focus is manually on the row anchor)."
  artifacts:
    - path: "assets/maestro.js:247-338"
      issue: "reorder handler; input guard at :252 bails when the rename input is the event target"
    - path: "assets/maestro.js:355-361"
      issue: "selectItem focuses the rename input on every selection (focusPanel:true)"
    - path: "assets/maestro.js:333,:352"
      issue: "aria-keyshortcuts advertise Alt+ArrowUp/Down — wrong on macOS"
    - path: "tests/e2e/editor.spec.ts:373-374"
      issue: "test manually re-focuses the row anchor before Alt+Arrow — papers over the real focus context"
  missing:
    - "Provide an OS-independent reorder affordance — RECOMMENDED: explicit up/down (▲/▼) buttons in the panel that call the existing reorderMove/insertBefore path (Tab-reachable from the rename input; works on all OSes + AT); optionally also a non-conflicting key combo"
    - "Update aria-keyshortcuts + i18n strings to match the chosen affordance"
    - "e2e: delete the :373-374 re-focus cheat, assert the rename input is focused after selection, then drive the actual control (button click is fully reproducible headless; an Alt/Option+Arrow-on-input test can pass headless yet still fail on real macOS)"
  design_decision: "RESOLVED (user, 2026-06-21): add explicit ▲/▼ up/down reorder buttons in the panel — Tab-reachable from the rename input, reusing the existing reorderMove/insertBefore path; OS-independent and accessible. Fold these buttons INTO the Gap-2 toolbar compression so they fit at mobile widths (icon-only ▲/▼ with aria-labels). Optionally retain a non-conflicting key combo (NOT Alt/Option+Arrow) as an extra accelerator. Update aria-keyshortcuts/i18n to match. Keep rename auto-focus-on-select (do not regress the type-immediately flow)."
  debug_session: ""
- truth: "The modified-state badge (bullet •) on a changed row is large/visible enough to read at a glance"
  status: failed
  reason: "User reported (Test 4 passed for position): the bullet is too small, barely visible. Badge lands in the correct place (.wp-menu-name) but its glyph size/contrast is too low to notice. Cosmetic CSS-only polish — likely font-size/weight or swap the bullet for a clearer indicator."
  severity: cosmetic
  test: 4
  root_cause: "assets/maestro.css:84 — .maestro-modified-badge font-size:10px renders the • (U+2022) glyph ~7px tall, easily overlooked. Color/contrast (#dba617 on #1d2327 ≈5.5:1) is fine; the glyph SIZE is the issue."
  artifacts:
    - path: "assets/maestro.css:82-90"
      issue: "badge font-size:10px too small to read at a glance"
  missing:
    - "Bump font-size to 14–16px (it's a graphical marker, not body text). No layout/contrast/a11y regression — vertical-align:middle, pointer-events:none, and the .maestro-modified-sr sr-text sibling are unchanged"
  debug_session: ""
