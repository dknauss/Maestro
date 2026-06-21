---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Editor UX Polish
status: executing
stopped_at: Completed 11-05-PLAN.md
last_updated: "2026-06-21T22:30:00.000Z"
last_activity: "2026-06-21 — Phase 11 gap-closure 11-05: Wave 0 red guards committed — enter-state UX-08a + de-cheated control-driven reorder (both RED by design, await 11-06/11-07 for GREEN)"
progress:
  total_phases: 8
  completed_phases: 4
  total_plans: 28
  completed_plans: 24
  percent: 86
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-14)

**Core value:** Editing the admin menu happens directly on the menu, with zero ceremony and zero risk to access.
**Current focus:** v1.2 "Editor UX polish" — Phases 9, 11, 11.1 done; Phase 12 next, then cut 1.2.0

## Current Position

Milestone: v1.2 Editor UX Polish — in progress
Phase: Phase 11 (Editor Entry & Reorder Fixes) — gap-closure in progress on branch gsd/phase-11-gap-closure
Plan: 11-05 complete (gap-closure wave 0 guards); 11-06/11-07/11-08 remain
Status: 11-05 done — enter-state UX-08a + de-cheated reorder guards RED and committed; next: 11-06 (enqueue fix), 11-07 (panel + move buttons), 11-08 (Wave 2 gate)
Last activity: 2026-06-21 — Phase 11 gap-closure 11-05: Wave 0 red guards committed — enter-state UX-08a + de-cheated control-driven reorder (both RED by design, await 11-06/11-07 for GREEN)

