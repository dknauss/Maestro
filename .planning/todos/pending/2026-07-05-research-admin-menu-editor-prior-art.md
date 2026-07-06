---
created: 2026-07-05T00:00:00.000Z
title: Research Admin Menu Editor (Jānis Elsts) for prior art on the tricky parts
area: research
files:
  - includes/class-replay.php (apply overrides against the live $menu/$submenu globals — the seam AME also has to solve)
  - includes/class-ordering.php (reorder resilience contract for missing/moved items)
  - includes/class-slug.php (v1.3.0 Slug::normalize — menu-identity drift)
  - .planning/compat/ (R1 third-party compatibility survey — same problem space)
---

## Problem / why

Maestro keeps hitting the same hard edges — menu-item **identity** and slug/URL
drift, **replaying** overrides against the live `$menu`/`$submenu` globals,
**submenu targeting** without a stable id (our DOM-join weak spot, per
TESTING.md), **per-role (and future per-user) cosmetic hiding**, separators, and
third-party menu items that don't behave. Admin Menu Editor by **Jānis Elsts**
(w-shadow, 300k+ installs, ~10+ years) is the deepest prior art in exactly this
space and has almost certainly solved — or documented the sharp corners of —
most of these. Two existing todos already did partial AME prior-art checks;
this captures a focused, first-class research spike.

## Task (research/analysis — no plugin code)

Analyze how AME handles Maestro's tricky parts and capture reusable ideas +
pitfalls, framed as **adopt / avoid / differentiate**:

- **Menu identity** — how does it key items (slug vs URL vs generated id) and
  survive slug/URL drift? Compare to our `Slug::normalize()` + `Ordering`
  resilience contract.
- **Apply model** — full menu rebuild vs sparse delta over the live globals;
  `admin_menu` hook ordering; how it coexists with other plugins that also
  filter the menu.
- **Submenu targeting** without a stable id (our index-based `.wp-submenu`
  DOM-join is the fragile part today).
- **Visibility model** — per-role / per-user hiding, and how (or whether) it
  stays cosmetic vs real access control (ties to Phase 19 / Phase 21).
- **Edge cases** — separators, custom/added items, icon handling; mine their
  changelog + support forum for recurring-bug patterns worth pre-empting.
- **Free vs Pro split** — what's gated behind Pro (market-gap signal; already
  partly noted in the presets todo).

**Deliverable:** a short findings note in `.planning/` (or `.planning/compat/`)
with adopt/avoid/differentiate bullets feeding v1.5 scoping — not a feature.

Candidate for **v1.5** (research spike). Pairs with
[[2026-07-03-config-presets-export-import]] and
[[2026-07-03-declutter-switch-non-core-menu-items]], which already touched AME
prior art.

Source: Dan's request 2026-07-05.
