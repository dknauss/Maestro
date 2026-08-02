---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: Compatibility, Roles & Showcase
status: verifying
stopped_at: Phase 21 context gathered
last_updated: "2026-08-02T15:43:40.074Z"
last_activity: 2026-08-02 — Phase 20 Plan 06 reworked for revised COMPAT-10 (independent child_hidden_roles); editor UI, e2e, and full zero-regression gate complete; Phase 20 (COMPAT-04/07/10) all 6/6 plans done, awaiting human-verify checkpoint
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 12
  completed_plans: 12
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-03)

**Core value:** Editing the admin menu happens directly on the menu, with zero ceremony and zero risk to access.
**Current focus:** **v1.3.1 shipped** (Phase 23 editor UX restyle, live on WordPress.org). Back to milestone v1.4 (Compatibility, Roles & Showcase): Phases 19 + 20 + 23 done; remaining Phase 21 (ROLE-02, now unblocked), Phase 22 (DEMO-01), Phase 24 (v1.4.0 release).

## Current Position

Milestone: v1.4 — Compatibility, Roles & Showcase (interim v1.3.1 patch shipped 2026-07-05)
Phase: Phase 19 ✅ COMPLETE, Phase 20 (Third-Party Compatibility Fixes) ✅ COMPLETE (checkpoint approved, verified 5/5, 6/6 plans, roadmap updated 2026-08-02), Phase 23 (Editor UX Polish) ✅ COMPLETE. Phase 21 (Cosmetic Per-User / Cloned-Role Hiding) context gathered.
Plan: Phase 20 finalized (wp-env torn down, gsd-verifier passed, marked complete). Phase 21 context captured — **per-user hiding only** (async user-search picker; both item + sub-items axes; super admins exempt); cloned-role **profiles deferred to v1.5** backlog. Next: /gsd:plan-phase 21.
Status: Phase 20's COMPAT-10 was reworked mid-checkpoint 2026-08-02: the boolean `cascade_hide` + "rides the parent hide" model built in 20-05/20-06 was found **inert** — WordPress core's `_wp_menu_output()` never renders a hidden parent's `<ul class="wp-submenu">` at all, so hiding the parent already removes the whole subtree cosmetically; cascading on top of that produced no observable difference. Reworked (20-CONTEXT.md REVISION NOTE) into an **independent** per-parent `child_hidden_roles` role set: `Maestro\Cascade::effective_hidden_roles( $child_hidden_roles, $parent_child_hidden_roles )` is now a plain, unconditional role-list union (no flag). `Config::sanitize()` accepts `child_hidden_roles` on a top-level item with the same contract as `hidden_roles` (role-intersect, `MAX_HIDDEN_ROLES` cap, dropped on a qualified submenu key). `Replay::replay()`'s submenu loop unions each child's own `hidden_roles` with its parent's `child_hidden_roles`, fully independent of whether the parent's own `hidden_roles` currently hides the parent row — so a parent can stay visible while its children vanish, a genuinely observable effect the old model could never produce. `get_menu_model()` exposes `childHiddenRoles` (empty array, not merely absent, for an untouched parent). The editor popover now shows TWO independent role-checkbox groups — "Hide this item from:" (existing) and "Hide its sub-items from:" (new, shown only on parents with children) — via a shared `buildRoleGroup()` helper in `assets/maestro.js`. The e2e spec (`cascade-hide.spec.ts`) now asserts the effect DIRECTLY against the rendered sidebar (parent visible, child rows gone, role-mirrored) via a second authenticated browser context, replacing the inert model's wp-cli/`$submenu` dump workaround (`dump-cascade-submenu.php`, deleted). Cosmetic-only guardrail reconfirmed end-to-end. **Full zero-regression gate (final):** PHP unit 127/127 (158 assertions), PHP integration 72/72 (172 assertions), JS 58/58, e2e 35 passed/28 capture-gated skipped/0 failed, WPCS clean, PHPStan 0 errors, Plugin Check 0 errors on the built shippable ZIP (1 pre-existing readme.txt warning) and 0 NEW errors on the dev-tree (7 errors/7 warnings, all pre-existing, confirmed via `git log --diff-filter=A` to predate Phase 20). All three Phase 20 requirements (COMPAT-04/07/10) genuinely complete. 20-04 (prior) delivered COMPAT-07 badge/HTML preservation on rename via `Maestro\Title::replace_label()`'s text-node swap at both title-write seams. 20-03 (prior) closed out COMPAT-04 client-side with the qualified-key DOM-join and live WooCommerce verification. 20-02/20-01 (prior) built COMPAT-04's server-side qualified-key foundation and replay/editor-model wiring. Phase 19 ROLE-01 signed off — **partial-go** (per-user go + ship first; cloned-role go as an additive `profiles` registry compiling to the same inline `is_hidden_for_current_user()` seam); Phase 21 unblocked. Phase 23 delivered UX-09/UX-12/UX-13/BUG-08 (native wp-admin restyle; 5/5 plans; full-suite gate green) and shipped in v1.3.1. **NOTE for Phase 24:** Plugin Check flags 7 errors/7 warnings against pre-existing dev-tree root files — logged to `phases/23-editor-ux-polish/deferred-items.md` for the Phase 24 build-then-check pipeline.
Last activity: 2026-08-02 — Phase 20 Plan 06 reworked for revised COMPAT-10 (independent child_hidden_roles); editor UI, e2e, and full zero-regression gate complete; Phase 20 (COMPAT-04/07/10) all 6/6 plans done, awaiting human-verify checkpoint

