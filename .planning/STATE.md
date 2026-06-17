---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Polish & Accessibility
status: planning
stopped_at: Completed Phase 7 (plan 07-04 defect fixes BUG-01..05 + idle-icon refinement); Phase 8 next
last_updated: "2026-06-16T06:30:14.586Z"
last_activity: 2026-06-17 — Phase 7 signed off (UX-02 + BUG-01..05, full regression gate green); v1.0.0 live on wordpress.org
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 11
  completed_plans: 7
  percent: 54
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-14)

**Core value:** Editing the admin menu happens directly on the menu, with zero ceremony and zero risk to access.
**Current focus:** v1.1 "Polish & Accessibility" — milestone scoped and roadmapped (phases 6–8); Phases 6 & 7 complete; Phase 8 next

## Current Position

Milestone: v1.1 Polish & Accessibility (phases 6–8; v1.0 phases 1–5 complete & archived)
Phase: Phases 6 & 7 complete; Phase 8 (Docs & Brand Assets) next
Plan: —
Status: v1.0 milestone archived → `.planning/milestones/v1.0-*` + `.planning/MILESTONES.md` + `.planning/RETROSPECTIVE.md`. v1.1 scoped + roadmapped — 6 requirements promoted from the v2 backlog (ICON-01, A11Y-06, UX-01, UX-02, DOC-01; REL-06 already done). **v1.0.0 published to wordpress.org 2026-06-17** (GitHub Actions -> SVN). **Phase 7 (Visual Polish & Icons) signed off 2026-06-17** (UX-02 + BUG-01..05; full regression gate green). Phase 8 (Docs & Brand Assets) is next.
Last activity: 2026-06-14 — Completed & archived the v1.0 milestone; v1.1 roadmap (phases 6–8) in place

