---
created: 2026-08-10T00:00:00.000Z
title: Admin Menu Editor — comprehensive feature sweep, delivered as an AME↔Maestro matrix
area: research
files:
  - .planning/compat/PRIOR-ART-admin-menu-editor.md (the 2026-08-01 spike — its ARCHITECTURE half is done; do not redo it)
  - .planning/compat/SCHEMA.md (the R1 matrix conventions this deliverable should copy)
  - .planning/DECISION-settings-surface.md (the two-icon / no-settings-page budget a candidate must fit)
  - SPEC.md (Roadmap items 1-10 + Out of Scope — the existing claims on this territory)
---

## The deliverable is a MATRIX, not a verdict

**A comprehensive, row-per-feature sweep of Admin Menu Editor, mapped cell by cell
against what Maestro does.** The matrix IS the artifact. Recommendations fall out
of it as a column; they are not the point of the exercise, and the sweep is worth
doing even if every row lands in an already-known bucket.

This supersedes an earlier framing of this todo as a scoping note that might
return "nothing worth adopting". That under-specified the work: whether any single
feature is worth adopting is a judgement per row, not a reason to skip the survey.
The gap being closed is that **AME's feature surface has never been enumerated at
all** — only its architecture.

## Why it doesn't exist yet

[`compat/PRIOR-ART-admin-menu-editor.md`](../../compat/PRIOR-ART-admin-menu-editor.md)
(2026-08-01, AME free 1.15.1, source read) was pulled forward to feed Phase 20 and
answered Phase 20's questions — identity, apply model, submenu targeting, hook
order, storage. Those findings shipped as COMPAT-04/07/14. Its only feature-facing
output is a four-bullet "market signals" list, and every bullet is now spent:

| Named gap (2026-08-01) | Status 2026-08-10 |
|---|---|
| Import/export | Queued as [[2026-07-03-config-presets-export-import]] — unplanned |
| Reparenting / drag between levels | Out of scope in `SPEC.md` v1, gated on highlighting |
| Per-role *deny* | **Shipped** — this is Maestro's cosmetic hiding |
| True inline editing UX | Not a gap; it is the product's premise |

Four bullets is not a survey of a ten-year, ~89-class plugin. Nobody has ever
listed what AME actually does.

## Matrix schema

Copy the R1 conventions from [`compat/SCHEMA.md`](../../compat/SCHEMA.md) — fixed
vocabulary per cell, evidence inline, and a completion check so "comprehensive" is
verifiable rather than asserted. One row per AME feature:

| Column | Values / content |
|---|---|
| **AME feature** | The discrete user-facing capability, named as AME names it |
| **Tier** | `free` · `Pro` · `add-on (Branding)` · `add-on (Toolbar)` |
| **Evidence** | `source-read` (free zip) · `marketing claim` · `forum/changelog` · `upsell string` — see Method |
| **What it does** | One line, behavioural — what a user gets, not how it is built |
| **Maestro status** | `have` · `partial` · `deliberately-not` · `queued` · `unclaimed` · `anti-feature` |
| **Maestro equivalent / blocker** | The shipped feature that covers it, the todo/phase that queues it, or the constraint that rules it out |
| **Note** | Only where the row needs one |

Status vocabulary, defined so cells stay comparable:

- **have** — Maestro ships an equivalent. Name it. These rows make the matrix
  double as a competitive position statement, which is worth as much as the gaps.
- **partial** — an equivalent exists but is narrower. Say how.
- **deliberately-not** — excluded by `REQUIREMENTS.md` Out of Scope or the
  cosmetic-only invariant. **Record why**, because "AME does X and we don't" gets
  asked repeatedly and the answer should be written once.
- **queued** — maps to an existing todo or planned phase. Link it; don't re-derive.
- **unclaimed** — no equivalent, not excluded, not queued. The candidate column.
- **anti-feature** — AME ships it and Maestro should be able to say why it won't.

## Coverage — what "comprehensive" means here

The sweep is not done until each of these is enumerated and every item lands in a row:

1. **AME free**, from the zip — including the `modules/` directory, which the
   2026-08-01 read skipped entirely and which is where the discrete features live.
   The central `WPMenuEditor` class was read; the modules were not.
2. **AME Pro**, from published material. The headline split is already recorded
   (per-role/user granting, hide-from-all-except-one-user, import/export, drag
   between menu levels, new-window/iframe items, shortcodes in fields, colors,
   600+ icons; $49–$179/yr) — but as a list of names, not as evaluated rows.
3. **The add-ons** — Branding and Toolbar — which are their own products and have
   never been looked at at all. The Toolbar add-on overlaps
   [[2026-08-09-admin-toolbar-editing-research]] directly and may inform its
   feasibility question.
