# Phase 12: Release Assets Refresh - Context

**Gathered:** 2026-06-19 (SCAFFOLD)
**Status:** ⚠️ Scaffold — plan after Phases 9 + 11 are visually final. Starting point is the deferred [`08-06-PLAN.md`](../08-docs-brand-assets/08-06-PLAN.md).
**Source:** Folded into v1.2 on 2026-06-19 (user decision) — previously deferred image work from Phase 8.

<domain>
## Phase Boundary

Refresh the two WordPress.org/GitHub listing assets that were deferred from Phase 8, so the live directory page matches what 1.2.0 ships:
- **REL-07** — refreshed banner graphic (REL-06 pipeline), with the design goal that the text rows + gold underline share a common horizontal measure.
- **REL-08** — recaptured directory screenshots against the **final v1.2 editor UI**, with explanatory captions.

Assets-only. No plugin code changes. Out of scope: any editor behavior, the release cut itself (version bump/tag/deploy happens after this phase).
</domain>

<sequencing>
## Why this phase runs last

REL-08 screenshots must show the **shipped** v1.2 UI — the new "Edit Mode" mode label + first-run pulse + rename placeholder (Phase 9), the mobile entry point + fixed reorder/badge (Phase 11), **and the icon-only unified toolbar redesign (Phase 11.2 / UX-10) — gray square buttons, semantic colour, flat indicator glyphs, palette icon-picker glyph, back-arrow Exit**. Capturing before those land would mean reshooting. So **Phase 12 depends on Phases 9, 11, AND 11.2** (all now merged to main); it's the last gate before the 1.2.0 cut.

> **Update 2026-06-22:** this context was scaffolded 2026-06-19, before Phase 11.2. The "final v1.2 editor UI" the screenshots must capture now includes the 11.2 toolbar redesign — the editor toolbar looks materially different from any pre-11.2 capture.
</sequencing>

<decisions>
## Implementation Decisions

### REL-07 banner (LOCKED design goal, from REQUIREMENTS)
- Regenerate via the existing REL-06 pipeline: `npm run assets:banners` (in-code SVG master in [`build_final.py`](../../../.wordpress-org/source/build_final.py) → Inkscape render → Pillow downscale).
- Design target: the MAESTRO wordmark, the "THE INLINE ADMIN MENU EDITOR" subtitle, the tagline, AND the gold underline rule occupy ~the same horizontal width (balanced to a common measure), not today's mismatched line widths.
- Replace `.wordpress-org/banner-772x250.png` + `banner-1544x500.png` only after visual review.

### REL-08 screenshots
- Recapture against final v1.2 editor UI; higher quality; captions that explain the interface/workflow.
- Set consistency (uniform grid vs deliberately mixed/masonry) — decide at plan time.
- Update the `== Screenshots ==` captions in `readme.txt` to match.

### Claude's Discretion
- Exact screenshot list/order and caption copy (subject to visual review).

</decisions>

<specifics>
## Specific Ideas

- Reuse the proven REL-06 regeneration path — do not hand-edit PNGs.
- These ship in the same 1.2.0 release; coordinate with the release cut (version bump + Stable tag + tag + dispatch deploy) which happens AFTER this phase.

</specifics>

<deferred>
## Deferred Ideas

None — this phase is exactly the two folded-in REL items.

</deferred>

---

*Phase: 12-release-assets-refresh*
*Context scaffolded: 2026-06-19 — plan after Phases 9 + 11*
