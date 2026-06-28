---
gsd_state_version: 1.0
milestone: R1
milestone_name: Third-Party Compatibility Research
status: planning
stopped_at: Phase 14 context gathered
last_updated: "2026-06-28T06:11:01.293Z"
last_activity: 2026-06-28 — Phase 14 (WooCommerce Survey) context gathered; ready to plan
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
  percent: 25
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-22)

**Core value:** Editing the admin menu happens directly on the menu, with zero ceremony and zero risk to access.
**Current focus:** R1 — Third-Party Compatibility Research; Phase 14 (WooCommerce Survey) next

## Current Position

Milestone: R1 — Third-Party Compatibility Research
Phase: 14 of 16 (WooCommerce Survey) — context gathered, ready to plan
Plan: none yet — CONTEXT.md captured (`.planning/phases/14-woocommerce-survey/14-CONTEXT.md`); next step `/gsd:plan-phase 14`
Status: Phase 13 complete and verified (4/4 must-haves; HARN-01/HARN-02 confirmed via wp-env boot 2026-06-26; PR #58 merged). Harness + schema ready for surveys. Phase 14 methodology decisions captured.
Last activity: 2026-06-28 — Phase 14 (WooCommerce Survey) context gathered; ready to plan

Progress: [██░░░░░░░░] 25% (R1: 1 of 4 phases complete) — harness + schema committed; survey work begins at Phase 14

## Release Binding

**None.** R1 is a **research-only, non-versioned** milestone — it ships no plugin
code and cuts no release. There is intentionally no target version, tag, or SVN
deploy. `vX.Y` numbering stays reserved for shipped plugin releases; the fixes R1
surfaces will be planned and shipped under a later versioned milestone.

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
| Phase 11-editor-entry-reorder-fixes P06 | 2 | 2 tasks | 3 files |
| Phase 11-editor-entry-reorder-fixes P07 | 24 | 3 tasks | 4 files |
| Phase 12-release-assets-refresh P01 | 20 | 2 tasks | 3 files |
| Phase 12-release-assets-refresh P03 | 4 | 2 tasks | 2 files |
| Phase 13-compatibility-harness-classification-schema P02 | 1m | 1 tasks | 1 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [GSD tooling]: Milestones are pinned to release artifacts in STATE.md (`release_target`, `release_tag`, release status, cut condition, pipeline, and checklist) so milestone completion cannot drift from the version tag/publish step.
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
- [Phase 11-editor-entry-reorder-fixes]: 11-06 removes maestro.css duplicate toggle override; 11-07 adds to the same file in a separate commit in dependency order — no conflict
- [Phase 11-editor-entry-reorder-fixes]: Always-loaded micro-stylesheet pattern: maestro-admin-bar.css holds only the always-needed admin-bar CSS; heavy editor bundle stays edit-mode-gated
- [Phase 11-editor-entry-reorder-fixes]: 11-07: moveSelected(dir,opts) shared function: opts.restoreFocusToAnchor for keyboard path; button path omits (not detached by insertBefore)
- [Phase 11-editor-entry-reorder-fixes]: 11-07: aria-keyshortcuts dropped entirely — Alt+Arrow retained but undiscoverable; ▲/▼ buttons are OS-independent discoverable affordance
- [Phase 11-editor-entry-reorder-fixes]: 11-07: iconButton() helper routes all five secondary panel buttons through one code path to prevent icon/label drift
- [Phase 11-editor-entry-reorder-fixes]: 11-08: WP_ENV_TESTS_PORT honored in BOTH playwright.config baseURL AND global-setup login URL — lets e2e run on an alternate tests port when 8889 is taken by another wp-env project (gate ran on 8899)
- [Phase 11-editor-entry-reorder-fixes]: 11-08: race(b) HARD-03 failure root-caused to e2e click-delivery — 11-07's extra panel buttons enlarged the position:fixed flex-wrap toolbar so the live rename preview reflowed it mid-click; product is correct (genuine Reset-All click cancels the queued autosave, DELETE wins, no persist). Hardened by committing the rename first (settle layout, keep queued autosave) and asserting reset-wins/no-persist; postCount===0 dropped (it only held for a sub-500ms click). No-persist reload assertion retained as anti-masking guard
- [Phase 12-release-assets-refresh]: Tagline auto-fit loop uses >ww (wordmark width) not >maxw (full column); full tagline string retained — ww constraint produced legible font size without fallback
- [Phase 12-release-assets-refresh]: E2E regression gate deferred to orchestrator: Docker/wp-env required; deterministic gate (banners + screenshot sizes + caption count) runs fully sandbox-OK
- [Phase 12-release-assets-refresh]: 12-03 caption copy reflects v1.2 UX changes: auto-clearing Saved state, unified icon-only toolbar, sortable group drag, accessible ▲/▼ sub-item move controls
- [Phase 13-compatibility-harness-classification-schema]: SCHEMA.md remains pristine; future surveys copy it to SURV-NN files and fill in the copies.
- [Phase 13-compatibility-harness-classification-schema]: Fix-category labels include the requirement wording and the automated-verification plain-text alias for later admin_menu re-hook.

### Roadmap Evolution

- GSD milestone release binding added to STATE.md: v1.2 now carries explicit target release `1.2.0`, tag `v1.2.0`, cut condition, pipeline, and release checklist.
- Phase 11.1 inserted after Phase 11: P1 review hardening — scope `custom_menu_order`, bound config payload, save-race E2E coverage (from the 2026-06-20 code-review follow-up). Lands inside the 9 → 11 → 12 cut path, before the 1.2.0 tag.
- R1 roadmap created 2026-06-22: 4 phases (13–16), 11 requirements mapped; non-versioned research track, no release.

### Pending Todos

- **REL-07/REL-08 (deferred)** — refreshed banner + gallery-optimized screenshots; image work; no blocking dependency on v1.2
- **V2-15 (backlog)** — role cloning for per-user menu hiding: feasibility note before any build

### Blockers/Concerns

- **RESOLVED (2026-06-22) — 11-08 Wave 2 gate:** Ran sandbox-disabled on this project's wp-env. Port 8889 was held by another wp-env project, so this stack was started on **dev 8898 / tests 8899** and the gate run via `WP_ENV_TESTS_PORT=8899` (the alternate-port path the 11-08 config change enables); the other project's stack was left untouched. Gate GREEN: JS 53/53, PHP integration 37/37, e2e 32 pass/0 fail, screenshots 4/4. Tear down with `npx wp-env stop` when done.
- **Hygiene follow-up (non-blocking):** Phase-07 e2e screenshot specs overwrite committed PNGs on every full e2e run (not `MAESTRO_CAPTURE`-gated like the Phase-11 capture spec). Side-effect changes were reverted during the gate; gate the Phase-07 captures the same way to stop the churn.
- **RESOLVED (2026-06-26) — Phase 13 Docker boot checkpoint:** compat wp-env booted once Docker was available; `wp plugin list` confirmed all six survey plugins + Maestro active (Rank Math absent) and `wp user list` confirmed admin/`compat_editor`/`compat_shop_manager`. Phase 13 verified 4/4. **Boot notes for Phases 14-16:** cold boot ~15 min; a transient Elementor ZIP CRC error self-heals on wp-env retry; a leftover partial `WordPress-PHPUnit/` from an interrupted run can block the shallow clone (move it aside); `testsEnvironment: false` is set but wp-env 11.8.1 still provisions the tests env (harmless deprecation warning).

## Session Continuity

Last session: 2026-06-28T06:11:01.289Z
Stopped at: Phase 14 context gathered
Resume file: .planning/phases/14-woocommerce-survey/14-CONTEXT.md
