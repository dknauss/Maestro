# Phase 23: Editor UX Polish - Context

**Gathered:** 2026-07-03
**Status:** Ready for planning
**Source:** `/gsd:discuss-phase 23` — four gray areas selected and deep-dived with the user (plus a second round on remaining surfaces and policies)

<domain>
## Phase Boundary

**Widened by user decision (2026-07-03):** Phase 23 is no longer three small
polish items — it is the v1.4 design phase. All edit-mode surfaces adopt a
**native wp-admin look**: quieter, less colour, core idioms. Recorded as new
requirement **UX-13** alongside the original three:

- **UX-09** — pin the toolbar "Edit Mode" zone to the admin-menu column width
- **UX-12** — refine/replace the toolbar's semantic-colour borders
  (**resolved by this discussion**: the colour-border system is *removed*, not
  tuned — superseded by the UX-13 native treatment below)
- **UX-13** *(new)* — all edit-mode surfaces (toolbar, shared controls panel,
  icon/visibility popovers, first-run banner, coachmark, in-menu
  selection/badges) adopt native wp-admin idioms
- **BUG-08** — first-run banner text/button vertical centering

Still CSS (`assets/maestro.css`) + JS DOM (`assets/maestro.js`) + i18n strings
(`includes/class-assets.php`) only. No storage, REST, or behavioral-contract
changes; rename/reorder/hide/icon behavior is untouched. Coachmark is
**restyle only** — its 5 steps and copy stay as shipped in v1.3.0.

**Ordering:** Phase 23 jumps the queue — it is the next phase executed (it
depends only on Phase 18, shipped). One phase, staged plans; no 23.x split.
Public screenshot recapture stays in Phase 24 (REL-10).

</domain>

<decisions>
## Implementation Decisions (LOCKED — from user)

### Design direction (the governing principle)
- **"More WP standard, less colour."** Colour is reserved for exactly two
  meanings: **errors** and **destructive actions** (both red). Everything else
  is neutral, in the admin menu's own palette.
- Target design language: **classic wp-admin as users run it today (through
  WP 7.0)** — dashicons, core buttons/popovers/pointers, admin colour schemes.
  The researcher should note the status of core's admin-redesign effort as a
  future-proofing check only, not a target.
- **Clean replacement, no legacy skin**: the semantic-colour system
  (grey/green/amber/red borders, UX-10) is removed outright. No setting, no
  filter, no body-class escape hatch.

### State signalling
- **Save status, Gutenberg-style muted**: core `.spinner` while saving; check
  dashicon + "Saved" in muted grey; "Save failed" in red text + warning
  dashicon, inline in the toolbar. Existing `wp.a11y.speak()` announcements
  stay. Non-colour signals (icons + text + screen-reader-text) remain the
  primary carriers (WCAG 1.4.1).
- **Mode chip goes neutral**: pencil dashicon + "Edit Mode" in the toolbar's
  neutral text colour. No green anywhere. The toolbar/zone's presence is the
  mode signal; the label names it.
- **Modified state**: small non-colour dot/asterisk marker on the modified row
  (Gutenberg unsaved-changes idiom) + Reset Item simply enabled vs dimmed. No
  amber anywhere.

### WP-native styling
- **Controls become quiet menu-native icon buttons** (core Collapse-menu
  idiom): borderless, neutral glyphs, hover lightens, core blue focus ring.
  The unified outlined-box system is deleted.
- **Label mix stays as shipped** (UX-10 decision preserved): icon-only with
  `aria-label` + `title` for per-item ops (▲▼, icon, visibility, reset item);
  visible text stays on Reset All and Exit.
- **Reset All = core destructive idiom**: red text link
  (`.button-link-delete` pattern), no box. Existing confirm step stays.
- **Shared controls panel stays dark**, part of the menu-column surface, with
  the quiet-control treatment; rename input keeps core's light input styling
  (core border/focus tokens).
