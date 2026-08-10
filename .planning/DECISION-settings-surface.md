# Decision: where menu-wide features live

**Decided 2026-08-10.** Unblocks Phase 27 (profiles) and Phase 28 (width), which
both stalled on the same question from different directions.

## The decision

**Two new icon buttons in the edit-mode toolbar's right zone, each opening a
modal dialog:**

| Icon | Modal | Owns |
|---|---|---|
| Profiles | Manage hiding profiles | create / rename / delete a profile, edit its membership (Phase 27) |
| Settings | Menu-wide configuration | `menu_width` (Phase 28); later the declutter switch and config presets |

**Per-item features stay exactly where they are** — the shared panel and its
icon/visibility popovers, acting on the selected row.

**No wp-admin settings page. Not now, not later.**

## Why this is consistent rather than a new invention

Two things already exist that make this the path of least surprise:

1. **The toolbar's right zone is already the home of menu-wide actions.**
   `Reset All` lives there (`maestro.js` ~L646-660) and is global — it is the one
   existing control that does not act on the selected item. Two more global
   controls beside it is the established meaning of that zone, not a new one.
2. **The modal idiom already exists.** The icon picker, the visibility popover
   and the coachmark are all `role="dialog"` + `aria-modal="true"` with focus
   traps (`maestro.js` :758, :1009, :1942). These modals reuse that machinery
   rather than introducing a second dialog pattern.

And the thing it protects: a settings page would add an entry to the admin menu.
For a plugin whose purpose is decluttering the admin menu, that is
self-parodying — and it would break the core value's "operates on the menu
itself", which is about not having to go elsewhere to configure the menu.

## Why a shared surface was worth deciding once

Four queued features are menu-wide, not per-item, and none had a home:

- `cloned-role-hiding-profiles` (Phase 27)
- `configurable-admin-menu-width` (Phase 28)
- `config-presets-export-import` (V2-06)
- `declutter-switch-non-core-menu-items`

Answering this per-phase risked two inconsistent surfaces and then four —
precisely the drift the 2026-08-09 backlog reconciliation existed to clean up.

## Guardrail: two icons is the budget

A fifth menu-wide feature goes **inside the Settings modal**, not as a third
toolbar icon. Presets and the declutter switch are already earmarked for it.

Without this rule the toolbar accretes one icon per feature and becomes the
settings screen we just said we would not build — arrived at by increments
instead of by decision.

## Consequences for the two phases

**Phase 27** — 27-01's authoring-UX question is answered: profiles are created
and managed in the Profiles modal; assigning one to an item stays in the existing
visibility popover as a fifth group. That split matters — assignment is per-item
and belongs with the other per-item axes; management is global and does not.

**Phase 28** — 28-03's placement question is answered for the *control*, but with
a deliberate exception:

> **Width should ALSO be directly draggable**, not only a field in the Settings
> modal. Dragging the menu edge and watching it resize is more in-place than any
> field, and 28-01 makes the width a CSS custom property, so live preview is
> nearly free. The Settings field is the precise/accessible path; the drag is the
> discoverable one. Neither alone is sufficient — a drag-only control is
> inaccessible, a field-only control is a settings screen in a costume.

**Sequencing:** whichever phase runs first builds the modal shell; the second
reuses it. Phase 28 is the lighter lift and would prove the surface with a single
scalar before Phase 27 puts CRUD in one.

## Still open, deliberately

- Which dashicons. Cosmetic; pick at build time.
- Whether the Settings modal shows anything at all before Phase 28 lands (if 27
  goes first, it may ship with only the Profiles icon).
- Whether Reset All clears menu-wide settings — flagged in 28-03 and unchanged by
  this decision.
