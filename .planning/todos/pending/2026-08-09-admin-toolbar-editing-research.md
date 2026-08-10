---
created: 2026-08-09T00:00:00.000Z
title: Admin toolbar editing — feasibility research (V2-10)
area: research
files:
  - includes/class-admin-bar.php (Maestro's own toolbar node — the existing touchpoint)
  - .planning/phases/19-cosmetic-hiding-feasibility/19-FEASIBILITY-NOTE.md (the model for this deliverable)
---

## Problem

Whether the in-place editor could extend to the top admin bar (`#wpadminbar`) —
hide/reorder/rename toolbar nodes with a better inline interface than existing
tools offer.

Extracted from `SPEC.md` Roadmap item 10 / `PROJECT.md`'s V2 paragraph during the
2026-08-09 backlog reconciliation, where it had never been schedulable.

## The deliverable is a NOTE, not a feature

Explicitly a feasibility note first, as `SPEC.md` says — no commitment to build.
`19-FEASIBILITY-NOTE.md` (ROLE-01) is the shape to copy: it answered a
go/no-go question with an explicit verdict, a storage recommendation, a named
resolution seam, and invariants that must hold. That note is why Phase 21 could
be planned confidently, and why its cosmetic-only claim was provable.

## Sequencing note (added 2026-08-10)

**AME ships a Toolbar add-on**, and it has never been looked at.
[[2026-08-10-ame-feature-surface-research]] covers both add-ons as part of its
sweep, so its matrix will say what AME's toolbar product actually does — which is
directly relevant prior art for the questions below, particularly which nodes it
treats as safely hideable and whether it makes any cosmetic-vs-access distinction
at all.

Doing the sweep first is cheaper than answering these blind. Not a hard
dependency — this note can proceed without it — but if both are queued, take the
AME matrix first.

## Questions the note must answer

- **`WP_Admin_Bar` node registration** — how nodes are added, when, and whether
  a late pass can reliably mutate them the way `admin_menu` @ `PHP_INT_MAX` does
  for the sidebar
- **Which nodes are safely hideable.** The admin bar carries account and logout
  controls; hiding the wrong node is a different class of harm from hiding a menu
  item, because the sidebar always has a URL fallback and some bar nodes are the
  only path to what they do
- **Front-end vs admin rendering** — the bar renders on the front end too, for
  logged-in visitors. Maestro has never touched the front end; that is a real
  scope boundary, not a detail
- **Per-role and per-user handling** — whether the ROLE-02 seam generalises or
  whether the bar needs its own
- **Whether the cosmetic-only guarantee even holds here.** For the sidebar it is
  structural: core's `$_wp_menu_nopriv` gate stays intact and pages remain
  URL-reachable. The equivalent argument for toolbar nodes has not been made, and
  if it cannot be, that is a no-go verdict rather than a caveat.
