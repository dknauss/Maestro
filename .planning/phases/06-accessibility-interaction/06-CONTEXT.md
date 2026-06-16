# Phase 6: Accessibility & Interaction - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning
**Source:** Direct user directive at `/gsd:plan-phase 6` invocation (TDD-first)

<domain>
## Phase Boundary

Close the v1 keyboard-reordering gap and make changed state legible:

- **A11Y-06** — Menu items can be reordered with the keyboard alone (move up/down
  and/or ARIA grab/drop semantics), closing the documented v1 mouse-only limitation.
- **UX-01** — Every item that differs from its default shows a clear "modified"
  indicator in edit mode, and per-item reset is a **discoverable** affordance
  (visible or keyboard-reachable without prior knowledge), not hidden.

In scope: keyboard reorder interaction + announcements, modified-state detection,
modified indicator UI, discoverable per-item reset affordance.

Out of scope: reparenting (top↔sub), separator management, full pointer drag-drop
rework, any change to the cosmetic-delta storage model or REST contract.
</domain>

<decisions>
## Implementation Decisions (LOCKED — from user)

### Methodology — TDD strict (red → green → refactor)
- All **logic** is built test-first per the global TDD mandate. Specifically:
  - **Reorder move** (given a list + item + direction, produce the new order) —
    pure function, unit-tested before implementation.
  - **Modified-state detection / diffing** (does an item differ from default? which
    fields?) — pure function, unit-tested before implementation.
  - **Per-item reset** (remove one item's delta, recompute resulting state) —
    unit-tested before implementation.
- DOM wiring, focus management, and visual styling are glue/UI — covered by
  Playwright e2e and `wp.a11y.speak()` announcements, not unit TDD.
- Heuristic applied: if `expect(fn(input)).toBe(output)` is writable first → TDD.

### Zero-regression bar (must hold at phase close)
- PHP unit **44/44**, integration **29/29**, Playwright e2e **9/9** green.
- Plugin Check **0 errors**; WPCS (`composer lint`) clean.
- New tests are **additive** — they raise these counts, never lower the passing set.

### Constraints inherited from the v1.1 milestone
- **No new architecture.** Build on the existing in-place editor, the sparse-delta
  storage, and the `Maestro\Ordering` reconciliation. Reuse the existing
  keyboard-selection model (`Enter`/`Space`), focus handling, and the
  `wp.a11y.speak()` save-announcement plumbing already shipped in v1.0.

### Claude's Discretion (planner decides, justify in the plan)

1. **Keyboard interaction model.** Modifier+arrow (e.g. Alt/Ctrl + ↑/↓ on a
   selected item) vs ARIA grab/drop (`aria-grabbed` / drop targets). Recommended
   default: **modifier+arrow with `wp.a11y.speak()` move announcements** — simplest,
   most discoverable, native to WP admin, and least likely to regress the existing
   click-to-select model. Whatever is chosen must be operable mouse-free and
   announce each move to AT.

2. **TDD seam for frontend logic (decision REQUIRED).** The editor is a single
   vanilla-JS file (`assets/maestro.js`) with **no JS unit-test runner** today; JS
   is currently only exercised by Playwright e2e. Pick and justify one:
   - **(Recommended) Add a JS unit runner** (e.g. Vitest or `node:test`), dev-only,
     **outside the plugin build/zip**. Extract the pure reorder-move and
     modified-diff functions from `maestro.js` as importable, side-effect-free
     helpers and unit-test them first. Keeps DOM glue thin under e2e.
   - **PHP-side logic.** Compute modified-state and/or reorder reconciliation in PHP
     (extend `Maestro\Ordering` + a new modified-state helper) and unit-test under
     the existing phpunit-unit suite; `maestro.js` consumes server-derived data.
   - Either is acceptable; the choice must preserve the zero-regression bar and not
     ship test tooling inside `bin/build.sh`'s runtime zip.

3. **Modified-indicator + reset visual.** Native WP-admin styling (badge/dot + text
   label), high-contrast, not color-only (WCAG). Per-item reset must be reachable by
   keyboard and discoverable without documentation.
</decisions>

<specifics>
## Specific Ideas — codebase anchors

- **Editor frontend:** `assets/maestro.js` (vanilla, single file, no build step),
  `assets/maestro.css`. This is where keyboard handlers, the modified indicator,
  and the reset affordance live.
- **Pure ordering math:** `includes/class-ordering.php` (`Maestro\Ordering::top()`,
  `::sub()`) — existing reconciliation with a resilience contract (orphans skipped,
  newcomers appended). Reuse, don't reinvent.
- **Storage / REST:** `includes/class-config.php` (sparse-delta option + sanitize),
  `includes/class-rest.php` (`maestro/v1/config` GET/POST/DELETE, capability+nonce).
  Reset = delete the relevant delta.
- **Test layers:**
  - `tests/unit/` → phpunit-unit (`composer test:unit`), e.g. `OrderingTest.php`,
    `IconValidationTest.php` — where new PHP pure-logic tests go.
  - `tests/integration/` → phpunit-integration (`composer test:integration`).
  - `tests/e2e/editor.spec.ts` → Playwright (`npm run test:e2e`) — where the
    keyboard-only reorder walkthrough and modified/reset e2e assertions go.
- **Existing a11y plumbing to extend:** `Enter`/`Space` selection, popover focus
  restoration, and `wp.a11y.speak()` save announcements (shipped v1.0, Phase 2).
- **v1 limitation doc** currently states keyboard reorder is unsupported — must be
  updated to reflect the new capability (readme.txt / SPEC.md / user-guide).
</specifics>

<deferred>
## Deferred Ideas

- Reparenting, separator management, custom-icon upload, import/export — remain v2.
- Full pointer drag-drop redesign — not required; keep the existing whole-row drag.
- Phases 7 (Visual Polish & Icons) and 8 (Docs & Brand Assets) are planned
  just-in-time after Phase 6 executes.
</deferred>

---

*Phase: 06-accessibility-interaction*
*Context gathered: 2026-06-15 via direct TDD-first user directive*
