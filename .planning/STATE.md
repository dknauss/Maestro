---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: "Roadmap locked. Phase 17 covers FIX-01/02/03 (single `normalize()` pure function + collision-guard test + zero-regression gate); Phase 18 covers REL-09 (build, Plugin Check, tag v1.3.0, SVN deploy). Out of scope: COMPAT-04 (level-qualified match), COMPAT-07 (badge preservation), COMPAT-10 (subtree-hide), and documented-limitation items COMPAT-05/06/08/09/11/12/13."
stopped_at: Completed 17-02-PLAN.md — Replay normalized-key resolution (Wave 2)
last_updated: "2026-06-29T22:10:13.464Z"
last_activity: 2026-06-29 — Roadmap created
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 3
  completed_plans: 2
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-29)

**Core value:** Editing the admin menu happens directly on the menu, with zero ceremony and zero risk to access.
**Current focus:** Milestone v1.3.0 — Slug-Resolution Hardening. Roadmap complete; ready to plan Phase 17 (Slug Normalization).

## Current Position

Milestone: v1.3.0 — Slug-Resolution Hardening — **ROADMAPPED 2026-06-29**
Phase: 17 — Slug Normalization (not started)
Plan: —
Status: Roadmap locked. Phase 17 covers FIX-01/02/03 (single `normalize()` pure function + collision-guard test + zero-regression gate); Phase 18 covers REL-09 (build, Plugin Check, tag v1.3.0, SVN deploy). Out of scope: COMPAT-04 (level-qualified match), COMPAT-07 (badge preservation), COMPAT-10 (subtree-hide), and documented-limitation items COMPAT-05/06/08/09/11/12/13.
Last activity: 2026-06-29 — Roadmap created

Progress: [░░░░░░░░░░] 0% (v1.3.0: 0/2 phases complete)

## Release Binding