- **Popovers align to core popover/postbox tokens**: stay white cards;
  borders, shadow, tab treatment, and focus rings match core exactly. Mostly a
  token-alignment pass.
- **Coachmark adopts the wp-pointer look** (core's own admin-tour component;
  its stylesheet ships in wp-admin). Mimic the look — our accessible dialog
  behavior, focus trap, and step logic are unchanged.
- **In-menu selection keeps the current treatment** (tinted row + inset accent
  bar, already core blue), token-aligned; modified badge switches to the dot
  idiom above.
- **Colour-scheme inheritance where feasible**: transparent backgrounds +
  `currentColor` so the toolbar/panel/zone pick up the user's admin colour
  scheme; hardcode only where inheritance can't work (WP exposes no scheme CSS
  variables).

### UX-09 geometry — REVISED 2026-07-05 (live iteration, user decision)
- **The pinned menu-column zone is SCRAPPED.** Docking the mode+status zone at
  the bottom of the admin-menu column was built and viewed against the running
  site (plan 23-02, commits `d768801`/`537b2f8`) and rejected by the user: it
  read out-of-sync/misaligned and was "not viable down there." Lonely pencil in
  a near-empty 160×45 slot below the fold.
- **New approach — the Exit control names the mode.** The edit-mode signal
  collapses into the bottom toolbar's Exit control, relabelled
  **"Exit Menu Editor"** with a subtle neutral (menu-native, non-colour)
  **background highlight** so its presence reads as the active-mode affordance
  (wp-native pattern: Customizer/Site-Editor "Exit"). The pencil **"Edit Mode"
  chip is removed** entirely.
- **Save status stays in the toolbar** (muted spinner / "Saved" / "Save failed",
  per plan 01) — the only other indicator. Colour still reserved for
  errors/destructive only.
- **Dropped with the pin:** menu-column relocation, the 782px relocation gate
  (`modeZonePlacement`), and all Collapse-menu manipulation. Item controls,
  rename input, Reset All, and Exit already lived in the toolbar and stay there.

### Motion
- **Core-minimal**: instant state changes; the spinner is the only animation;
  a brief fade on the transient "Saved" is allowed. The existing
  `prefers-reduced-motion` block stays. No hover transitions or easing
  flourishes.

### Process (hybrid)
- Mechanical conversion (quiet controls, token swaps, popover alignment,
  BUG-08 centering) runs through normal GSD plan/execute.
- Judgment calls (final read of the status zone, pinned-zone proportions,
  wp-pointer adaptation) are settled by **live iteration against a running
  site** — like Phase 11.2, but scheduled inside a plan with the outcome
  recorded in the SUMMARY, not retroactively.

### UAT / verification
- **Spot-check Modern + Midnight** admin colour schemes beyond Default (two
  extra capture sets). *(Caveat noted for the researcher: Light-menu schemes
  ("Light") stress the dark-panel assumption hardest and are deliberately not
  in the UAT set — flag any hard failure found during research, don't design
  for it.)*
- Zero-regression bar carried forward: all PHP unit/integration, `npm run
  test:js`, and Playwright suites green at current baselines; Plugin Check 0
  errors; WPCS + PHPStan clean. e2e assertions that reference removed
  classes/colours are updated **deliberately in-plan**, never silently.
- Before/after screenshots per surface are phase deliverables (public wp.org
  captures wait for Phase 24).

### Methodology — TDD boundary (carried forward from Phases 7/9)
- Pure styling → no unit TDD; Playwright + screenshots cover it.
- Any changed pure logic (status-state mapping in `assets/maestro-logic.js`) is
  test-first via `tests/js/` (`node:test`), red before green. (The 782px
  relocation gate was dropped with the pinned-zone scrap — see UX-09 geometry.)

### Executor-model guidance (standing pattern)
- **sonnet** — token swaps and CSS conversion to a checklist, mechanical i18n
  string edits, test-writing from explicit assertions, screenshot capture,
  e2e selector updates, lint fixes.
- **opus** — the live-iteration design session, wp-pointer adaptation
  judgment, final visual calls from screenshots.

