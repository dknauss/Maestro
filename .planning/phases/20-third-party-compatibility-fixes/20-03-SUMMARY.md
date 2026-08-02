---
phase: 20-third-party-compatibility-fixes
plan: 03
subsystem: editor-ui
tags: [javascript, dom, editor-model, qualified-keys, playwright, e2e, slug-resolution]

# Dependency graph
requires:
  - phase: 20-third-party-compatibility-fixes (20-02)
    provides: "Replay::replay() qualified-first/legacy-bare-fallback resolution and get_menu_model() submenu qualifiedKey field"
provides:
  - "assets/maestro.js client model keys each submenu child by its qualified parent>child identity (no longer collapsing a shared-slug child into the top-level model entry)"
  - "Submenu <li> DOM binding by resolved anchor href/slug (findSubmenuLi/resolveSubmenuHref), not .wp-submenu array position — the minimal A1b fix"
  - "liForKey() (renamed from liForSlug) scoped by isSub + class so a shared-slug top-level and submenu <li> never resolve to the same node"
  - "buildConfig() emits the shared-slug submenu override under its qualified key instead of skipping it, matching the server's qualified-first/bare-fallback resolution"
  - "tests/e2e/specs/shared-slug.spec.ts + tests/e2e/fixtures/maestro-e2e-shared-slug.php: Playwright proof (gated CPT fixture) of independent shared-slug parent/child editing, live-verified against real WooCommerce by the human checkpoint"