Progress: [█████░░░░░] 50% (v1.4: 3/6 phases complete — 19, 20, 23; Phase 23's UX shipped as v1.3.1). Remaining: Phase 21 (per-user hiding), Phase 22 (demo), Phase 24 (release), Phase 25 (toolbar polish, added 2026-08-02).

## Release Binding

**Interim patch — v1.3.1 ✅ SHIPPED 2026-07-05 (PR #88).** Phase 23's editor UX
restyle shipped early as a `1.3.1` patch (the only user-facing code on `main`
since `v1.3.0`; Phase 19 is docs-only). Tag `v1.3.1` on `e77729d` → GitHub
Release published → WordPress.org SVN deploy succeeded (trunk + `tags/1.3.1` +
assets); wp.org API confirms `1.3.1` live. Did **not** consume the v1.4.0 version.

**Release-pipeline lesson (v1.3.1):** the tag → GitHub Release step is automatic
(`release.yml` on `push: tags: v*`), but the **SVN deploy is NOT auto-triggered**
— a Release created via `GITHUB_TOKEN` does not cascade to the `release:
published` event, so `wp-deploy.yml` must be run manually via `workflow_dispatch`
(`gh workflow run wp-deploy.yml -f tag=vX.Y.Z`). This matched v1.3.0 (also a
manual dispatch). Plan the manual deploy step into every release.

**Milestone release — v1.4.0.** Target version `1.4.0`, tag `v1.4.0`, SVN deploy to
WordPress.org `trunk` following the v1.2/v1.3 release pipeline. `vX.Y` numbering
is reserved for shipped plugin releases. ROLE-02 (Phase 21) ships only if
Phase 19's feasibility verdict clears the cosmetic-only bar; otherwise it defers
and REL-10 ships without it.

### Release Checklist (v1.4.0)

The milestone is the system of record for its release (see the
`release_checklist` frontmatter). Carrying forward the standing lesson below —
diff `vLAST..main` for user-facing commits before tagging.

| # | Item | Status |
|---|------|--------|
| 1 | Zero-regression gate green (CI on the release PR) | Pending |
| 2 | Version strings bumped via `prep-release.sh` | Pending |
| 3 | **Changelog covers ALL user-facing changes since last tag** (diff `v1.3.1..main`) | Pending |
| 4 | Upgrade Notice entry for 1.4.0 | Pending |
| 5 | **Directory + editor screenshots reflect shipping UI** (recapture for UX-11 coachmark + Phase 23 UX changes) | Pending |
| 6 | Tag points at a `main` commit with all code + final readme | Pending |
| 7 | Tag + GitHub Release published; SVN trunk/tag/assets confirmed | Pending |

**Standing lesson for future milestones:** before any release tag, diff
`vLAST..main` for user-facing commits and confirm (a) every user-facing change
is in the changelog and (b) the directory assets still match the shipping UI —
don't rely on a per-milestone assets phase to surface these.

## Performance Metrics

Automated velocity capture was never reliable for this project; the prior table
held placeholder/garbage values (removed 2026-07-02). Per-plan task/file counts
live in each phase's SUMMARY.md if needed.

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
- [Phase 17-03]: Bug found in gate: class-slug.php missing from require_once list in maestro-menu-editor.php — fixed as Rule 1 (all 16 integration normalization tests failed with 'Class Maestro\Slug not found'); committed as fix(17-03)
- [Phase 17-03]: Plugin Check run with --exclude-directories excluding tests,bin,docs,build,vendor,node_modules,playground,.planning,.claude,.github,test-results — shippable-source gate invocation for this project's dev-tree mapping pattern
- [Phase 17-03]: wp-env started on alternate ports 8890/8899 (dev/tests) — 8888 and 8889 both held by other projects; established port-contention pattern (STATE.md note)
- [Phase 23-editor-ux-polish]: 23-01: modeStatusLabel copy already matched CONTEXT's locked Gutenberg-muted wording — no i18n reword needed; Task 1 verification-only, no commit
- [Phase 23-editor-ux-polish]: 23-01: kept dashicons-update spin (font-based, zero added payload) over core .spinner (background-image asset) for the saving-state glyph
- [Phase 23-editor-ux-polish]: 23-01: kept the existing bullet-dot modified-row badge, only recoloured amber to neutral #c3c4c7 — already matched the Gutenberg unsaved-changes idiom, no new glyph needed
- [Phase 23-editor-ux-polish]: 23-02 Task 2: admin-bar toggle relabelled 'Exit Menu Editor' is the single entry/exit; save-flush-on-exit re-homed onto its click intercept (bindAdminBarExit); Reset All underline bug fixed to match core .button-link-delete exactly (no underline at rest or hover)
- [Phase 23-editor-ux-polish]: 23-03: popover/tab/cell tokens were already at core values from prior plans; the only gap was missing focus-visible rings on icon-search, icon-none, icon-tab, vis-row checkboxes, and the rename input — added the consistent core-blue ring (#2271b1) to all; panel divider/label/field text stay hardcoded (no WP admin-colour-scheme CSS variable exists for a custom-drawn toolbar/panel surface to inherit)
- [Phase 23-editor-ux-polish]: 23-04: wp-pointer adaptation REPLICATE-LOCALLY confirmed (locked default held, not escalated to enqueue) — coachmark reads as a native core wp-pointer via a locally-styled card/footer-button-band/directional-arrow, .maestro-tour* DOM/classes and class-assets.php untouched; BUG-08 fixed via centered footer band + balanced content; in-menu selection/modified-dot reconfirmed token-aligned (dot not reverted); checkpoint verified on Default admin colour scheme only, Modern/Midnight deferred to 23-05
- [Phase 23-editor-ux-polish]: 23-05 (phase close): e2e reconciliation deliberately isolated to one final-wave plan — every drifted selector/colour assertion updated with reasoning visible in the commit, none silently deleted; tour.spec.ts needed zero changes (already matched 23-04's classes); Plugin Check's 4 dev-tree findings verified (git diff main...HEAD) as pre-existing and untouched by any Phase 23 commit, deferred to Phase 24's build-then-check pipeline against the release ZIP rather than fixed out-of-scope here; Phase 23 complete (5/5 plans), UX-09/UX-12/UX-13/BUG-08 all delivered
- [Phase 20-third-party-compatibility-fixes]: 20-01: Slug gained qualified-key (parent>child) parse/normalize helper; Config::sanitize() accepts qualified items keys, cleans each half independently, drops icon on submenu keys
- [Phase 20-third-party-compatibility-fixes]: 20-02: Replay::replay()'s submenu loop resolves qualified parent>child keys FIRST, with a legacy bare-key fallback that keeps every pre-existing config's both-scope behavior unchanged until re-saved; both Axis-1 (normalized_items() via Slug::normalize_qualified()) and Axis-2 (independent per-path pre-scans) collision guards extended, not replaced
- [Phase 20-third-party-compatibility-fixes]: 20-02: A qualified key's parent-half-miss needs no explicit skip branch — the qualified candidate key is only ever built from the loop's own rendered parent, so an orphaned qualified override never produces a matching lookup key and degrades silently by construction
- [Phase 20-third-party-compatibility-fixes]: 20-02: get_menu_model() submenu nodes gained a qualifiedKey field (alongside slug); resolved_hidden_roles() takes an optional $parent_slug (null = top-level bare-only, non-null = submenu qualified-first/bare-fallback) so editor display and replay() apply stay in lockstep
- [Phase 20]: 20-03: assets/maestro.js keys each submenu child by its qualified parent>child identity (model[key], not model[bare_slug]); selectedSlug/liForSlug renamed selectedKey/liForKey since both now hold a generic key that can be qualified
- [Phase 20]: 20-03: submenu <li> bound to its model key by resolved anchor href/slug (findSubmenuLi/resolveSubmenuHref), not .wp-submenu array position, with a positional fallback if no href match is found — the minimal A1b fix; full A1b hardening stays deferred
- [Phase 20]: 20-03: buildConfig() drops the topSlugs early-return and emits the shared-slug submenu override under its qualified key, matching the server's qualified-first/legacy-bare-fallback resolution from 20-02; COMPAT-04 live-verified against real WooCommerce in the compat wp-env checkpoint
- [Phase 20]: 20-04: Title::replace_label()'s candidate-node rule is depth-first/document-order, first text node whose trimmed value is non-empty AND not purely numeric — a bare digit run (badge/count inner text) is never mistaken for the label, so icon+count-only titles correctly signal no-text-node (null) instead of swapping the count
- [Phase 20]: 20-04: Title kept entirely WP-free (DOMDocument/libxml only, no wp_* calls) so it lives in the fast pure-unit suite; registered in maestro-menu-editor.php's require list and tests/bootstrap-unit.php's unit bootstrap alongside Ordering/Slug/Config
- [Phase 20]: 20-04: the wholesale-fallback decision stays in the WP-coupled caller (Replay::replay()), not inside Title::replace_label() — the pure helper only returns null on no-text-node; storage never changes shape, badge HTML is re-extracted from the live title every request and never stored
- [Phase 20]: 20-05: Cascade::effective_hidden_roles() is a single unconditional role-list union gated only by the cascade_hide bool — no separate "rides the parent hide" or "role-mirror" branches needed, since merging with an empty/absent parent hidden_roles set is naturally a no-op and only the parent's OWN hidden_roles ever enter the union; the function never calls current_user_can() or any capability API
- [Phase 20]: 20-05: cascade's parent lookup in Replay::replay()'s submenu loop reuses the exact same norm_items/norm_skip (Axis-1) and top_skip_rendered (Axis-2) guards already computed for the top-level pass — an ambiguous parent resolves to no override, so cascade never fires for it, consistent with the "when resolution is ambiguous, apply nothing" collision philosophy
- [Phase 20]: 20-05: a child with no override of its own is no longer skipped outright in the submenu loop — the parent's cascade may still hide it; is_hidden_for_current_user() now always runs against the unioned effective list, collapsing to exactly the child's own rule when cascade is off (zero regression by construction)
- [Phase 20]: 20-05: cosmetic-only guardrail proven two ways in one integration test — the editor role's entire capabilities map is byte-for-byte identical before/after a cascade rule, and the exact capability the hidden child's own page gates direct access on (edit_posts) still resolves true, i.e. the page remains directly loadable by URL despite its sidebar row being unset()
- [Phase 20]: **SUPERSEDED 2026-08-02** — the four 20-05 decisions above describe the boolean `cascade_hide` + "rides the parent hide" model, found INERT during the 20-06 checkpoint (WordPress core already hides a hidden parent's whole rendered subtree, so cascading on top of it produced no observable difference). Reworked into an independent `child_hidden_roles` model — see the 20-06 (revised) entries below.
- [Phase 20]: 20-06 (revised): `Cascade::effective_hidden_roles()` simplified from a 3-arg flag-gated computation to a 2-arg unconditional union (child's own `hidden_roles`, parent's `child_hidden_roles`) — no flag, no gating on the parent's own hide at all; the two role sets are fully independent by construction, which is what makes a parent stay visible while its children vanish (a genuinely observable effect the superseded model could never produce)
- [Phase 20]: 20-06 (revised): the visibility popover's two role groups ("Hide this item from:" / "Hide its sub-items from:") share one `buildRoleGroup()` closure in `assets/maestro.js` keyed by `getSet()`/`setSet()` accessors — a toggle in one group never touches the other's model field or the `maestro-has-hidden` class (which reflects only the item's own `hiddenRoles`)
- [Phase 20]: 20-06 (revised): e2e verification pattern changed with the model — because the revised effect is genuinely visible in the sidebar (parent stays, children vanish), `cascade-hide.spec.ts` asserts it DIRECTLY via a second authenticated browser context instead of the superseded model's wp-cli/`$submenu`-dump workaround (`dump-cascade-submenu.php`, deleted as no longer needed)
- [Phase 20]: 20-06 (revised): Plugin Check against a differently-named scratch folder (to avoid colliding with the live bind-mounted plugin path) trips `TextDomainMismatch` false positives — `wp plugin check <folder> --slug=<canonical-slug>` tells Plugin Check the correct slug independent of the scratch folder's name; established pattern for any future dev-tree-vs-shippable-ZIP Plugin Check run that can't check the real installed path directly

### Roadmap Evolution

- GSD milestone release binding added to STATE.md: v1.2 now carries explicit target release `1.2.0`, tag `v1.2.0`, cut condition, pipeline, and release checklist.
- Phase 11.1 inserted after Phase 11: P1 review hardening — scope `custom_menu_order`, bound config payload, save-race E2E coverage (from the 2026-06-20 code-review follow-up). Lands inside the 9 → 11 → 12 cut path, before the 1.2.0 tag.
- R1 roadmap created 2026-06-22: 4 phases (13–16), 11 requirements mapped; non-versioned research track, no release.
- v1.3.0 roadmap created 2026-06-29: 2 phases (17–18), 4 requirements mapped; FIX-01/02/03 in Phase 17, REL-09 in Phase 18.
- v1.4 roadmap created 2026-07-03: 6 phases (19–24), 10 requirements mapped. Phase 19 (ROLE-01 feasibility gate) precedes Phase 21 (ROLE-02, conditional). Phase 20 groups the three R1 COMPAT-xx fixes (COMPAT-04/07/10). Phase 22 (DEMO-01) depends on Phase 20 so the showcased fixes actually exist. Phase 23 groups the three small UX/BUG polish items (UX-09, UX-12, BUG-08). Phase 24 (REL-10) depends on all five feature phases.
- Phase 23 widened + pulled forward 2026-07-03 (`/gsd:discuss-phase 23`): UX-13 added (native wp-admin restyle of all edit-mode surfaces; requirements now 11); UX-12 discuss-and-refine resolved to remove the semantic-colour borders; Phase 23 executes next (depends only on Phase 18). Decisions in `phases/23-editor-ux-polish/23-CONTEXT.md`.
- Phase 19 context gathered 2026-07-04 (`/gsd:discuss-phase 19`): ROLE-01 feasibility-note decisions locked — evaluate both per-user + cloned-role (recommend simpler first, partial-go allowed); "cloned role" = Maestro-internal hiding profile (never `add_role()`); go bar = `current_user_can()` provably unchanged, anchored to the shipped per-role proof; storage recommended among bounded options under the sparse contract; resolution widens `is_hidden_for_current_user()`; enforcement is out of scope with **no wp-sudo dependency assumed** (reframed V2-17 in PROJECT.md/REQUIREMENTS.md to match). Decisions in `phases/19-cosmetic-hiding-feasibility/19-CONTEXT.md`.
- Ordering decision 2026-07-04: plan Phase 19 next (small research deliverable, unblocks the ROLE-01→Phase 21 gate), then execute the already-planned Phase 23 (5 plans). Phase 19 has no dependents on its *plan*, only on its verdict before Phase 21.
- Phase 20 complete 2026-08-02 (COMPAT-04/07/10; 6/6 plans; verified 5/5). COMPAT-10 was **redesigned mid-execution**: the boolean `cascade_hide` "rides-the-parent-hide" model (20-05) was found inert (WP core drops a hidden parent's whole subtree; cosmetic-only forbids URL blocking), so it was replaced with an **independent per-parent `child_hidden_roles`** role set (second "Hide its sub-items from:" popover group; parent stays visible; union with child's own hidden_roles; pure visibility) plus a derived locked-checkbox affordance. Decision recorded in the 20-CONTEXT.md REVISION NOTE.
- Phase 25 added 2026-08-02: Edit-Mode Toolbar Dark-Surface Polish (dark-toolbar icon/focus WCAG contrast, save-indicator layout shift, rename commit feedback) — pre-existing v1.3.1 toolbar surfaces surfaced during Phase 20 browser verification; **non-blocking for v1.4.0**. Appended after Phase 24; placement (before release vs later) is the user's call. Seed: `todos/pending/2026-08-01-editor-toolbar-icon-contrast.md`.

### Pending Todos

- **Named config presets + JSON export/import** — v1.5 candidate; supersedes/extends V2-06 (SPEC.md Roadmap item 6). Research captured in `todos/pending/2026-07-03-config-presets-export-import.md`
- **Declutter switch (non-core menu items → bottom section)** — v1.5 candidate; needs discuss/feasibility pass (top_order precedence, CPT handling). Research captured in `todos/pending/2026-07-03-declutter-switch-non-core-menu-items.md`
- ~~**Research Admin Menu Editor (Jānis Elsts) prior art**~~ — ✅ DONE 2026-08-01 (pulled forward from v1.5 to feed Phase 20). Findings note: `compat/PRIOR-ART-admin-menu-editor.md` (adopt/avoid/differentiate; AME 1.15.1 source read). Key inputs to Phase 20: COMPAT-04 → adopt AME's parent-scoped `parent>child` submenu identity; COMPAT-07 → split editable label from preserved title markup; COMPAT-10 → no prior art, Maestro-original. Cosmetic-only stays Maestro's differentiator (AME conflates hide with access). Todo moved to `todos/completed/`.
- **V2-15 (backlog)** — role cloning for per-user menu hiding: superseded by ROLE-01/ROLE-02 in the v1.4 roadmap (Phases 19/21); no longer separately deferred
- **COMPAT-04, COMPAT-07, COMPAT-10, DEMO-01** — no longer deferred; mapped to v1.4 Phases 20 and 22

<!-- REL-07/REL-08 removed 2026-07-02: completed in v1.2 Phase 12 (Release Assets Refresh), not deferred — verified in milestones/v1.2-MILESTONE-AUDIT.md. -->

### Follow-ups (non-blocking)

- (none currently)

<!-- Capture-spec output-path follow-up removed 2026-07-04: resolved in 7abe7d1 — all three capture specs (capture-screenshots, capture-directory-screenshots, editor) now write to tests/e2e/screenshots/… instead of archived phase dirs; MAESTRO_CAPTURE gating unchanged. -->
<!-- Dependabot alert #14 (js-yaml < 3.15.0, GHSA-h67p-54hq-rp68, dev-only via @wordpress/env) resolved 2026-07-04: in-range lockfile bump to 3.15.0. -->

### Blockers/Concerns

- **RESOLVED (2026-06-22) — 11-08 Wave 2 gate:** Ran sandbox-disabled on this project's wp-env. Port 8889 was held by another wp-env project, so this stack was started on **dev 8898 / tests 8899** and the gate run via `WP_ENV_TESTS_PORT=8899` (the alternate-port path the 11-08 config change enables); the other project's stack was left untouched. Gate GREEN: JS 53/53, PHP integration 37/37, e2e 32 pass/0 fail, screenshots 4/4. Tear down with `npx wp-env stop` when done.
- **RESOLVED (2026-07-02) — Phase-07 screenshot churn:** the Phase-07 captures (`editor.spec.ts`) are now `MAESTRO_CAPTURE`-gated like the Phase-11/12 capture specs, so a normal e2e run no longer overwrites committed PNGs. Remaining follow-up is only the output-path relocation (see Follow-ups above).
- **RESOLVED (2026-06-26) — Phase 13 Docker boot checkpoint:** compat wp-env booted once Docker was available; `wp plugin list` confirmed all six survey plugins + Maestro active (Rank Math absent) and `wp user list` confirmed admin/`compat_editor`/`compat_shop_manager`. Phase 13 verified 4/4. **Boot notes for Phases 14-16:** cold boot ~15 min; a transient Elementor ZIP CRC error self-heals on wp-env retry; a leftover partial `WordPress-PHPUnit/` from an interrupted run can block the shallow clone (move it aside); `testsEnvironment: false` is set but wp-env 11.8.1 still provisions the tests env (harmless deprecation warning).

## Session Continuity

Last session: 2026-08-02T15:43:40.067Z
Stopped at: Phase 21 context gathered
Resume file: .planning/phases/21-cosmetic-per-user-cloned-role-hiding/21-CONTEXT.md
