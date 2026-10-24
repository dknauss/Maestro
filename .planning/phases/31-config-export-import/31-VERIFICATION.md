# Phase 31 verification

Implementation branch: `feat/config-export-import`, base `d34a576`.

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
- Settings is available on phones; width controls remain desktop-only.

## Automated evidence

Pending final consolidated runs; implementation session logs are in `/tmp/maestro-transfer-*`.
Baseline: PHP unit 234 tests/555 assertions; JavaScript 142/142.

## Fresh review

A separate read-only review found four issues. Regression tests were added
before fixes: stale UI autosave, protected-cap starvation, duplicate JSON
members and equivalent submenu-order parent aliases. Final results below.

## Human acceptance

Real iPhone/iPad and human screen-reader checks remain open. Browser emulation
and screenshots do not close those checks. No production WordPress writes,
release tags, deployment or merge were performed.
