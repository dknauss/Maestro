---
created: 2026-08-10T00:00:00.000Z
title: Admin Menu Editor — feature-surface scoping research (what to build next, not how)
area: research
files:
  - .planning/compat/PRIOR-ART-admin-menu-editor.md (the 2026-08-01 spike — its ARCHITECTURE half is done; do not redo it)
  - .planning/DECISION-settings-surface.md (the two-icon / no-settings-page budget any adopted feature must fit)
  - .planning/phases/19-cosmetic-hiding-feasibility/19-FEASIBILITY-NOTE.md (the deliverable shape to copy)
  - SPEC.md (Roadmap items 1-10 + Out of Scope — the existing claims on this territory)
---

## Problem

AME has been read once, and only architecturally.
[`compat/PRIOR-ART-admin-menu-editor.md`](../../compat/PRIOR-ART-admin-menu-editor.md)
(2026-08-01, AME free 1.15.1, source read) was pulled forward to feed Phase 20 and
answered Phase 20's questions — identity, apply model, submenu targeting, hook
order, storage. Those findings shipped as COMPAT-04/07/14.

It never examined AME as a *product*. Its whole feature-facing output is one
"market signals" section whose gap list is now spent:

| Named gap (2026-08-01) | Status 2026-08-10 |
|---|---|
| Import/export | Queued as [[2026-07-03-config-presets-export-import]] — unplanned |
| Reparenting / drag between levels | Out of scope in `SPEC.md` v1, gated on highlighting |
| Per-role *deny* | **Shipped** — this is Maestro's cosmetic hiding |
| True inline editing UX | Not a gap; it is the product's premise |

The one artifact meant to say what to build next has nothing unclaimed left in it,
and after Phases 27/28 there is no milestone. That makes this worth doing now — and
easy to get wrong by inventing features instead of finding them.

## The deliverable is a NOTE, not a feature

Same contract as [[2026-08-09-admin-toolbar-editing-research]]: a scoping note, no
commitment to build. `19-FEASIBILITY-NOTE.md` is the shape — explicit verdict,
reasons, named constraints, written so a phase can be planned from it.

**A legitimate verdict is "nothing worth adopting."** If the remaining gaps are all
already queued, say so in a paragraph and stop. Do not pad a feature list to justify
the pass.

## Scope

**In:** the user-facing feature inventory of AME free, Pro, and its add-ons
(Branding, Toolbar) — including the free build's `modules/` directory, which the
prior read skipped and which is where discrete features live. Map each to one
verdict:

1. **Have it** — name Maestro's equivalent, so the note doubles as a position statement
2. **Deliberately not** — excluded by Out of Scope or cosmetic-only; record *why*, because this gets asked again
3. **Already queued** — link the todo/phase, don't re-derive
4. **Genuinely unclaimed** — the only category that produces new work
5. **Anti-feature** — they ship it; we should be able to say why we won't

**Out:** architecture, apply model, hook ordering, storage, identity, submenu
targeting — all answered 2026-08-01. If a feature finding needs an architectural
answer, note the dependency and stop. Also out: other prior art — "Wider Admin Menu"
and "Hide Admin Menu" belong to `SPEC.md` items 9 and 10. AME-only is what keeps
this bounded.

## Constraints an "unclaimed" finding must already clear

Reject in place rather than surfacing for a later phase to reject again:

- **Cosmetic-only is not negotiable.** AME conflates hiding with access control
  (`do_not_allow`, `wp_die()`), its largest user-confusion category per the
  2026-08-01 forum mining. `SPEC.md` item 7 (enforcement bridge) is already flagged
  IN TENSION — don't let a feature finding smuggle that decision in.
- **The settings surface is decided; the budget is two icons.**
  `DECISION-settings-surface.md` allots Profiles and Settings modals and rules out a
  wp-admin settings page permanently. A feature needing a third icon has a placement
  problem to solve *in the note*.
- **Borrow patterns, not code** (`SPEC.md` principle 4). A feature that only works
  under AME's full-rebuild model is a no.
- **Editing happens on the menu.** Anything requiring you to leave the menu to
  configure the menu contradicts the core value.

## Questions the note must answer

- **What does AME free actually let a user do, enumerated?** Start with `modules/`.
- **What is Pro-gated, and which are Maestro's cheapest credible free wins?** The
  headline split is recorded (granting, hide-from-all-except-one, import/export,
  drag between levels, iframe items, colors, 600+ icons, Branding, Toolbar;
  $49–$179/yr). Missing is the per-feature judgement: cost, fit with cosmetic-only,
  and whether "AME charges for this" is demand evidence or just their packaging.
- **Do the recurring-pain categories point at features, not just fixes?** The five
  named on 2026-08-01 were mined for bugs to pre-empt. "Menu reset to default"
  confusion in particular smells like a missing feature — a durable answer to *what
  changed and how do I get back* — which per-item reset plus
  [[2026-07-03-config-presets-export-import]] may or may not already be.
- **Has AME shipped since 1.15.1?** Re-check version and changelog delta first;
  record the version studied, as the prior note did.
- **Does anything justify a milestone?** Rank candidates against the
  queued-but-unplanned set ([[2026-07-03-config-presets-export-import]],
  [[2026-07-03-declutter-switch-non-core-menu-items]],
  [[2026-08-09-icon-picker-remaining-scope]], Phase 22) — a new idea that loses to
  something already queued is a finding too.

## Method

Free AME is GPL and readable from the official zip. **Pro is not** — its feature set
comes from marketing, upsell strings, and the forum, all claims rather than verified
behaviour. Label those unverified, as the prior note did. Do not cite the
unconfirmed GitHub mirror.

**Placement:** `.planning/compat/PRIOR-ART-admin-menu-editor-features.md`, beside the
architecture note rather than inside it — that one is a shipped input to Phase 20 and
should stay readable as the record of what fed those fixes.

Source: Dan's request 2026-08-10, after confirming no AME research phase was ever
planned.
