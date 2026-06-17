# Requirements: Maestro

**Defined:** 2026-06-13
**Last updated:** 2026-06-14 — v1.0 archived; v1.1 is the active milestone
**Core Value:** Editing the admin menu happens directly on the menu, with zero ceremony and zero risk to access.

## v1.0 Requirements — ✅ shipped & archived

The 20 v1.0 "WordPress.org release readiness" requirements (SEC, A11Y, TEST,
PERF, REL — all Complete) are archived in
[milestones/v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md). v1.0.0 was
submitted on 2026-06-14, **accepted 2026-06-16, and published to the directory 2026-06-17** at https://wordpress.org/plugins/maestro-menu-editor/ (deployed via GitHub Actions → SVN).

## v1.1 Requirements

Milestone: **v1.1 "Polish & Accessibility."** Refine the shipped editor and
finish the accessibility story — no new architecture. Promoted from the v2
backlog (origin IDs noted).

### Icons

- [x] **ICON-01** (from V2-11): The bundled picker icons read at a weight that mixes with WordPress's solid dashicons — switch to Bootstrap `*-fill` variants (regenerate via `bin/generate-bootstrap-icons.mjs`); fall back to Heroicons Mini (solid, 20px) if still too light.

### Accessibility

- [x] **A11Y-06** (from V2-03): Menu items can be reordered with the keyboard (move up/down and/or ARIA grab semantics), closing the documented v1 mouse-only gap.

### Editor UX

- [x] **UX-01** (from V2-04): Each changed item shows a clear "modified" indicator, and per-item reset is a discoverable affordance (not hidden).
- [x] **UX-02** (from V2-12): The edit-mode UI is visually polished and responsive — control hierarchy, spacing, save/error status clarity, icon-picker scanability, first-run cues — native to WP admin, with no text-overlap or control-resize regressions. Reopened 2026-06-16 for BUG-01..05; **fixed and signed off 2026-06-17.** Verification gate: PHP unit 44/44, integration 29/29, e2e 16/16, JS logic 35/35, phpcs clean (BUG-03 no-overlap + idle-icon guards proven RED→GREEN). Deliverable screenshots regenerated (`toolbar-700`, `toolbar-1200`, `icons-side-by-side`).

### Docs & Assets

- [x] **DOC-01** (from V2-13): In-prose references to project files are markdown links, not bare paths, across README, readme.txt, user guide, SPEC, TESTING, and planning docs. — **Done 2026-06-17** (README + readme.txt prose refs linkified; stale `maestro.php`/`maestro` text-domain refs fixed; SPEC/TESTING path tokens are code-context, not prose links).
- [x] **REL-06** (from V2-14): The wp.org/GitHub banner is rebuilt from an editable SVG master under `.wordpress-org/source/`, the decorative leader line before "ADMIN MENU" removed, with a repeatable `npm run assets:banners` pipeline (Inkscape render → Pillow downscale/crop); public assets replaced only after visual review. — **Done** (shipped during the wp.org rename: brand-first banner with the "THE INLINE ADMIN MENU EDITOR" subtitle).

**Listing polish (flagged 2026-06-17, after the 1.0.0 directory page went live — the live listing needs work before the next release):**

- [x] **DOC-02**: Rewrite the `readme.txt` copy for clarity and discoverability — short description, full description, FAQ, and tags — via the `wp-readme-optimizer` skill. The current copy is functional but flat; the live page reads dry. — **Drafted in PR #28** (awaiting review/merge; ships with next release, Stable tag unchanged).
- [x] **DOC-03**: Add the **WordPress Playground demo link** to `readme.txt` (a "Try it first" line in the intro) and the GitHub README, so visitors can trial Maestro before installing. The hosted blueprint already exists (`playground/blueprint-hosted.json`); mirror the Borges pattern (`playground.wordpress.net/?blueprint-url=…`). — **Done in PR #28** (GitHub README already had the link; readme.txt line added).
- [ ] **REL-07**: New/refreshed **banner graphic** — a stronger design iteration on the brand-first banner, regenerated through the existing REL-06 pipeline (`npm run assets:banners`); replace `.wordpress-org/banner-*.png` after visual review. **Primary design goal (2026-06-17):** get the stacked rows of text — the MAESTRO wordmark, the "THE INLINE ADMIN MENU EDITOR" subtitle, and the tagline — **and the gold underline rule to occupy approximately the same horizontal width** (balanced/justified to a common measure), rather than the current mismatched line widths. (Image work deferred — note only.)
- [ ] **REL-08**: **Refreshed screenshots** for the new core-block directory gallery (per the 2026-06-10 meta update) — higher-quality captures with captions that "explain the interface or workflow." Keep the set visually uniform (→ clean grid) or go deliberately mixed (→ masonry); update the `== Screenshots ==` captions to match.