Progress: [#####-----] 54%

## Performance Metrics

**Velocity:**
- Total plans completed: 10
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

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 06-accessibility-interaction P01 | 43 | 6 tasks | 7 files |
| Phase 06-accessibility-interaction P02 | 13 | 2 tasks | 4 files |
| Phase 06-accessibility-interaction P03 | 21 | 3 tasks | 7 files |
| Phase 07-visual-polish-icons P01 | 15 | 3 tasks | 3 files |
| Phase 07-visual-polish-icons P02 | 7 | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Project init: Plugin was brownfield and green at intake; current release checks are unit 44/44, integration 29/29, E2E 9/9, phpcs clean, and Plugin Check reports no errors on the extracted build zip.
- Roadmap: TEST + PERF combined into Phase 3 (Verification) to keep coarse granularity (5 phases); REL-05 (submit) is its own capstone phase.
- Security scan: Codex Security scan `317283f_20260614T024544Z` found one low-severity editor DOM XSS hardening issue (`innerHTML` for localized labels) and fixed it by switching the shared helper to `textContent`; no open findings remain in the final report.
- REST nonce verification: Integration tests now simulate the WordPress REST cookie-auth nonce gate and verify missing/invalid nonces reject GET/POST/DELETE `/config` requests without mutating stored config.
- Accessibility audit: Static/code audit closed A11Y-01 through A11Y-05. The editor now supports keyboard item selection with `Enter`/`Space`, focus restoration for popovers, save success/failure announcements through `wp.a11y.speak()`, and public documentation of the v1 keyboard-reordering limitation.
- Verification: Phase 3 is closed. Unit tests remain 44/44. Integration tests now run 29 tests / 81 assertions, adding reset-all idempotence/partial-config coverage plus performance contracts for non-autoloaded storage, edit-mode-only assets, localized payload budget, localized editor label coverage, and the bundled language path header. Playwright E2E now runs 9/9, including reset-this-item and per-role visibility.
- Testing tools: Node.js v24.16.0, npm/npx 11.13.0, Colima v0.10.3, Lima v2.1.2, Docker CLI 29.5.3, Docker Compose v5.1.4, and Playwright Chromium were installed under user-local locations. Colima is running with the `colima` Docker context.
- Release assets: `.wordpress-org/` contains `icon.svg`, `icon-128x128.png`, `icon-256x256.png`, `banner-772x250.png`, `banner-1544x500.png`, and `screenshot-1.png` through `screenshot-4.png`. PNG dimensions were verified with `file`. GitHub `README.md` now displays the banner, screenshots, and quick-start docs; wp.org `readme.txt` includes matching screenshot captions and usage docs; `docs/user-guide.md` contains the longer walkthrough. REL-01 through REL-04 are complete and Phase 4 is closed.
- Localization: The plugin is translation-ready with the `maestro-menu-editor` text domain and `Domain Path: /languages`. PHP strings use WordPress translation helpers, and editor UI labels are passed to JavaScript through the localized `maestroData.i18n` payload. The repo ships a POT template plus starter catalogs for `es_ES`, `de_DE`, `ja`, `fr_FR`, `pt_BR`, and `it_IT`; WordPress.org language packs can still override and extend them, and native-speaker/Polyglots review is welcome.
- Docs: Living docs are README.md, readme.txt, docs/user-guide.md, SPEC.md, TESTING.md, and `.planning/*`. `docs/archive/FIXES.md` is historical only and no longer treated as the active punchlist.
- Submit prep: `bin/build.sh` produces `build/maestro-menu-editor.zip`; WPCS (`composer lint`) passed 7/7; official Plugin Check 2.0.0 reported no errors on the extracted build zip; npm audit reports 0 vulnerabilities after removing unused `@wordpress/scripts`; local unit 44/44, integration 29/29, and E2E 9/9 pass. `pretest:e2e` activates the plugin by slug (`maestro-menu-editor/maestro-menu-editor.php`).
- [Phase 06-accessibility-interaction]: TDD seam for Phase 6 JS: node:test (built-in, zero new deps) + pure helpers in assets/maestro-logic.js; dual-export guard for node:test + browser; node --test auto-discovery used (Node 24.14 lacks directory-form CLI support)
- [Phase 06-accessibility-interaction]: buildConfig() diff delegated to window.maestroLogic.diffItem() — one source of truth for modified-state detection; payload shape unchanged
- [Phase 06-accessibility-interaction]: speak() optional politeness arg: omitted = polite (success moves); 'assertive' for boundary clamps — existing callers unchanged
- [Phase 06-accessibility-interaction]: e2e reset-all cleanup: waitForNavigation() before expect.poll() prevents 51265eval racing doResetAll's window.location.reload()
- [Phase 06-accessibility-interaction]: Non-color modified indicator: amber #dba617 bullet glyph (5.5:1 on #1d2327) + clip-path screen-reader-text — color supplementary, shape+text are the signal (WCAG 1.4.1 / 1.4.11)
- [Phase 06-accessibility-interaction]: refreshModifiedIndicator driven by maestroLogic.diffItem (unit-tested) wired to commitRename, icon choose, visibility change, resetSelected, and init sweep — single source of truth
- [Phase 07-visual-polish-icons]: resolveIcon fill policy: 58 direct fills + 7 SYNONYM_FILL + 22 retained outline; journal-text and graph-up stayed outline (bootstrap-icons v1.13.1 lacks journal-fill and graph-up-arrow-fill)
- [Phase 07-visual-polish-icons]: Generator side-effect guard: main() called only when process.argv[1] === fileURLToPath(import.meta.url) — enables side-effect-free import for unit testing
- [Phase 07-visual-polish-icons]: PerformanceTest payload lower bound (70 KiB) unchanged: fill SVG bundle still exceeds 70 KiB after switch to solid variants
- [Phase 07-visual-polish-icons]: Non-color status via ::before glyphs (○ ⏳ ✓ ⚠); icon grid cell 40px for precise 20px centering; first-run cue as fixed bar above toolbar, localStorage-gated

### Pending Todos

- **Edit-mode defects (triaged 2026-06-16, wp-sudo thread; BUG-01..04 visually confirmed via screenshots)** — BUG-01..05 in REQUIREMENTS.md → Defects, mapped to Phase 7 / plan 07-04. UX-02 reopened (BUG-01 + BUG-03 contradict its "no text-overlap / control-resize" criterion). **✅ Fixed & verified in 07-04 (commits 983adf9, 42b30fa) 2026-06-17** — BUG-03 no-overlap e2e proven RED→GREEN at 700px, full e2e 15/15, phpcs + PHP unit 44/44 + JS logic 35/35. Root causes / fixes: BUG-01 double ✓ = i18n string `'Saved ✓'` + glyph both render → drop ✓ from string; BUG-02 = breadcrumb name label sits left of rename input in a flex row → **keep the breadcrumb (user values it) but move it right of the input** so the input can't shift, + relabel "Title"; BUG-03 = `.maestro-toolbar` has no `flex-wrap` → wrap/stack at narrow widths; BUG-04 = idle status glyph `○` misreads as a control → de-emphasise (folds into BUG-05); BUG-05 = status states use emoji glyphs `○⏳✓⚠` (`⏳`/`⚠` go color-emoji / can be disabled) → replace with dashicons (already loaded; `dashicons-update` spin / `-yes` / `-warning` / dot), preserving the WCAG 1.4.1 shape distinction.
- **V2-15 (backlog)** — role cloning for per-user menu hiding: feasibility note to compare static snapshot vs dynamic `user_has_cap` inheritance vs per-user visibility before any build.
- **✅ 1.0.0 PUBLISHED 2026-06-17** at https://wordpress.org/plugins/maestro-menu-editor/ (verified live). Slug `maestro-menu-editor`. Deploy is now **GitHub-Actions driven** (mirrors Borges): `.github/workflows/{release,wp-deploy}.yml` on `main`; future releases = `git tag vX.Y.Z && git push origin vX.Y.Z`. The bootstrap 1.0.0 deploy ran via `gh workflow run wp-deploy.yml --ref main -f tag=v1.0.0` (the workflow takes a `tag` input + sets `VERSION` so it can ship a tag whose commit predates the workflows). SVN secrets `WP_ORG_SVN_USERNAME`/`WP_ORG_SVN_PASSWORD` set (the first attempt failed `E215004` — a trailing ` SVN` on the password secret; fixed). `main` is branch-protected (no force-push/delete, CI required, owner bypass). `bin/deploy-svn.sh` remains as a manual fallback.
- **Listing polish before the next release (flagged 2026-06-17)** — REQUIREMENTS.md → Docs & Assets, Phase 8 plans 08-05/08-06: DOC-02 readme copy rewrite (wp-readme-optimizer), DOC-03 Playground "Try it first" demo link (blueprint-hosted.json ready; quick 1.0.1 candidate), REL-07 better banner, REL-08 refreshed gallery screenshots + captions. New core-block gallery (2026-06-10 meta): uniform sets → grid, mixed → masonry, captions emphasised.

(Done: git tag `v1.0.0` + GitHub Release "Admin Menu Maestro 1.0.0" published, anchored at the finalize-1.0.0 commit `c5f31b8`.)

### Blockers/Concerns

- Resolved: the earlier 8 Dependabot alerts are closed (2026-06-14 dependency cleanup).
- Resolved (2026-06-15): a new moderate alert (#13, `js-yaml` GHSA-h67p-54hq-rp68, quadratic merge-key DoS) surfaced after the GHSA was published. Triaged as **dev-only** — `js-yaml@3.14.2` is pulled solely by `@wordpress/env` (local test harness) and is never shipped (`bin/build.sh` packages PHP + assets, not `node_modules`). `npm audit` reports `fixAvailable:false` (wp-env requires js-yaml 3.x; forcing 4.x removes `safeLoad` and breaks wp-env). `npm prune` cleared 1342 orphaned/extraneous packages from `node_modules` but did not change the lockfile or the alert. Alert **dismissed as `tolerable_risk`**. No runtime/user exposure.

## Session Continuity

Last session: 2026-06-16T06:30:14.582Z
Stopped at: Completed 07-visual-polish-icons/07-02-PLAN.md
Resume file: None