4. **The settings/UI surface** — what AME exposes where. Relevant because
   `DECISION-settings-surface.md` locked Maestro's answer and AME is the
   counter-example (a dedicated editor screen).
5. **The database-footprint features** — AME's Settings tab ships "Compress menu
   configuration data" (2.5, zlib in 2.11) and "Optimize menu configuration size"
   (2.27). These are *user-facing toggles*, so they are feature rows despite the
   storage carve-out in Out of scope below, and they are the rows where Maestro's
   **D4 differentiator** (single sparse non-autoloaded row — see
   [`PRIOR-ART-admin-menu-editor.md`](../../compat/PRIOR-ART-admin-menu-editor.md)
   § Differentiate) states itself: status `deliberately-not`, because a config that
   is sparse and out of `alloptions` never needs a compression toggle. Expected to
   be among the strongest `have`/`deliberately-not` rows in the matrix for
   competitive-positioning purposes.
   **Also settle the open evidence question while the zip is open:** confirm
   whether `ws_menu_editor` is written with an autoload argument at all. D4
   currently rests on the author's forum reply plus the changelog, not on a source
   read — grep the `update_option` call and record the answer as `source-read`.

**Completion check** (mirroring SCHEMA.md's): every file in AME's `modules/`
accounted for in at least one row; every bullet on the Pro pricing page accounted
for; both add-ons covered; zero rows with an empty status cell.

## Constraints — a filter on the `unclaimed` column, not on the sweep

Every row still gets surveyed and classified. These decide only whether an
`unclaimed` row is a real candidate, and a row that fails one should be marked
`deliberately-not` **with the reason recorded**, rather than dropped:

- **Cosmetic-only is not negotiable.** AME conflates hiding with access control
  (`do_not_allow` rewrites, `wp_die()` on page access) — its largest
  user-confusion category per the 2026-08-01 forum mining, and Maestro's cleanest
  differentiator. `SPEC.md` item 7 (the enforcement bridge) is already flagged IN
  TENSION; do not let a matrix row smuggle that decision in.
- **The settings surface is decided; the budget is two icons.**
  `DECISION-settings-surface.md` allots Profiles and Settings modals and rules out
  a wp-admin settings page permanently. A menu-wide candidate needing a third icon
  has a placement problem to name in the matrix.
- **Borrow patterns, not code** (`SPEC.md` principle 4). A feature that only works
  under AME's full-rebuild model is `deliberately-not`.
- **Editing happens on the menu.** Anything requiring you to leave the menu to
  configure the menu contradicts the core value.

## Out of scope

The architecture comparison — apply model, hook ordering, storage format, menu
identity, submenu targeting — all answered 2026-08-01. If a feature row needs an
architectural answer, note the dependency in its Note cell and move on.

**One carve-out: the options-table footprint is in scope** (Coverage item 5). The
storage *format* is architecture and stays out, but its consequences — an
autoloaded row that every front-end request pays for, and the two Settings-tab
toggles AME ships to manage it — are user-visible and are Maestro's D4 selling
point. They earn rows.

Other prior art is also out: "Wider Admin Menu" and "Hide Admin Menu" belong to
`SPEC.md` items 9 and 10. AME-only keeps this bounded.

## Method

Free AME is GPL and readable from the official zip — same as the 2026-08-01 read.
**Pro is not**, and neither are the add-ons: their feature sets come from
marketing pages, the free build's upsell strings, and the support forum. That is a
real epistemic difference between rows, which is why **Evidence is a column**
rather than a footnote. Label Pro rows as claims. Do not cite the unconfirmed
`Priyank57/admin-menu-editor-pro` GitHub mirror; it was never confirmed as
Elsts-authored.

**Re-check the version first.** AME was pinned at free 1.15.1 on 2026-08-01;
record the version studied and skim the changelog delta before drawing
conclusions.

## After the matrix

Rank the `unclaimed` rows against the queued-but-unplanned set —
[[2026-07-03-config-presets-export-import]],
[[2026-07-03-declutter-switch-non-core-menu-items]],
[[2026-08-09-icon-picker-remaining-scope]], Phase 22 — rather than in isolation. A
new candidate that loses to something already queued is a finding worth writing
down.

**Placement:** `.planning/compat/PRIOR-ART-admin-menu-editor-features.md`, beside
the architecture note rather than inside it — that one is a shipped input to Phase
20 and should stay readable as the record of what fed those fixes.

Source: Dan's request 2026-08-10, after confirming no AME research phase was ever
planned; scope clarified the same day to a comprehensive sweep with a matrix
deliverable.