### Claude's Discretion (planner decides, justify in the plan)
- Exact dashicons for save states (check for "Saved", warning glyph for
  failure) and the modified dot's glyph/placement.
- "Saved" auto-clear timing and fade duration (within core-minimal policy).
- How the pinned zone coexists with core's Collapse-menu control (above vs
  replacing-while-editing) — resolve during live iteration.
- Whether wp-pointer styles are enqueued and reused or replicated locally
  (weigh payload budget vs drift risk).
- Order of the staged plans (suggested: toolbar+status → pinned zone →
  panel/popovers → banner/coachmark/in-menu → e2e/screenshot reconciliation).

</decisions>

<specifics>
## Specific Ideas

- User steer, verbatim: **"more wp standard, less colour"**, widening "to
  broadly a native wp admin look".
- Reference points named during discussion: the block editor's save status
  (spinner → muted "Saved"), core's **Collapse-menu** control as the
  quiet-control idiom, **wp-pointer** as the tour idiom,
  **`.button-link-delete`** as the destructive idiom.
- The maintainer's original 2026-06-30 doubt (backlog UX-12 note): "unsure
  about the coloured outlines" — this discussion resolves it: remove them.

</specifics>

<code_context>
## Existing Code Insights

### Surfaces to convert (all in `assets/maestro.css`, 614 lines)
- Unified outlined-control system: `maestro.css:108–183` (border:
  `currentColor`, semantic colours at `:112–115`, red Reset All `:166`, amber
  modified `:179–183`).
- Toolbar geometry: `maestro.css:326–346` — `position:fixed; bottom:0;
  left:160px` full-width bar; the mode/status zone to be split out lives at
  `:369–402` (`.maestro-status`, `.maestro-mode-label`, green `#6bc187` at
  `:389`).
- Transient state colours: `:447–449` (`#f0b849`/`#6bc187`/`#ff5c5c`).
- Popover/panel tokens already near core values: `:225–311` (white cards,
  `#c3c4c7`/`#8c9f94` borders, `#2271b1` focus) — alignment pass, not rebuild.
- Hardcoded default-scheme surfaces to make inheritable: `#1d2327`, `#2c3338`,
  `#50575e`, `#c3c4c7` throughout.

### DOM/JS integration points
- Toolbar DOM built in `buildToolbar()` (`assets/maestro.js`); mode label is a
  real `aria-hidden` dashicon child (BUG-04 lesson — keep it that way).
- Pure-logic seam: `assets/maestro-logic.js` dual-export pattern +
  `tests/js/*.mjs` (`mode-status.test.mjs` covers state mapping — extend
  there).
- i18n strings: `includes/class-assets.php` `i18n` array; localized payload
  budget asserted by integration tests — new strings must stay within it.
- Coachmark: hand-rolled accessible dialog shipped v1.3.0 (UX-11), replayable
  via toolbar "?" — restyle target, behavior frozen.

### Established constraints
- `el()` helper uses `textContent` (XSS-safe) — keep.
- Dashicons are a declared style dependency — the new state glyphs are free.
- Core's `.wp-core-ui .button .dashicons` specificity fight (`:361–363`)
  disappears if `.button` boxes are dropped for quiet controls — one less
  hack.
- Screenshot capture specs are `MAESTRO_CAPTURE`-gated; normal e2e won't
  churn committed PNGs (but selector/class assertions will need in-plan
  updates).

</code_context>

<deferred>
## Deferred Ideas

- **Coachmark copy/step revision** — explicitly kept out (restyle only);
  revisit if UAT shows the copy fights the new look.
- **Light-menu colour-scheme support** as a verified target — noted as a
  research caveat, not a phase 23 criterion.
- (Unrelated to this discussion: the v1.5 candidates — config presets +
  export/import, declutter switch — are already captured in
  `.planning/todos/pending/`.)

</deferred>

---

*Phase: 23-editor-ux-polish*
*Context gathered: 2026-07-03*