**Versioned minor release.** Target version `1.3.0`, tag `v1.3.0`, SVN deploy to
WordPress.org `trunk` following the v1.2 release pipeline. `vX.Y` numbering is
reserved for shipped plugin releases; v1.3.0 ships production menu-handling code
(the slug-resolution normalization), unlike the research-only R1.

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
| Phase 14-woocommerce-survey P01 | 50m | 2 tasks | 6 files |
| Phase 14-woocommerce-survey P02 | 40m | 2 tasks | 2 files |
| Phase 14-woocommerce-survey P03 | 12m | 2 tasks | 2 files |
| Phase 15-remaining-survey-set P01 | 12m | 2 tasks | 6 files |
| Phase 15-remaining-survey-set P02 | 55 | 2 tasks | 6 files |
| Phase 15-remaining-survey-set P03 | 90 | 2 tasks | 6 files |
| Phase 15-remaining-survey-set P04 | 45 | 2 tasks | 6 files |
| Phase 15-remaining-survey-set P05 | 90 | 2 tasks | 6 files |
| Phase 16-synthesis P01 | 8 | 2 tasks | 1 files |
| Phase 16-synthesis P02 | 39 | 2 tasks | 2 files |
| Phase 17-slug-normalization P01 | 11 | 3 tasks | 3 files |
| Phase 17-slug-normalization P02 | 25 | 3 tasks | 2 files |

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
- [Phase 14-woocommerce-survey]: SURV-01 dump method hooks admin_menu @ PHP_INT_MAX (Maestro's replay priority) and exits before WP priv-filtering; WP_ADMIN must be force-defined via --exec or WC_Admin_Menus never loads and the dump silently omits the top-level WooCommerce item
- [Phase 14-woocommerce-survey]: WooCommerce exhibits all six manipulation dimensions; key collision surface for Maestro is top-level reorder (both hook custom_menu_order/menu_order) and badge-in-title loss on rename (degraded)
- [Phase 14-woocommerce-survey]: SURV-01 Part 2: top-level Reorder is degraded not broken — item order honored+persists, but WC's menu_order filter (prio 10, after Maestro) re-clusters separator-woocommerce against the woocommerce item (cosmetic separator override)
- [Phase 14-woocommerce-survey]: SURV-01 Part 2: Hide is always degraded (cosmetic per-role unset, never strips a cap; page LOADS by URL); hide-parent does NOT cascade to children; submenu re-icon is N/A. No broken cells across 34 rows
- [Phase 14-woocommerce-survey]: SURV-01 Part 3: all 6 surfaced issues classified (5 documented-limitation + 1 slug-resolution tweak for entity-encoded Products slugs); 0 broken cells so no later-admin_menu-re-hook fix warranted in R1
- [Phase 14-woocommerce-survey]: SCHEMA.md finalized with 6 batched additive refinements + promoted Interaction Scenarios section under a Phase 14 changelog; no restructuring needed; SURV-01 reconciled. Template now in final form for Phase 15 (no longer pristine by design)
- [Phase 15-remaining-survey-set]: SURV-02: WP_ADMIN=true required for Jetpack dump too; jetpack_admin_page grants admin-only in disconnected state; Settings submenu slug is absolute URL requiring slug-resolution tweak; 0 broken cells across all rows; S2/S3 interaction scenarios safe
- [Phase Phase 15-remaining-survey-set]: SURV-03: Yoast SEO dual-slug role-conditional registration (wpseo_dashboard for admin / wpseo_page_academy for editor+shop_manager) — documented as limitation; Rank Math out-of-scope/deferred (Yoast is locked SEO choice); 0 broken cells across 13 rows
- [Phase 15-remaining-survey-set]: SURV-04: Elementor registers three top-level menus (elementor-home, Templates CPT, elementor); only elementor-home is visible — other two are CSS-hidden by admin_head; all three are valid Maestro replay-state targets
- [Phase 15-remaining-survey-set]: SURV-04: 0 broken cells across 18 matrix rows (3 tops + 15 submenus); Website Templates has absolute URL slug with ver= version param (I1, slug-resolution tweak); Categories slug entity-encoded &amp; (I2, same as SURV-01 I3)
- [Phase 15-remaining-survey-set]: SURV-05: WPForms Lite uses manage_options for all items — editor/shop_manager have no WPForms surface; submenus not even registered for those roles; 0 broken cells across 14 rows; Payments NEW\! badge + Addons color span = degraded rename (convention 3); Upgrade to Pro absolute URL slug = slug-resolution tweak
- [Phase 15-remaining-survey-set]: SURV-06: lms_manager not provisioned — three baseline roles suffice for Hide coverage (lms_manager would only replicate admin pattern for submenus already cap-gated from editor/shop_manager)
- [Phase 15-remaining-survey-set]: SURV-06: llms-separator does NOT re-cluster on reorder (LifterLMS has no menu_order filter, unlike WooCommerce separator) — documented limitation I1
- [Phase 15-remaining-survey-set]: SURV-06: lifterlms submenu Reorder degraded — submenu_order() via custom_menu_order overrides Maestro sub_order at render time (F6); documented limitation I2
- [Phase 16-synthesis]: LifterLMS rename classification: source survey (SURV-06) governs over synthesis_inputs pre-extraction — taxonomy rename = safe when &amp;-encoded slug used; slug-resolution is a documented limitation, not a degraded classification
- [Phase 16-synthesis]: COMPATIBILITY-NOTE.md cross-plugin cross-cut section names recurring patterns (badge-in-title loss, slug-resolution, render-time filter override, cosmetic hide, submenu N/A re-icon) without assigning COMPAT-xx IDs — those belong in DELV-02 (Plan 16-02)
- [Phase 16-synthesis]: COMPAT-01..03 are actionable slug-resolution tweaks (highest FIX-xx priority); COMPAT-04..13 are documented limitations; 42 survey issues collapse to 13 COMPAT-xx items with 0 orphans
- [Phase 16-synthesis]: FIX-xx in REQUIREMENTS.md now links BACKLOG.md (COMPAT-xx backlog) as its seed without renaming; COMPAT-07 (badge-loss) and COMPAT-10 (parent-hide non-cascading) carry forward candidacy notes for special-casing in a later milestone
- [v1.3.0 roadmap]: FIX-01/02/03 grouped into ONE implementation phase (Phase 17) — all three are normalization rules on the same `normalize()` pure function applied at the same two resolve seams in class-replay.php; splitting into three thin phases would create artificial boundaries around a single coherent unit of work
- [v1.3.0 roadmap]: Phase 18 is a pure release phase (REL-09 only) following the v1.2 pipeline — build, Plugin Check, full-suite regression gate, tag v1.3.0, SVN deploy
- [Phase 17-slug-normalization]: wp_parse_url() used over parse_url() for WPCS compliance; stubbed in bootstrap-unit.php; manual explode('&') tokenizer preserves duplicate params without deduplication
- [Phase 17-slug-normalization]: strrpos('/wp-admin/') boundary detection enables host-move survival without exact admin_base match; TDD gate rule: RED in working tree, test+impl GREEN commit together
- [Phase 17-slug-normalization]: Single normalized-key code path in Replay (NOT exact-first-then-fallback): always normalize BOTH stored override key and rendered slug via Slug::normalize($key, admin_url(''))
- [Phase 17-slug-normalization]: Ordering::submenu kept pure/untouched: reorder threading via normalized copies of children with orig_by_norm map to restore raw slugs (non-destructive)
- [Phase 17-slug-normalization]: Dual-axis collision fail-safe: Axis-1 (two stored keys same normalized key → apply nothing) + Axis-2 (one normalized key matches 2+ distinct rendered items → skip)

### Roadmap Evolution

- GSD milestone release binding added to STATE.md: v1.2 now carries explicit target release `1.2.0`, tag `v1.2.0`, cut condition, pipeline, and release checklist.
- Phase 11.1 inserted after Phase 11: P1 review hardening — scope `custom_menu_order`, bound config payload, save-race E2E coverage (from the 2026-06-20 code-review follow-up). Lands inside the 9 → 11 → 12 cut path, before the 1.2.0 tag.
- R1 roadmap created 2026-06-22: 4 phases (13–16), 11 requirements mapped; non-versioned research track, no release.
- v1.3.0 roadmap created 2026-06-29: 2 phases (17–18), 4 requirements mapped; FIX-01/02/03 in Phase 17, REL-09 in Phase 18.

### Pending Todos

- **REL-07/REL-08 (deferred)** — refreshed banner + gallery-optimized screenshots; image work; no blocking dependency on v1.2
- **V2-15 (backlog)** — role cloning for per-user menu hiding: feasibility note before any build

### Blockers/Concerns

- **RESOLVED (2026-06-22) — 11-08 Wave 2 gate:** Ran sandbox-disabled on this project's wp-env. Port 8889 was held by another wp-env project, so this stack was started on **dev 8898 / tests 8899** and the gate run via `WP_ENV_TESTS_PORT=8899` (the alternate-port path the 11-08 config change enables); the other project's stack was left untouched. Gate GREEN: JS 53/53, PHP integration 37/37, e2e 32 pass/0 fail, screenshots 4/4. Tear down with `npx wp-env stop` when done.
- **Hygiene follow-up (non-blocking):** Phase-07 e2e screenshot specs overwrite committed PNGs on every full e2e run (not `MAESTRO_CAPTURE`-gated like the Phase-11 capture spec). Side-effect changes were reverted during the gate; gate the Phase-07 captures the same way to stop the churn.
- **RESOLVED (2026-06-26) — Phase 13 Docker boot checkpoint:** compat wp-env booted once Docker was available; `wp plugin list` confirmed all six survey plugins + Maestro active (Rank Math absent) and `wp user list` confirmed admin/`compat_editor`/`compat_shop_manager`. Phase 13 verified 4/4. **Boot notes for Phases 14-16:** cold boot ~15 min; a transient Elementor ZIP CRC error self-heals on wp-env retry; a leftover partial `WordPress-PHPUnit/` from an interrupted run can block the shallow clone (move it aside); `testsEnvironment: false` is set but wp-env 11.8.1 still provisions the tests env (harmless deprecation warning).

## Session Continuity

Last session: 2026-06-29T22:10:13.461Z
Stopped at: Completed 17-02-PLAN.md — Replay normalized-key resolution (Wave 2)
Resume file: None