affects: [20-04, 20-05, 20-06, 22-demo-showcase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Qualified-key client model: model[key] where key is a bare top-level slug OR a parent>child qualified key from get_menu_model(); m.slug retained on submenu entries for pristine-default lookups (D.pristine.sub stays raw-slug-keyed)"
    - "DOM-key disambiguation: top-level <li> carries data-maestro-slug only; submenu <li> carries BOTH data-maestro-slug (bare, for sub_order + legacy reads) and data-maestro-key (qualified, for model identity/selection) — liForKey() selects by isSub + class-scoped attribute so a shared slug value never resolves ambiguously"
    - "Resolved-href DOM association: findSubmenuLi()/resolveSubmenuHref() match a submenu child to its <li> by decoding the anchor's href and substring-matching the raw slug, falling back to positional binding only if no href matches (never fully removing the old behavior, only demoting it to a fallback)"
    - "Gated e2e fixture: a mu-plugin (always mapped via .wp-env.json) registers its CPT only when an option flag is set, so it never changes any other spec's menu shape"

key-files:
  created:
    - tests/e2e/specs/shared-slug.spec.ts
    - tests/e2e/fixtures/maestro-e2e-shared-slug.php
  modified:
    - assets/maestro.js
    - .wp-env.json
    - TESTING.md

key-decisions:
  - "selectedSlug renamed selectedKey and liForSlug renamed liForKey throughout — both are now generic model keys (bare or qualified), and the rename makes the ambiguity the fix closes explicit at every call site rather than leaving a misleading 'slug' name on a value that can be qualified"
  - "findSubmenuLi() falls back to positional binding when no href match is found, rather than leaving a submenu child unbound — keeps the minimal-scope fix from regressing any menu whose anchor markup doesn't decode as expected, at the cost of not being a pure hardening rewrite (full A1b hardening stays deferred per 20-CONTEXT.md)"
  - "e2e fixture CPT (not the real compat wp-env's WooCommerce) chosen for the automated Playwright spec so `npm run test:e2e` stays self-contained and fast; the human checkpoint additionally verified the fix against real WooCommerce in the compat harness for end-to-end confidence"

requirements-completed: [COMPAT-04]

# Metrics
duration: ~75min
completed: 2026-08-01
---

# Phase 20 Plan 03: Qualified-Key Client Model + Stable Submenu DOM Association Summary

**`assets/maestro.js` now keys every submenu child by its qualified `parent>child` identity and binds each submenu `<li>` to that identity by resolved anchor href/slug instead of array position, closing the client-side half of the COMPAT-04 shared-slug collision — a WooCommerce-style Products top-level and its same-slug "All Products" submenu are independently selectable, renamable, and hideable in the live editor, and the save payload carries a bare top-level key alongside a qualified submenu key that survives reload on the correct row — confirmed both by a gated Playwright fixture and by live human verification against real WooCommerce.**

## Performance

- **Duration:** ~75 min (including compat wp-env boot/teardown for the human-verify checkpoint)
- **Completed:** 2026-08-01
- **Tasks:** 3/3 completed (2 auto + 1 checkpoint, approved)
- **Files modified:** 5 (1 modified for the client fix, 4 for the e2e proof)

## Accomplishments

- `init()` no longer collapses a shared-slug submenu child into the top-level model entry (the old `if (! model[child.slug])` guard). Every submenu child gets its own `model[key]` entry keyed by `child.qualifiedKey` (from 20-02's `get_menu_model()`), retaining its raw `slug` for pristine-default lookups since `D.pristine.sub` stays raw-slug-keyed.
- Submenu `<li>` elements are now matched to their model entry by resolved anchor href/slug (`findSubmenuLi()`/`resolveSubmenuHref()`) rather than `.wp-submenu` array position — the minimal A1b fix locked in `20-CONTEXT.md`. A positional fallback is kept for the rare case no href match is found, so no menu regresses to zero binding.
- `liForSlug()` was renamed `liForKey()` and scoped by `isSub` + the `.maestro-item`/`.maestro-subitem` class so a shared-slug top-level and submenu `<li>` — which can carry the identical `data-maestro-slug` value — never resolve to the same DOM node. `selectedSlug` was renamed `selectedKey` throughout for the same reason: both values can now be a qualified key, and the old name was misleading.
- `buildConfig()` drops the `topSlugs` early-return that used to silently skip emitting an override for a shared-slug submenu row; it now emits `cfg.items['parent>child']` for that row, matching the server's qualified-first/legacy-bare-fallback resolution from 20-02 exactly — a bare-only legacy config keeps working unchanged until the row is actually re-saved.
- `tests/e2e/specs/shared-slug.spec.ts` proves the whole chain end-to-end against a gated fixture CPT (`tests/e2e/fixtures/maestro-e2e-shared-slug.php`, mapped via `.wp-env.json`, inert unless `maestro_e2e_shared_slug` is set): renaming the top-level item leaves the same-slug submenu untouched and vice versa, the save payload carries a bare top-level key AND a qualified key, both persist to the correct row after reload, and no console errors are logged.
- **Live human verification (Task 3 checkpoint, approved):** the fix was independently confirmed against real WooCommerce 10.9.1 in the compat wp-env (`tests/compat`) — renaming/hiding the top-level Products item did not affect the "All Products" submenu (and vice versa), and both changes landed on the correct rows after reload, with no console errors and no mis-targeted row selection.
- Zero regressions: `npm run test:js` 53/53, full `npm run test:e2e` 34 passed / 28 capture-gated skipped, `npm run test:php` (integration) 60/60 — all reconfirmed green against this change before commit.

## Task Commits

Each task was committed atomically:

1. **Task 1: Qualified-key client model + stable submenu DOM association** - `5359961` (feat)
2. **Task 2: Targeted Playwright e2e — independent shared-slug editing** - `aabe24c` (test)
3. **Task 3: Live shared-slug editing verification gate** - human-verify checkpoint, **approved** (no code change; no commit)

**Plan metadata:** (pending — this commit)

## Files Created/Modified

- `assets/maestro.js` — qualified-key model build in `init()`, `findSubmenuLi()`/`resolveSubmenuHref()` resolved-href DOM matching, `liForKey()` (renamed from `liForSlug()`) scoped by `isSub`, `selectedKey` (renamed from `selectedSlug`) throughout, `buildConfig()` emits the qualified shared-slug override
- `tests/e2e/specs/shared-slug.spec.ts` — Playwright proof of independent shared-slug editing (rename/hide isolation, qualified-key save payload, reload persistence, no console errors)
- `tests/e2e/fixtures/maestro-e2e-shared-slug.php` — gated mu-plugin fixture CPT reproducing WordPress's post-type self-link convention (top-level + same-slug "All Widgets" submenu)
- `.wp-env.json` — maps the fixture mu-plugin into `wp-content/mu-plugins/`
- `TESTING.md` — documents the resolved-href DOM-join (replacing the old index-zip description) and the new shared-slug e2e coverage

## Decisions Made

- `selectedSlug`/`liForSlug` renamed to `selectedKey`/`liForKey` — both now hold/resolve a generic model key (bare top-level slug or qualified submenu key); the rename surfaces the exact ambiguity the fix closes at every call site rather than leaving a `slug`-named variable that can silently be a qualified key.
- `findSubmenuLi()` falls back to positional binding when no href match is found rather than leaving a child unbound, so the minimal-scope fix cannot regress a menu whose anchor markup doesn't decode as expected — full A1b hardening (a comprehensive stable-attribute rewrite) stays explicitly deferred per `20-CONTEXT.md`.
- The automated Playwright spec uses a purpose-built, gated fixture CPT rather than requiring the heavyweight compat wp-env (WooCommerce + 5 other plugins), keeping `npm run test:e2e` fast and self-contained; the human checkpoint provided the additional real-WooCommerce confirmation the plan's success criteria call for.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added a gated e2e fixture CPT + `.wp-env.json` mapping**
- **Found during:** Task 2 (Playwright e2e authoring)
- **Issue:** The plan's e2e task needed a shared-slug top-level/submenu pair to test against, but the plain `wp-env` used by `npm run test:e2e` has no such menu shape (no WooCommerce or similar plugin installed) — without a fixture, the spec could not be authored at all.
- **Fix:** Added `tests/e2e/fixtures/maestro-e2e-shared-slug.php`, a mu-plugin that registers a CPT reproducing WordPress's native post-type self-link convention (the same shape as WooCommerce Products/All Products), gated behind the `maestro_e2e_shared_slug` option so it is inert for every other spec. Mapped it into `wp-content/mu-plugins/` via `.wp-env.json`.
- **Files modified:** `tests/e2e/fixtures/maestro-e2e-shared-slug.php` (new), `.wp-env.json`
- **Verification:** Full `npm run test:e2e` run (34 passed, 28 capture-gated skipped, 0 failed) confirms the gated fixture has zero effect on any other spec's menu shape.
- **Committed in:** `aabe24c` (Task 2 commit)

**2. [Rule 3 - Blocking] Updated a stale TESTING.md line describing the old index-zip DOM-join**
- **Found during:** Task 2, doc pass before commit
- **Issue:** `TESTING.md` described the submenu DOM-join as "locating submenu items by index within `.wp-submenu`" — Task 1's fix replaced that with resolved-href matching, making the line inaccurate.
- **Fix:** Updated the description to match the new resolved-href matching and added a pointer to the new shared-slug e2e coverage.
- **Files modified:** `TESTING.md`
- **Committed in:** `aabe24c` (Task 2 commit)

**3. [Rule 1 - Bug] Fixed a `check:doc-links` regression in the TESTING.md edit above**
- **Found during:** plan finalization, full-suite re-run before the final docs commit
- **Issue:** The TESTING.md edit (deviation 2) added two bare file-path references (`tests/e2e/specs/shared-slug.spec.ts`, `tests/e2e/fixtures/maestro-e2e-shared-slug.php`) instead of markdown links, tripping `tests/js/doc-links.test.mjs`'s "all in-scope doc refs are linked" gate — `npm run test:js` was not re-run after that edit before the Task 2 commit, so it shipped broken.
- **Fix:** Converted both references to markdown links (`[text](path)`), matching the file's existing convention.
- **Files modified:** `TESTING.md`
- **Verification:** `npm run test:js` 53/53 green again.
- **Committed in:** final docs commit (this plan's metadata commit)

---

**Total deviations:** 3 auto-fixed (2x Rule 3 — blocking, necessary to author a runnable e2e proof; 1x Rule 1 — bug, a doc-links regression introduced by deviation 2 and caught before the final commit). No scope creep: all are additive test/doc infrastructure or a doc-link correction, no product-code change beyond what Task 1 already specified.

## Issues Encountered

- The main dev/tests `wp-env` (used for `npm run test:e2e` / `npm run test:php`) required Colima to be started first (`colima start`, existing VM, no recreate — disk headroom was 17GB, above the 15GB sweep threshold). Torn down (`npx wp-env destroy`) once the automated suites confirmed green, before booting the separate `tests/compat` wp-env for the Task 3 checkpoint.
- The `tests/compat` wp-env (WooCommerce + 5 other real plugins) took several minutes to cold-boot (plugin ZIP downloads); it was started proactively ahead of the checkpoint per the automation-first convention, so the human verifier only had to visit a URL and log in — no CLI steps required on their part. Fully torn down (`npx wp-env destroy`) after approval; `docker ps -a` confirmed zero containers.
- `gsd-tools state advance-plan` failed against this project's STATE.md (`Cannot parse Current Plan or Total Plans in Phase` — this STATE.md uses free-form prose in "Current Position" rather than the tool's expected bold-field format, consistent with how 20-01/20-02 updated it). STATE.md's Current Position section was updated by hand instead, matching the established prose style; `state update-progress`, `state record-metric`, `state add-decision`, and `state record-session` all ran successfully against the bold-field sections they target.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- COMPAT-04 is fully delivered end-to-end (server resolution in 20-01/20-02, client model + DOM association + e2e/live verification in 20-03) and requires no further work in this milestone.
- Phase 20 continues with 20-04/20-05 (COMPAT-07 badge/HTML preservation, COMPAT-10 cascade-hide), independent of this plan's changes — no blockers.
- The qualified-key client pattern (`model[key]`, `data-maestro-key`, `liForKey()`) is now the established shape for any future submenu-identity work; 20-04/20-05 touch title-writing and hide semantics, not DOM identity, so no direct interaction is expected but both should be mindful that submenu model entries are now keyed by qualified key, not bare slug.

---

*Phase: 20-third-party-compatibility-fixes*
*Completed: 2026-08-01*

## Self-Check: PASSED

- FOUND: assets/maestro.js
- FOUND: tests/e2e/specs/shared-slug.spec.ts
- FOUND: tests/e2e/fixtures/maestro-e2e-shared-slug.php
- FOUND: .wp-env.json (mapping present)
- FOUND: TESTING.md (updated)
- FOUND: commit 5359961
- FOUND: commit aabe24c
