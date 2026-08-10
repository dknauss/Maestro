---
created: 2026-08-09T00:00:00.000Z
title: Reconcile the SPEC/PROJECT V2 backlog against what actually shipped
area: planning-hygiene
files:
  - SPEC.md (Roadmap section, items 1-11 — the second backlog)
  - .planning/PROJECT.md:171 (the V2-xx prose paragraph)
  - .planning/REQUIREMENTS.md (Deferred section — "UX-11 follow-ups", unspecified)
  - .planning/todos/pending/ (the todo system that should mirror it)
---

## Problem

**There are two backlogs and they do not agree.**

`SPEC.md`'s Roadmap section and `PROJECT.md`'s V2-xx prose paragraph carry
post-1.0 items. `.planning/todos/pending/` carries the ones anyone actually
works from. Only **2 of 10** V2 items ever made it across:

| V2 | Item | Tracked in todos? |
|---|---|---|
| V2-06 | config presets / export-import | ✅ yes |
| V2-15 | role cloning / per-user hiding | ✅ became ROLE-02 |
| **V2-09** | configurable admin-menu width | ❌ PROJECT.md prose only |
| **V2-10** | admin-toolbar editing research | ❌ PROJECT.md prose only |
| **V2-11** | heavier/solid bundled icon set | ❌ only in ARCHIVED v1.1/v1.2 milestone docs |
| **V2-12** | UI/UX design polish | ❌ prose only — **and stale, see below** |
| V2-13 | doc-link hygiene | ❌ prose only — believed DONE (Phase 8) |
| V2-14 | banner source/regeneration | ❌ prose only — believed DONE (Phase 8) |
| V2-16 | third-party compat research | pulled forward to v1.2 Phase 10 |
| V2-17 | privileged editor tier research | referenced in PROJECT/STATE/19-CONTEXT |

## Why this matters more than tidiness

**SPEC.md item 11 / V2-12 is actively misleading.** It reads:

> **UI/UX design polish.** Review edit mode as a dense WordPress admin tool:
> control hierarchy, spacing, responsive behavior, modified-state affordances,
> save/error status clarity, icon-picker scanability, and first-run/onboarding
> cues.

Phase 23 delivered essentially all of that as UX-13 (native wp-admin restyle of
every edit-mode surface, 5/5 plans, shipped in v1.3.1). But item 11 is **not
struck through**, while items 3, 4 and 5 beside it *are* struck with "Done". A
reader scanning that list concludes it is open work.

This is the same failure mode as Phase 25's criterion 1 — work landed, the doc
was never updated, and the entry kept reading as open. That one sat stale for a
week and would have had 25-02 recolouring a glyph that was already the right
colour. It was caught only because 25-01 was written as an audit rather than an
implementation plan. Nothing is currently auditing SPEC.md.

Two more UX items (**V2-09 menu width**, **V2-10 toolbar editing**) are real,
unbuilt, and have never been schedulable — they exist as clauses in one long
prose paragraph.

`REQUIREMENTS.md` separately defers *"UX-11 follow-ups beyond the screenshot
recapture"* without saying what they are. That is an unresolvable reference: no
one can act on it or close it.

## Recommended fix

1. **Audit each SPEC.md roadmap item and each V2-xx against shipped reality.**
   Strike what is done, with the phase/version that did it — the way items 3-5
   already are. Candidates for striking on inspection: item 11/V2-12 (Phase 23),
   V2-13 and V2-14 (Phase 8).
2. **Convert what survives into todos**, one file each, so it is schedulable.
   At minimum V2-09, V2-10, and whatever remains of item 5's icon work
   (media-library/URL input, SVG upload sanitisation, `mask-image` recolour,
   V2-11's heavier bundled set).
3. **Resolve or delete "UX-11 follow-ups"** in REQUIREMENTS.md — name them or
   drop the line.
4. **Decide which list is the system of record** and say so in both files. Two
   backlogs that disagree is the root cause; striking items without fixing that
   just resets the clock.

## Not urgent

Nothing here blocks a release, and v1.5.0 shipped without it mattering. But it
compounds: every phase planned from a stale entry costs an audit like 25-01 to
undo, and the next one may not get audited.