Progress: [#########-] 90%

## Performance Metrics

**Velocity:**
- Total plans completed: 15 (v1.0: 10, v1.1: 11 executable, some overlap in count)
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Security Review | 2 | TBD | — |
| Accessibility Audit | 1 | TBD | — |
| Verification | 2 | TBD | — |
| Release Assets | 4 | TBD | — |
| Submit | 1 | TBD | — |
| Phase 06-accessibility-interaction | 3 | TBD | — |
| Phase 07-visual-polish-icons | 4 | TBD | — |
| Phase 08-docs-brand-assets | 4 | TBD | — |
| Phase 09-editor-ux-polish | TBD | TBD | — |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 09-editor-ux-polish P01 | 525594m | 2 tasks | 4 files |
| Phase 09-editor-ux-polish P02 | 21m | 3 tasks | 5 files |
| Phase 09-editor-ux-polish P03 | 15 | 2 tasks | 3 files |
| Phase 09-editor-ux-polish P04 | 18 | 3 tasks | 5 files |
| Phase 09-editor-ux-polish P05 | ~60m | 3 tasks (2 auto + 1 checkpoint) + regression fixes | 2 files |
| Phase 09-editor-ux-polish P06 | ~15m | 2 tasks (gate + traceability) | 3 files |
| Phase 11.1-p1-review-hardening P01 | 3m | 1 tasks | 2 files |
| Phase 11.1-p1-review-hardening P02 | 9 | 2 tasks | 3 files |
| Phase 11.1-p1-review-hardening P03 | 15m | 2 tasks | 1 file |
| Phase 11.1-p1-review-hardening P04 | 8m | 2 tasks | 2 files |
| Phase 11-editor-entry-reorder-fixes P01 | 9 | 2 tasks | 2 files |
| Phase 11-editor-entry-reorder-fixes P02 | 721 | 2 tasks | 2 files |
| Phase 11-editor-entry-reorder-fixes P03 | 8 | 2 tasks | 1 files |
| Phase 11-editor-entry-reorder-fixes P05 (gap-closure) | 10m | 2 tasks | 1 file |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Phase 07]: Non-color status via ::before glyphs replaced with dashicons; idle dot de-emphasised (BUG-04/BUG-05)
- [Phase 07]: First-run cue as fixed bar above toolbar, localStorage-gated — same gate pattern applies to UX-03
- [Phase 07]: BUG-03 toolbar wrap/stack at narrow widths landed — UX-07 continues from this base for denser mobile sizing
- [Phase 09]: Single phase for all three v1.2 requirements — UX-03/UX-04/UX-07 are independent CSS/JS changes to one surface (assets/maestro.js, assets/maestro.css, includes/class-assets.php); no split needed at coarse granularity
- [Phase 09]: Behavioral JS (first-run cue gate, indicator state transitions) is test-eligible via node:test; CSS-only sizing is TDD-exempt per project CLAUDE.md
- [Phase 09-editor-ux-polish]: modeStatusLabel returns '' for idle; 'Edit Mode' label is DOM-built in Plan 02
- [Phase 09-editor-ux-polish]: firstRunSeen returns true on storage.getItem throws to safely suppress cue
- [Phase 09-editor-ux-polish]: modeLabel key + LocalizationTest update shipped in one commit (never red mid-plan)
- [Phase 09-editor-ux-polish]: idle dashicon is real DOM span (aria-hidden), not ::before, avoiding BUG-04 regression
- [Phase 09-editor-ux-polish]: setStatus uses textContent='' at idle (not hidden attr); live region always present, only content varies
- [Phase 09-editor-ux-polish]: Dual-path pulse cleanup: animationend (motion) + dismiss() (reduced-motion/early-dismiss) — animationend never fires under prefers-reduced-motion:reduce
- [Phase 09-editor-ux-polish]: firstRunSeen gate seam now consumed by buildFirstRunCue() — inline try/catch replaced by window.maestroLogic.firstRunSeen()
- [Phase 09-editor-ux-polish]: renamePlaceholder key + LocalizationTest in same commit — integration never red between commits
- [Phase 09-editor-ux-polish]: rename key retained in payload as SR label textContent; visually-hidden label provides accessible name; placeholder is NOT an accessible name
- [Phase 09-editor-ux-polish]: placeholder colour #8c8f94 (WP muted-text token, AA non-text contrast); opacity:1 overrides Firefox default 0.54
- [Phase 09-editor-ux-polish]: 700px density screenshot approved (no restructure) — flex-wrap (BUG-03) + denser padding/font is sufficient; 44px min-height floor fixed at WCAG 2.5.5 AAA
- [Phase 09-editor-ux-polish]: specificity rule for media-query overrides — use parent scoping (.maestro-toolbar .child) not !important
- [Phase 09-editor-ux-polish]: wave-boundary e2e gate pattern — when Docker/sandbox blocks per-task e2e, run full Playwright suite once at wave boundary before the regression-gate plan
- [Phase 09-editor-ux-polish P06 sign-off]: "Edit Mode" (not the literal "Menu Edit Mode") is the LOCKED idle indicator text — user's refinement; satisfies UX-03's intent (short, glanceable, non-colour-signalled); reconciliation recorded in ROADMAP Phase 9 success criteria. Same pattern as Phase 8 / REL-06.
- [Phase 09-editor-ux-polish P06 sign-off]: Full suite green at sign-off — JS logic 53/53, PHP unit 44/44, integration 29/29, e2e 24/24, phpcs clean, Plugin Check 0 errors on shippable source. 3 e2e regressions caught and fixed by the orchestrator's full-suite gate (commits 38323c4, 927b682); 2 dead-surface items removed in code review (commit 1ef7fae).
- [Phase 11.1-p1-review-hardening]: has_top_order() is public (not private): WP filter dispatch requires public visibility for array-style callbacks — private raises TypeError at call_user_func_array
- [Phase 11.1-p1-review-hardening]: custom_menu_order gate reads config at filter-call time so WP's per-load invocation gets the live stored value; menu_order/reorder_top stays unconditional (harmless when gate is off, no-ops on empty order)
- [Phase 11.1-p1-review-hardening]: HARD-02: Config::MAX_* constants pattern — all six size caps are named public class constants; tests reference Config::MAX_* never literals; data-URI over-limit dropped to '' (not substr'd — truncated base64 is corrupt)
- [Phase 11.1-p1-review-hardening]: HARD-02: WP function stubs added to bootstrap-unit.php (not test file) — allows Config::sanitize() pure-unit calls including hidden_roles cap (wp_roles stub returns 60 roles); stubs use if(\!function_exists()) guards
- [Phase 11.1-p1-review-hardening P03]: HARD-03: Race (a) exit detection via maestro_edit=1 URL presence/absence — avoids coupling test to server-computed D.exitUrl
- [Phase 11.1-p1-review-hardening P03]: HARD-03: Race (b) uses page.on('request') counter (deterministic) not negative waitForResponse timeout (non-deterministic)
- [Phase 11.1-p1-review-hardening P03]: HARD-03: Race (c) uses response-order array (responses.push inside waitForResponse callbacks) to assert POST before DELETE without sleeps
- [Phase 11.1-p1-review-hardening P03]: HARD-03: E2E run deferred to Wave 2 boundary (Plan 04 gate, Docker, sandbox-disabled) — spec authored only; not marked green until boundary run passes
- [Phase 11.1-p1-review-hardening]: Phase 11.1 signed off 2026-06-20: zero-regression bar held (PHP unit 61/61, JS 53/53, integration 33/33, e2e 28/28, phpcs clean, PHPStan 0 errors, Plugin Check 0 errors); HARD-01/02/03 Complete
- [Phase 11-editor-entry-reorder-fixes]: AdminBarTest.php placed in tests/integration/ not unit: Admin_Bar::node() needs WP runtime; unit bootstrap is WP-free by design
- [Phase 11-editor-entry-reorder-fixes]: BUG-06 Wave 0 test probes separator count and test.skip()s if none present — never passes vacuously; fixture added in 11-03
- [Phase 11-editor-entry-reorder-fixes]: UX-08a icon-only assertion uses .ab-icon visible + bounding-width proxy (selector-agnostic) to avoid coupling to label-wrapper class chosen in 11-02
- [Phase 11-editor-entry-reorder-fixes]: maestro-ab-label wrapper added in class-admin-bar.php so CSS icon-only rule has stable plugin-scoped hook; meta.title is state-conditional (Edit Admin Menu / Exit Editor); display:block override uses specificity (0,2,1) matching WP core whitelist pattern — no \!important
- [Phase 11-editor-entry-reorder-fixes]: BUG-06: single-node insertBefore keyed off dir and maestroChildren index; no new helper (pure DOM glue, not unit-testable as expect(fn).toBe(out))
- [Phase 11-editor-entry-reorder-fixes]: BUG-07: removal code stays li.querySelector() — badge is still descendant of <li> after target change; no CSS edit (maestro.css owned by 11-02)
- [Phase 11-editor-entry-reorder-fixes 11-05 gap-closure]: UX-08a enter-state guard navigates /wp-admin/index.php (no maestro_edit) at 782px/600px — RED because class-assets.php early-returns before enqueuing maestro.css in non-edit state; 11-06 turns it GREEN
- [Phase 11-editor-entry-reorder-fixes 11-05 gap-closure]: Reorder test renamed to control-driven, OS-independent; L373-374 re-focus cheat removed; Alt+ArrowDown replaced by button.maestro-move-down clicks; rename-input focus asserted after selectItem — RED because button absent; 11-07 turns it GREEN

### Roadmap Evolution

- Phase 11.1 inserted after Phase 11: P1 review hardening — scope `custom_menu_order`, bound config payload, save-race E2E coverage (from the 2026-06-20 code-review follow-up). Lands inside the 9 → 11 → 12 cut path, before the 1.2.0 tag.

### Pending Todos

- **REL-07/REL-08 (deferred)** — refreshed banner + gallery-optimized screenshots; image work; no blocking dependency on v1.2
- **V2-15 (backlog)** — role cloning for per-user menu hiding: feasibility note before any build
- **Pin GSD milestones to releases (backlog/tooling)** — make the milestone the system of record for its release tag + pipeline trigger; see `.planning/todos/pending/2026-06-21-pin-gsd-milestones-to-releases.md`

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-06-21T22:30:00.000Z
Stopped at: Completed 11-05-PLAN.md
Resume file: None
