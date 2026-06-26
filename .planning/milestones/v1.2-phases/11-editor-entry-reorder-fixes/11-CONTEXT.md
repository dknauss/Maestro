# Phase 11: Editor Entry & Reorder Fixes - Context

**Gathered:** 2026-06-21 (finalized from 2026-06-19 scaffold via `/gsd:discuss-phase 11`)
**Status:** Ready for planning
**Source:** Copilot/Codex PR-review audit (PRs #1–#34) + hands-on mobile use, 2026-06-19; UX-08 approach resolved with user 2026-06-21.

<domain>
## Phase Boundary

Three contained fixes to *shipped* editor surfaces — no new architecture, no new capability:
- **UX-08** — the admin-bar editor entry: mobile visibility + compact label ([`includes/class-admin-bar.php`](../../../includes/class-admin-bar.php)).
- **BUG-06** — keyboard reorder (Alt+Arrow) must preserve `wp-menu-separator` nodes ([`assets/maestro.js`](../../../assets/maestro.js) DOM-application step).
- **BUG-07** — the modified-state badge must render on the changed row, not after the submenu ([`assets/maestro.js`](../../../assets/maestro.js), [`assets/maestro.css`](../../../assets/maestro.css)).

Out of scope: enforcement/locking, separator *management* (V2-02), reparenting (V2-01), Woo compatibility (Phase 10), and the toolbar-pin alignment (UX-09 — reopened as its own item, see Deferred).
</domain>

<decisions>
## Implementation Decisions

### UX-08a — keep the editor toggle reachable on mobile (≤782px)
- **Approach: visible + icon-only when narrow.** WordPress core hides top-level admin-bar nodes at ≤782px, so the top-level `maestro-toggle` node currently disappears on phones → no editor entry point at all.
- Add a **scoped CSS override** that keeps `#wp-admin-bar-maestro-toggle` visible at ≤782px (target the specific node, not a broad rule, to minimize fighting core's responsive layout).
- At narrow widths render the node **icon-only** (dashicon only) to avoid eating the cramped mobile toolbar width.
- a11y: the node MUST keep an accessible name even when icon-only — full label text stays in `meta.title` / `aria-label`. Icon-only must still expose text to AT.
- **Verification needs a mobile screenshot check at execute time** (browser handoff — not runnable in the planning session); confirm the node is visible and tappable at ≤782px and ≤600px.

### UX-08b — compact toggle label (wider widths)
- Visible label: **"Edit Menu" (enter) / "Exit" (exit)**, keeping the leading dashicon (`dashicons-edit` / `dashicons-exit`).
- Full phrasing **"Edit Admin Menu" / "Exit Editor"** retained as `meta.title` / `aria-label` for screen readers and tooltip.
- Rationale: peer admin-bar items use short labels (core uses "Edit Page" etc.); current 3-word label eats noticeably more toolbar width (user observation 2026-06-19).

### BUG-06 — separators preserved on keyboard reorder
- The pure `reorderMove()` logic is correct ([`maestro.js:278`](../../../assets/maestro.js#L278), `window.maestroLogic.reorderMove`). The bug is the **DOM-application step** ([`maestro.js:296–303`](../../../assets/maestro.js#L296)): looping `newOrder` and calling `parentUl.appendChild(node)` for every `li.menu-top.maestro-item`, which *moves* all editable items to the end — past any `wp-menu-separator` (and other non-`maestro-item`) children.
- **Fix: move only the selected node by one position** (e.g. `insertBefore` relative to its computed neighbour) instead of re-appending the whole set. Leave `wp-menu-separator` and other non-`maestro-item` nodes physically untouched.
- **Behavior: hop over separators.** Alt+Arrow = "move me one position among the editable items"; the selected item swaps with the next/previous *item*, skipping any separator in between. Separators keep their spot. (Separator *management* is V2-02, out of scope.)

### BUG-07 — modified badge on the changed row
- [`maestro.js:103–107`](../../../assets/maestro.js#L103) appends `.maestro-modified-badge` to the `<li>`; badge CSS ([`maestro.css:82`](../../../assets/maestro.css#L82)) is inline flow (not absolutely positioned), so for a top-level item *with a submenu* the badge lands after the `<ul class="wp-submenu">` and renders below/after the submenu.
- **Fix: append the badge inline beside the item name** — to the row anchor/label (`a.menu-top` / `.wp-menu-name`) instead of the `<li>`. Keep the existing inline CSS approach (no absolute positioning). Keep the `screen-reader-text` span behavior unchanged.
- Rationale for inline (not absolute): least risky, matches how it already renders correctly for no-submenu items, and avoids overlapping core's own count bubbles (e.g. plugin/update counts).

### Claude's Discretion
- Whether BUG-06's single-node move warrants a new pure helper + node:test, or is pure DOM glue verified by e2e — decide at plan time per the project TDD rule (heuristic: extractable `expect(fn(input)).toBe(output)` index logic → TDD; pure DOM glue → e2e).
- Exact breakpoint/selector mechanics for the UX-08a override and icon-only rendering (validate against core's admin-bar responsive rules at plan/execute time).
- Exact CSS for inline badge spacing.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `window.maestroLogic.reorderMove(currentSlugs, selectedSlug, dir)` ([`maestro.js:278`](../../../assets/maestro.js#L278)) — pure reorder logic, already correct and unit-tested; BUG-06 fix is downstream of it (DOM application only).
- `el()` helper and existing badge/SR-text construction ([`maestro.js:103–112`](../../../assets/maestro.js#L103)) — reuse for BUG-07; only the append target changes.
- `$bar->add_node()` for `maestro-toggle` ([`class-admin-bar.php:47–55`](../../../includes/class-admin-bar.php#L47)) — already sets `title` (dashicon + label) and `meta.title`; UX-08b changes the visible label string, UX-08a adds CSS + (optionally) a class/breakpoint hook.

### Established Patterns
- DOM reorder applies via `parentUl` + node selection `li.menu-top.maestro-item[data-maestro-slug]` ([`maestro.js:296`](../../../assets/maestro.js#L296)) — the fix stays within this selector set, just changes append → single-node insertBefore.
- Toolbar already goes `left: 0` at ≤782px (per UX-07 work) — UX-08a's mobile override should be consistent with that existing narrow-width behavior.
- i18n: labels are `esc_html__` / `esc_attr__` in `maestro-menu-editor` text domain — new/changed strings follow suit and need the LocalizationTest update in the same commit (project pattern: never red mid-plan).

### Integration Points
- UX-08: `includes/class-admin-bar.php` (node title/label) + `assets/maestro.css` (responsive override). No JS needed unless a class hook is added.
- BUG-06 / BUG-07: `assets/maestro.js` (DOM steps) + `assets/maestro.css` (BUG-07 inline badge spacing if adjusted).

### Test Environment Notes
- The current wp-env has **no `wp-menu-separator` registered**, so BUG-06 needs a fixture (tiny mu-plugin or test-only registration) to inject a separator for the e2e repro. Phase 10's WooCommerce env (Woo registers separators) is a good natural repro bed, but BUG-06 is fixed in Phase 11 regardless.
- UX-08a mobile visibility is a **screenshot/visual assertion** — needs a browser-capable session at execute time (e.g. Playwright at ≤782px / ≤600px viewports).

</code_context>

<specifics>
## Specific Ideas

- Peer admin-bar toggles use single-word labels; Maestro currently eats noticeably more toolbar width (user observation, 2026-06-19).
- "Exit" (not "Exit Editor") is acceptable in the visible label because the edit-mode context makes it unambiguous; the explicit phrasing survives in the aria-label/title.
- BUG-06 dovetails with Phase 10 (WooCommerce registers separators) — Phase 10's Woo env is a good repro bed, but BUG-06 is a fix and stays in Phase 11.

</specifics>

<deferred>
## Deferred Ideas

- **UX-09 — pin toolbar "Edit Mode" zone to the admin-menu column** — was withdrawn 2026-06-20, **reopened 2026-06-21 as its own item** (not folded into Phase 11). Schedule as a standalone small task/phase (candidate: alongside Phase 12 polish or post-1.2.0). Needs screenshot review when scheduled; must track V2-09 (configurable menu width — read `menu_width`, not a hardcoded 160px). REQUIREMENTS.md updated to reflect the reopen.
- **BUG-08 — first-run banner text/dismiss not vertically centered** — trivial cosmetic CSS (`display:flex; align-items:center`), still unscheduled. Considered for Phase 11 but left out to keep scope tight; pick up in Phase 12 polish or as a quick task.
- Separator *management* (add/move/delete) — V2-02, not this phase.
- Reparenting (move item under a different parent) — V2-01, not this phase.
- Single-site privileged editor tier — V2-17, not this phase.

</deferred>

---

*Phase: 11-editor-entry-reorder-fixes*
*Context gathered: 2026-06-21*
