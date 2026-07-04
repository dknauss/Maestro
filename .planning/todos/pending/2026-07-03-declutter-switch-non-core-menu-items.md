---
created: 2026-07-03T18:00:00.000Z
title: Declutter switch — move non-core menu items to a bottom section
area: ordering
files:
  - includes/class-ordering.php (pure ordering seam — a declutter partition would be a sibling function)
  - includes/class-replay.php (reorder_top()/menu_order wiring; admin_menu@PHP_INT_MAX pass if a new separator is ever needed)
  - .planning/compat/BACKLOG.md (COMPAT-05/06 — third-party menu_order/separator fights, directly relevant)
---

## Problem

Plugin admin-menu items routinely queue-jump between/above core items,
cluttering wp-admin. Users want a one-switch "put plugin menus in their place"
mode. Market gap confirmed 2026-07-03: Menu Humility (Jaquith) is the classic
prior art but abandoned since 2018 (~200 installs, WP 4.9-era); the only exact
matches ("Keep New Admin Menu Items in Bottom", Sortacular) have ~10 installs
each; Adminimize / White Label CMS (200k+ each) do visibility only, never
order. No actively maintained real menu editor offers this.

## Solution (research done 2026-07-03, not yet scoped — needs a discuss/feasibility pass)

Mechanism (verified against core trunk + Menu Humility source):
- `menu_order` filter receives/returns the flat array of ALL `$menu` slugs
  **including separators** (`separator1/2/-last`) — Menu Humility's loop
  matches `'separator1'` in that array. So partitioning can be done in the
  existing `Replay::reorder_top()` → `Ordering::top()` seam; no new hooks.
- Classify core vs non-core with a **hardcoded core-slug allowlist** (from
  wp-admin/menu.php: index.php, edit.php, upload.php, link-manager.php,
  edit-comments.php, edit.php?post_type=page, themes.php, plugins.php,
  users.php/profile.php, tools.php, options-general.php, separators) — NOT
  Menu Humility's separator1-boundary heuristic, which has a known
  false-positive failure mode. New pure WP-free `Classifier` alongside
  `Ordering`/`Slug`; network admin has a separate menu set (out of scope or
  separate list).
- Cheap v1 needs **no new separator**: move non-core items after core's own
  `separator-last` (position 99) — an existing core-registered divider gives
  the "below the line" section for free. Maestro creating/labeling its own
  separator stays deferred (SPEC.md Roadmap item 2; separators currently
  skipped, never created — class-replay.php get_menu_model()).

Open design decisions (the "thought" part):
1. **Precedence vs stored `top_order`**: declutter is a computed policy, not a
   per-item delta — today `reorder_top()` assumes one source of truth. Does the
   policy build the base order with explicit user moves replayed on top, or
   does an explicit `top_order` suspend declutter? Needs an explicit contract.
2. **CPT menus** (`edit.php?post_type=…`) are technically plugin-registered
   but often perceived as content (à la Pages). Sweep them down, keep them in
   place, or make it a sub-option?
3. **Third-party fights**: WooCommerce re-anchors its separator via its own
   menu_order filter; LifterLMS rewrites at render time (COMPAT-05/06,
   documented limitations). Declutter needs the same skip-on-ambiguity /
   degrade-gracefully posture, late filter priority, and verification against
   the existing R1 wp-env harness + fixtures.
4. Items plugins self-hide via CSS (Elementor, COMPAT-13) — classification
   should tolerate them.

Candidate for v1.5, pairs naturally with a shipped "Declutter" starter preset
(see [[2026-07-03-config-presets-export-import]]). Pure-logic core
(classifier + partition) fits the PHPUnit-unit TDD seam; e2e extends
separators.spec.ts.

Source: Dan's idea 2026-07-03; prior-art + codebase research in-session.
