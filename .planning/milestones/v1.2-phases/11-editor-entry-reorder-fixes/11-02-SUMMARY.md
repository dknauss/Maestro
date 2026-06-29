---
phase: 11-editor-entry-reorder-fixes
plan: "02"
subsystem: admin-bar
tags: [ux-08a, ux-08b, mobile, icon-only, a11y, css, php]
dependency_graph:
  requires: [11-01]
  provides: [ux-08a-impl, ux-08b-impl]
  affects: [11-04]
tech_stack:
  added: []
  patterns: [scoped-specificity-override, meta-title-accessible-name, maestro-ab-label-wrapper]
key_files:
  created: []
  modified:
    - includes/class-admin-bar.php
    - assets/maestro.css
decisions:
  - "maestro-ab-label wrapper added proactively in class-admin-bar.php so the CSS icon-only rule has a stable, plugin-scoped hook (avoids relying on WP core's own .ab-label which may not always wrap raw text nodes)"
  - "meta.title is state-conditional (Edit Admin Menu when entering, Exit Editor when exiting) — more specific than the old generic tooltip and satisfies both the AT accessible name and UX-08b a11y guard"
  - "display:block override uses #wpadminbar li#wp-admin-bar-maestro-toggle specificity (0,2,1) to match core's whitelist pattern exactly — no !important needed"
metrics:
  duration: "~5m"
  completed: "2026-06-21"
  tasks_completed: 2
  files_created: 0
  files_modified: 2
---

# Phase 11 Plan 02: UX-08 Admin-Bar Toggle Mobile Fix Summary

Compact visible labels ('Edit Menu'/'Exit') with long-form accessible names in meta.title, plus a scoped CSS override that keeps the maestro-toggle node visible and icon-only on mobile (<=782px) using WordPress core's whitelist specificity pattern.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | UX-08b: compact visible label + long-form meta.title | a5f18dc | includes/class-admin-bar.php |
| 2 | UX-08a: scoped 782px display:block override + icon-only label hide | 029ba35 | assets/maestro.css |

## What Was Built

### Task 1 — UX-08b: class-admin-bar.php label changes

In `includes/class-admin-bar.php` `add_node()` call:

- **Visible labels** changed: `'Edit Admin Menu'` → `'Edit Menu'` (enter state); `'Exit Editor'` → `'Exit'` (exit state). Both keep their leading dashicon span.
- **Label text wrapped** in `<span class="maestro-ab-label">` around the esc_html__ string in both branches, giving Task 2's CSS a stable, plugin-scoped hook for icon-only hiding.
- **meta.title** changed from the generic `'Toggle in-place admin menu editing'` to state-conditional: `'Edit Admin Menu'` (enter) / `'Exit Editor'` (exit), preserving the long-form accessible name for screen readers and the tooltip rendered by WP from `<a title="...">`.
- PHP syntax clean; strings are in the `maestro-menu-editor` text domain (consistent with rest of file). No JS i18n payload change — LocalizationTest unaffected.

### Task 2 — UX-08a: maestro.css responsive override

Added two rules inside the existing `@media screen and ( max-width: 782px )` block (before the closing brace at former L511):

```css
/* UX-08a: WP core hides all top-level admin-bar nodes at <=782px via
 * #wp-toolbar > ul > li { display:none } and whitelists only built-in nodes.
 * Keep our editor entry reachable on mobile. Specificity (0,2,1) matches
 * core's own whitelist pattern — no !important needed. */
#wpadminbar li#wp-admin-bar-maestro-toggle { display: block; }

/* Icon-only: hide the label text, keep the dashicon so the tap target
 * remains identifiable without eating toolbar width on a phone. The
 * accessible name is preserved in the <a title="..."> from meta.title. */
#wpadminbar li#wp-admin-bar-maestro-toggle .maestro-ab-label { display: none; }
```

- Specificity (0,2,1) matches WP core's whitelist pattern; no `!important`.
- Scoped to the single node ID — does not affect any other admin-bar node.
- `.maestro-ab-label` (not `.ab-label`) targets only the plugin-controlled wrapper, not any WP core structure.

## Test Status

- **UX-08b (AdminBarTest.php)**: Tests assert `title` contains 'Edit Menu'/'Exit' and `meta.title` contains 'Edit Admin Menu'/'Exit Editor'. Implementation satisfies all four test methods. Integration test runs under wp-env with Docker — deferred to Wave 2 gate (11-04) per project convention (Maestro test-execution sandbox gap memory).
- **UX-08a (editor.spec.ts)**: E2e asserts `#wp-admin-bar-maestro-toggle` visible, `.ab-icon` visible, and node bounding width <=60px at 782px and 600px viewports. Implementation satisfies all three assertions. E2e deferred to Wave 2 gate (11-04) for same reason.
- **Wave 2 gate**: `npm run test:php` (AdminBarTest) and `npm run test:e2e` (UX-08a) run sandbox-disabled in 11-04.

## Deviations from Plan

None — plan executed exactly as written. The `maestro-ab-label` wrapper was added proactively as the plan recommended ("prefer adding the `maestro-ab-label` wrapper proactively — it is harmless when `.ab-label` already exists").

## Self-Check: PASSED

| Item | Status |
|------|--------|
| includes/class-admin-bar.php modified | FOUND |
| assets/maestro.css modified | FOUND |
| 'Edit Menu' in class-admin-bar.php | FOUND |
| 'Exit' (short form) in class-admin-bar.php | FOUND |
| 'Edit Admin Menu' in class-admin-bar.php (meta.title) | FOUND |
| 'Exit Editor' in class-admin-bar.php (meta.title) | FOUND |
| 'maestro-ab-label' wrapper in class-admin-bar.php | FOUND |
| wp-admin-bar-maestro-toggle in maestro.css | FOUND |
| @media max-width:782px block present | FOUND |
| Commit a5f18dc (Task 1) | FOUND |
| Commit 029ba35 (Task 2) | FOUND |