### Defects (triaged 2026-06-16 — wp-sudo thread screenshots)

Four edit-mode UI defects found after the v1.1 polish merge. All map to **Phase 7
/ UX-02**. **BUG-01 and BUG-03 falsify UX-02 success criterion 2** ("no text-overlap
or control-resize regressions"), so **UX-02 is reopened** and Phase 7 cannot sign off
until these close. **BUG-01, BUG-02, BUG-03, BUG-04 visually confirmed via wp-sudo-thread
screenshots 2026-06-16.**

**✅ Fixed & verified in plan 07-04** (commits `983adf9`, `42b30fa`): BUG-03's no-overlap e2e guard proven **RED→GREEN** at 700px (overlaps with the wrap reverted, passes with it); full local e2e **15/15**; phpcs clean; PHP unit **44/44**; JS logic **35/35**.

- [x] **BUG-01** — *Double checkmark on "Saved" (`✓ Saved ✓`).* Two checkmark sources: the non-color status glyph [`.maestro-status-saved::before { content: '✓' }`](../assets/maestro.css#L299) **and** the localized string [`'saved' => 'Saved ✓'`](../includes/class-assets.php#L99). Fix: drop the `✓` from the i18n string — the status glyph is the single canonical mark (and is `speak:never`, so the SR text loses nothing). *Regression from Phase 7 (07-02): the glyph was added without stripping the ✓ already baked into the string.* (That remaining glyph becomes a dashicon under **BUG-05**.) Severity: low (cosmetic). Effort: trivial.
- [x] **BUG-02** — *Rename input shifts horizontally as the name changes; "Title" label unclear.* The panel is a nowrap flex row `[current-name label] [Title + input] [Icon] [Visibility] [Reset]` ([maestro.js:412–416](../assets/maestro.js#L412)). [`.maestro-panel-label`](../assets/maestro.css#L320) (max-width 200px, ellipsis) holds the selected item's name and sits **left** of the input, so the input's x-position tracks name length. *Screenshot evidence:* the selected item shows as `**Media**  Title  [Media]` — the name appears **twice** (bold breadcrumb label *and* inside the input) with the vague "Title" label between them. **Decision (2026-06-16):** keep the breadcrumb label — it's valued for being specific about *what* is targeted — but **move it to the right of the rename control** so the input's left edge is fixed and never shifts as the name length changes. So: order becomes `[Title/Rename input] [breadcrumb label] [Icon] [Visibility] [Reset]` (reorder the appends at [maestro.js:412–416](../assets/maestro.js#L412)); the breadcrumb keeps its max-width + ellipsis. Also (b): the [`'rename' => 'Title'`](../includes/class-assets.php#L101) label doesn't read as a rename control — relabel ("Rename"/"Menu label") or replace with a placeholder inside the input. Severity: medium (usability). Effort: small + a layout call.
- [x] **BUG-03** — *Action buttons overlap as the viewport shrinks.* [`.maestro-toolbar`](../assets/maestro.css#L251) is `display:flex` with **no `flex-wrap`**; the [`<782px` media query](../assets/maestro.css#L402) only narrows the label/input widths and sets `left:0` — it never wraps. Below a threshold the non-shrinkable zones (status + right-actions are `flex-shrink:0`) and the panel buttons collide, so Visibility / Reset the item / Reset all / Exit overlay each other. Fix: let the toolbar wrap and/or a stacked small-screen layout and/or collapse panel actions into an overflow menu (mind the fixed-bottom positioning + 44px touch targets). Severity: medium (broken at small viewport). Effort: medium.
- [x] **BUG-04** — *Open circle by "Editor active" reads as a dead control.* It is **not** a control: it's the idle-state non-color status glyph [`.maestro-status::before { content: '○' }`](../assets/maestro.css#L280) (`speak:never`), the shape cue paired with ⏳/✓/⚠. Working as designed, but its radio/toggle look is a misleading affordance. *Confirmed in screenshot: the `○` renders as a ring before "Editor active".* Fix (**do not wire it**): restyle so it doesn't read as interactive (smaller/dimmer dot, not a ring) — folds into the BUG-05 status-icon rework. *Turning "Editor active" into a real on/off toggle is a feature, not this fix — out of scope.* Severity: low. Effort: small.
- [x] **BUG-05** — *Status indicators use emoji glyphs; replace with dashicons.* The four status states render Unicode dingbats via CSS `content:` — `○` idle, `⏳` saving, `✓` saved, `⚠` error ([maestro.css:281–303](../assets/maestro.css#L281)). `⏳` and `⚠` default to **color-emoji** presentation on many platforms (the reported "off"-looking hourglass) and disappear entirely where emoji are disabled. Replace all four with **dashicons** — already loaded in admin and already used by the icon picker ([maestro.js:565](../assets/maestro.js#L565)), so zero new weight and natively WP. Suggested mapping: idle → a small CSS-drawn dot or `dashicons-marker` (de-emphasised, also resolves BUG-04); saving → `dashicons-update` with a CSS spin (WP's standard loading icon, honour `prefers-reduced-motion` as today); saved → `dashicons-yes`/`dashicons-yes-alt`; error → `dashicons-warning`. The four remain four distinct shapes, so the Phase 7 WCAG 1.4.1 "distinguishable by shape, not colour alone" decision still holds; keep them `aria-hidden`/`speak:never` with the text as the SR label. (Bootstrap Icons `*-fill` — also bundled — is the fallback if a dashicon shape is missing, but prefer dashicons for native admin parity.) Severity: low–medium (visual consistency + robustness). Effort: small. → Phase 7 / UX-02.

## v2 Requirements

Post-1.0 backlog (from SPEC.md → Roadmap). Tracked, not in this roadmap.

**Promoted to v1.1 (Polish & Accessibility):** V2-03, V2-04, V2-11, V2-12, V2-13, V2-14 — now tracked as the v1.1 Requirements above; left in this list for lineage.

- **V2-01**: Reparenting — move items between top-level and submenu (with `parent_file`/`submenu_file` highlighting)
- **V2-02**: Separator management — add/move/delete with synthetic stable IDs
- **V2-03**: Keyboard-accessible reordering (move up/down, ARIA grab semantics)
- **V2-04**: Per-item reset surfaced as an explicit UI affordance with a "modified" indicator
- **V2-05**: Custom icon upload (dashicons + URL/SVG/none) with strict SVG sanitization
- **V2-06**: Import/export config as JSON (staging→prod parity, version control)
- **V2-07**: Optional enforcement bridge — opt-in, clearly-labelled defense-in-depth with a capability manager
- **V2-08**: Multisite / network-level defaults with per-site override
- **V2-09**: Configurable admin-menu width — a toggle/control to widen the 160px sidebar (long/renamed titles wrap awkwardly at the default). Store a global `menu_width` in config; apply on every admin page via the `#adminmenu/#adminmenuwrap/#adminmenuback` + `#wpcontent/#wpfooter` rules already proven in the folded-mode override. Note: this is the first asset the plugin would load *outside* edit mode; mind folded-mode and `<782px` responsive interaction. (cf. "Wider Admin Menu" plugin, but integrated into the editor.)
- **V2-10**: *Research* — feasibility of editing the top admin **toolbar** (`#wpadminbar`) too: hide/reorder/rename toolbar nodes via the same in-place model, with a better inline interface than existing tools (cf. "Hide Admin Menu"). Investigate `WP_Admin_Bar` node registration, what's safely hideable, front-end vs admin rendering, per-role handling, and whether the click-to-select editor extends to the toolbar. Deliverable is a feasibility note, not a build commitment.
- **V2-11**: Heavier/solid bundled icon set to match dashicons — the bundled Bootstrap Icons are outline-weight and read thin/light next to WordPress's solid dashicons, so the two tabs don't mix well. First try: switch the curated bundle to Bootstrap's `*-fill` variants where they exist (same MIT dependency, regenerate via `bin/generate-bootstrap-icons.mjs`). If still too light, add **Heroicons Mini** (solid, 20px — the dashicons grid; MIT) as the second set. Low-effort and contained; could be pulled into the v1.0 release polish rather than waiting for v2.
  - *Backup solid candidates if neither fits:* **Material Design Icons** (Pictogrammers / `@mdi/svg`, ~7k blocky glyphs, Apache-2.0); **Remix Icon** fill variants (Apache-2.0); **Material Symbols** Filled (Apache-2.0). All are single-fill, so they recolour cleanly as base64 data-URIs the same way the current bundle does. *Skip* the thin outline sets (Tabler, Feather, Lucide) — same mismatch as outline Bootstrap.
- **V2-12**: UI/UX design polish — review the edit-mode surface as a working admin tool, not a marketing screen. Improve control hierarchy, spacing, responsive behavior, modified-state affordances, save/error status clarity, icon-picker scanability, and first-run/onboarding cues while staying visually native to WordPress admin. Deliverables should include before/after screenshots, keyboard/mouse walkthrough notes, and regression checks that text does not overlap or resize controls awkwardly.
- **V2-13**: Documentation link hygiene — whenever docs refer to another project file in prose, link it instead of leaving a bare path. Example: "See [`SPEC.md`](../SPEC.md) for the durable design and [`docs/archive/FIXES.md`](../docs/archive/FIXES.md) for the historical fix log." Apply this consistently across GitHub README, wp.org readme, user guide, SPEC, TESTING, and planning docs where relative links make sense.
- **V2-14**: Brand asset source/regeneration — rebuild the WordPress.org/GitHub banner from an editable source, remove the decorative leader line before "ADMIN MENU" so it does not read like punctuation, and commit a repeatable generation path for `banner-772x250.png` and `banner-1544x500.png`. Follow the Borges repo pattern: keep an SVG master under `.wordpress-org/source/`, render a high-resolution reference PNG with Inkscape, downscale/crop with Pillow, expose `npm run assets:banners`, and replace submitted/public assets only after visual review.
- **V2-15**: Role cloning for per-user menu hiding — let an admin create one or more custom roles that copy an existing role's capabilities verbatim, so menu items can be hidden from specific users (e.g. one particular admin) **without changing their real privileges**. The clone carries identical caps and only a distinct role *key*, which Maestro's existing per-role visibility can already target. *Design options to evaluate (performance-led):*
  - **(a) Static snapshot** — `add_role( $key, $name, $source->capabilities )` at creation. Simplest; but the clone *drifts* when the source role's caps later change (e.g. a plugin grants the source new caps).
  - **(b) Dynamic inheritance** — register the clone with no stored caps and a `user_has_cap` / `map_meta_cap` filter that resolves the clone to its source role at request time. Always in sync, negligible per-check cost, and keeps the autoloaded `wp_user_roles` option lean (favour few, slim roles over many fat ones).
  - **Alternative that may obviate roles entirely: per-user visibility** — store hidden items keyed by user ID instead of cloning a role. More direct for "hide from one admin," but adds a new dimension to the delta model (today: global + per-role) and new storage/merge logic.
  *Constraint:* must stay inside the "visibility is cosmetic" principle (see Out of Scope) — privileges are untouched; this only widens *who* a cosmetic rule can target. *Deliverable first:* a short feasibility note (snapshot vs dynamic vs per-user), not a build commitment. Relates to V2-07 (enforcement bridge), V2-08 (multisite defaults).

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real access control / page locking | Visibility is cosmetic by design; the page's capability is the true gate |
| Front-end or non-admin-menu editing | Admin menu only |
| Rebuilt/stored full menu | Delta-only by design (reset trivially, survive plugin churn) |

## Traceability (v1.1)

| Requirement | Phase | Status |
|-------------|-------|--------|
| A11Y-06 | Phase 6: Accessibility & Interaction | Complete |
| UX-01 | Phase 6: Accessibility & Interaction | Complete |
| ICON-01 | Phase 7: Visual Polish & Icons | Complete |
| UX-02 | Phase 7: Visual Polish & Icons | Complete |
| BUG-01 | Phase 7: Visual Polish & Icons | Complete |
| BUG-02 | Phase 7: Visual Polish & Icons | Complete |
| BUG-03 | Phase 7: Visual Polish & Icons | Complete |
| BUG-04 | Phase 7: Visual Polish & Icons | Complete |
| BUG-05 | Phase 7: Visual Polish & Icons | Complete |
| DOC-01 | Phase 8: Docs & Brand Assets | Complete |
| REL-06 | Phase 8: Docs & Brand Assets | Complete (shipped during wp.org rename) |

**Coverage:**
- v1.1 requirements: 6 + 5 defects (BUG-01..05) — all mapped to phases 6–8 (REL-06 Complete; UX-02 reopened; 10 Pending)
- Unmapped: 0 ✓
- v1.0 (20 reqs) archived → [milestones/v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)

---
*Requirements defined: 2026-06-13*
*Last updated: 2026-06-14 — v1.0 archived at milestone completion; v1.1 traceability retained*
