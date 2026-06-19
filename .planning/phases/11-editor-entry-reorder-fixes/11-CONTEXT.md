# Phase 11: Editor Entry & Reorder Fixes - Context

**Gathered:** 2026-06-19 (SCAFFOLD — partial)
**Status:** ⚠️ Scaffold — NOT ready for planning. Run `/gsd:discuss-phase 11` first to resolve the open UX-08 decision below.
**Source:** Copilot/Codex PR-review audit (PRs #1–#34) + hands-on mobile use, 2026-06-19.

<domain>
## Phase Boundary

Three contained fixes to *shipped* editor surfaces — no new architecture, no new capability:
- **UX-08** — the admin-bar editor entry: mobile visibility + compact label ([`includes/class-admin-bar.php`](../../../includes/class-admin-bar.php)).
- **BUG-06** — keyboard reorder (Alt+Arrow) must preserve `wp-menu-separator` nodes ([`assets/maestro.js`](../../../assets/maestro.js) DOM-application step).
- **BUG-07** — the modified-state badge must render on the changed row, not after the submenu ([`assets/maestro.js`](../../../assets/maestro.js), [`assets/maestro.css`](../../../assets/maestro.css)).

Out of scope: enforcement/locking, separator *management* (V2-02), reparenting (V2-01), Woo compatibility (Phase 10).
</domain>

<decisions>
## Implementation Decisions

### BUG-06 — separators preserved on keyboard reorder (LEANING, confirm in discuss)
- The pure `reorderMove()` logic is correct; the bug is the **DOM-application step** (~[maestro.js:301–304](../../../assets/maestro.js#L301)) re-appending *every* `li.menu-top.maestro-item` via `appendChild`, which moves all items past any separators.
- **Fix direction:** move only the selected node by one position (e.g. `insertBefore` relative to its computed neighbour) instead of re-appending the whole set; leave `wp-menu-separator` (and other non-`maestro-item`) children untouched.
- **Test:** new e2e on a menu that *contains* separators (the current env has none registered — may need a tiny mu-plugin/fixture to inject a separator). Red-first node:test if a new pure helper is extracted for the single-node move index.

### BUG-07 — modified badge on the row (LEANING, confirm in discuss)
- [maestro.js:107](../../../assets/maestro.js#L107) appends `.maestro-modified-badge` to the `<li>`; badge CSS ([maestro.css:82](../../../assets/maestro.css#L82)) is inline (not absolutely positioned), so for a top-level item *with a submenu* the badge lands after the `<ul class="wp-submenu">`.
- **Fix direction:** append the badge to the row anchor/label (`a.menu-top` / `.wp-menu-name`) instead of the `<li>`. Keep the AT `screen-reader-text` span behavior unchanged.
- **Test:** e2e/screenshot on a top-level item with a submenu (e.g. Posts).

### Claude's Discretion
- Whether BUG-06's single-node move warrants a new pure helper + unit test, or is pure DOM glue verified by e2e (decide at plan time per the project TDD rule).

</decisions>

<open_decisions>
## OPEN — needs user input in `/gsd:discuss-phase 11`

### UX-08(a) — how to keep the editor toggle reachable on mobile
WordPress core hides most top-level admin-bar nodes at ≤782px, so the `maestro-toggle` node disappears on phones → **no editor entry point at all**. Pick the approach:
1. **Targeted CSS override** — keep `#wp-admin-bar-maestro-toggle` visible at ≤782px (smallest change; risk of fighting core responsive rules).
2. **Icon-only when narrow** — render just the dashicon below a breakpoint (compact; must still expose text to AT).
3. **Nest under an always-visible parent** — e.g. hang it under the site-name node so it survives the mobile collapse (more discoverable? or more buried?).

### UX-08(b) — compact label
Shorten the visible label from "Edit Admin Menu" / "Exit Editor" to peer-parity (single word-ish): candidates "Edit Menu" / "Editing", or icon-only. Keep full phrasing as `meta.title` / `aria-label`. Confirm exact copy.

</open_decisions>

<specifics>
## Specific Ideas

- Peer admin-bar toggles use single-word labels; Maestro currently eats noticeably more toolbar width (user observation, 2026-06-19).
- BUG-06 dovetails with Phase 10 (WooCommerce registers separators) — Phase 10's Woo env is a good repro bed, but BUG-06 is a fix and stays in Phase 11.

</specifics>

<deferred>
## Deferred Ideas

- Separator *management* (add/move/delete) — V2-02, not this phase.
- Single-site privileged editor tier — V2-17, not this phase.

</deferred>

---

*Phase: 11-editor-entry-reorder-fixes*
*Context scaffolded: 2026-06-19 — needs discuss-phase to finalize UX-08 approach*
