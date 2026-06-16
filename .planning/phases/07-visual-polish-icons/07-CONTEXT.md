# Phase 7: Visual Polish & Icons - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning
**Source:** Roadmap + REQUIREMENTS (ICON-01, UX-02) + user directive ("plan 7 then 8; find tasks for sonnet")

<domain>
## Phase Boundary

Make the bundled icon picker read at a weight that mixes with WordPress's solid
dashicons, and polish the edit-mode UI as a working admin tool.

- **ICON-01** (from V2-11): Switch the curated bundle to Bootstrap **`*-fill`**
  variants so glyphs sit visually alongside solid dashicons; fall back to
  **Heroicons Mini** (solid, 20px) only if fill variants still read too light.
- **UX-02** (from V2-12): Edit-mode UI is visually polished and responsive —
  control hierarchy, spacing, save/error status clarity, icon-picker scanability,
  first-run cues — native to WP admin, with no text-overlap or control-resize
  regressions.

Out of scope: new icon-upload (V2-05), any storage/REST change, reordering or
modified-indicator behavior (that's Phase 6).
</domain>

<decisions>
## Implementation Decisions (LOCKED)

### Methodology — TDD where logic exists; not for pure styling
- The **icon-bundle generation** is a data transformation → TDD-appropriate. Reuse
  the Phase 6 `node:test` seam (`tests/js/`, `npm run test:js`). Write failing
  tests first asserting: every `CURATED` name resolves to an existing fill SVG in
  `node_modules/bootstrap-icons/icons`; the generated output is well-formed
  base64 `data:image/svg+xml` entries with the baked menu-grey; the bundle count
  is preserved (no silent drops).
- **UX-02 visual/CSS polish is UI styling → skip unit TDD** per the global rule.
  It is covered by Playwright e2e regression (no text-overlap, no control-resize,
  controls reachable) plus before/after screenshots as deliverables.

### Zero-regression bar (must hold at phase close)
- PHP unit 44/44, integration 29/29, Playwright e2e green (Phase 6 will have
  raised the e2e baseline; this phase keeps it green and adds where sensible),
  Plugin Check **0 errors**, `composer lint` clean, `npm run test:js` green.

### Constraints inherited from v1.1
- **No new architecture.** Icons stay base64 data-URIs generated into
  `includes/icons-bootstrap.php`; same MIT Bootstrap Icons dependency. Polish is
  CSS (`assets/maestro.css`) + minimal `assets/maestro.js` DOM/markup tweaks.
- Keep the documented data-URI trade-off (icons don't recolour on hover/active
  the way dashicon fonts do) — `*-fill` does not change that; note it stays true.

### Claude's Discretion (planner decides, justify)
1. **Fill-variant fallback handling.** Some curated names may lack a `-fill`
   variant. Decide per-name: prefer `<name>-fill` when it exists, else keep the
   outline `<name>` (and note it), OR substitute a solid synonym. Do NOT silently
   drop an icon. 670 `*-fill.svg` files are available; most should map.
2. **Heroicons fallback.** Only pursue if Bootstrap fill still reads too light
   after visual review. It is NOT currently installed — treat adding it as
   optional, contained, and gated on the side-by-side screenshot check. Default:
   ship Bootstrap `*-fill` and defer Heroicons unless clearly needed.
3. **UX-02 polish scope.** Prioritize: control hierarchy/spacing, save/error
   status clarity, icon-picker grid scanability at ~20px, first-run cue. Keep it
   native to WP admin (use admin color tokens, existing components). Bound the
   scope — this is polish, not a redesign.

### Executor-model guidance (per user "find tasks for sonnet")
Tag each task in the plan with a recommended executor model:
- **sonnet** — regenerating the icon bundle from the clear spec, mechanical CURATED
  edits, writing tests from explicit assertions, CSS polish to a checklist, doc/
  screenshot capture, lint/format fixes, read-only verification.
- **opus** — only genuinely judgment-heavy steps (e.g. resolving an ambiguous
  fallback policy, deciding whether Heroicons is warranted from screenshots).
Default to sonnet; reserve opus for the few real judgment calls.
</decisions>

<specifics>
## Specific Ideas — codebase anchors

- **Icon generator:** `bin/generate-bootstrap-icons.mjs` — reads
  `node_modules/bootstrap-icons/icons`, curates `CURATED[]`, bakes
  `MENU_GREY = #a7aaad` into each SVG, base64-encodes, writes
  `includes/icons-bootstrap.php`. Run: `node bin/generate-bootstrap-icons.mjs`.
  Current bundle: **87 icons**, ~70KB. **670 `*-fill.svg`** variants available.
- **Editor UI:** `assets/maestro.js` (icon picker grid, tabs, edit-mode controls)
  + `assets/maestro.css` (all edit-mode styling). The icon picker renders the
  bundled set in one tab and dashicons in another — the visual mismatch is the
  thin/outline Bootstrap weight next to solid dashicons.
- **Tests:** `tests/js/` (node:test, added in Phase 6), `tests/unit` &
  `tests/integration` (phpunit), `tests/e2e/editor.spec.ts` (Playwright). The
  `LocalizationTest`/`PerformanceTest` integration checks assert the edit-mode
  payload budget — a larger/changed icon bundle must stay within that contract.
- **Build:** `bin/build.sh` ships `includes/` (so the regenerated bundle ships);
  `tests/` and `node_modules/` are excluded.
- **Deliverables (UX-02):** before/after screenshots + keyboard/mouse walkthrough
  notes, stored where the other planning/listing assets live.
</specifics>

<deferred>
## Deferred Ideas
- Custom icon upload, import/export, reparenting, separators — v2.
- Material/Remix/Material-Symbols backup icon sets — only if both Bootstrap fill
  AND Heroicons fail review (unlikely; do not pursue speculatively).
- Phase 8 (Docs & Brand Assets) planned separately.
</deferred>

---

*Phase: 07-visual-polish-icons*
*Context gathered: 2026-06-15*
