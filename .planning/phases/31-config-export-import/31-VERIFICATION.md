# Phase 31 verification

Feature PR: [#263](https://github.com/dknauss/Maestro/pull/263), branch
`claude/config-export-import-fixes`, head `2292278`.
Completion branch: `fix/config-transfer-completion`, based on that feature PR.

The original implementation is preserved locally on `feat/config-export-import`
at `d6665fd`. Claude incorporated its snapshot into #263, added normal option
update notifications while preserving autoload, and retained desktop-only
Settings. This follow-up preserves those changes and supplies the two missing
UI behaviors already covered by tests in #263: recovery after a canceled reload
and downloading the complete report when the on-screen preview exceeds 50 rows.

## Existing work inspection

Local primary checkout was clean. Five unrelated linked worktrees and all local
branches were inspected; no existing transfer implementation was found. The
plan from the old repository path was copied into the implementation worktree.
The branch is isolated at `/Users/dan-knauss/.codex/worktrees/maestro-config-transfer`.

## Design decisions

- The outer file schema is v1; stored identity schema remains v2. Legacy exports
  request a current-editor save rather than reinterpret ambiguous old rules.
- Imports replace portable settings and preserve destination people/groups.
- Fresh, nonce-checked Dashboard requests capture qualified identity before
  replay; expiring server-owned context binds the actual viewer/session/site,
  active plugins/theme/roles/capabilities and destination revision. Analysis
  proof also binds the exact file. REST does not synthesize menu registration.
- Config writes use the common sanitizer and atomic option compare-and-swap.
- Imports never trigger an unconditional old-model autosave before applying.
- Settings, and with it transfer, stays desktop-only (961px and up), keeping
  #252's phone toolbar row budget (Dan, 2026-10-24).

## Automated evidence

Local verification on 2026-10-24; session logs are in
`/tmp/maestro-transfer-completion-*`:

- PHP unit: 255 tests, 592 assertions, passed.
- WordPress integration: 250 tests, 961 assertions, 15 environment-dependent skips.
- Multisite integration: 250 tests, 990 assertions, 1 environment-dependent skip.
- JavaScript unit: 142 passed.
- Focused Playwright: 22 passed, covering transfer (including two actual sites),
  canceled-reload recovery, complete report downloads, phone layouts and tours.
- WPCS, PHPStan, JavaScript syntax and documentation links passed.
- Runtime ZIP built successfully. Plugin Check: zero errors; one existing
  warning for the readme 1.3.0 upgrade notice exceeding 300 characters.

The two completion regressions failed before their implementations and passed
with the fixes. #263's full CI browser run reported 206 passes and only those
two failures; this follow-up reran the affected flows and related responsive
checks locally. The CI workflow targets PRs into main, so a complete browser-suite rerun
will occur when this follow-up is incorporated into #263. The stacked PR itself
only runs the review gate.
Baseline before Phase 31: PHP unit 234 tests/555 assertions; JavaScript 142/142.

## Fresh review

A separate read-only review found four issues. Regression tests were added
before fixes: stale UI autosave, protected-cap starvation, duplicate JSON
members and equivalent submenu-order parent aliases. All four regressions passed after fixes and are included in #263.

## Screenshot provenance

The desktop screenshot was captured during implementation. The phone screenshot
records an earlier mobile-Settings experiment; it does not represent the final
desktop-only Settings decision and is not acceptance evidence for the final UI.

## Human acceptance

Real iPhone/iPad and human screen-reader checks remain open. Browser emulation
and screenshots do not close those checks. No production WordPress writes,
release tags, deployment or merge were performed.
