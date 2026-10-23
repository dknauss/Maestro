# Phase 29 — Verification

**Status: built; human check open.** Automated coverage is in
[29-SUMMARY.md](29-SUMMARY.md). The phase closes when Dan has tried it in a
browser. D3 (the tri-state checkbox) is confirmed.

## Success criteria (ROADMAP)

| # | Criterion | Evidence |
|---|---|---|
| 1 | One activation ticks every role the user does not hold when the result fits the server limit; a second clears them. An over-limit selection preserves existing choices and explains the limit. | e2e normal, over-limit and exact-50 save/reload cases |
| 2 | The editing user still sees the item after reload | e2e test 1 (admin reload) |
| 3 | On both role groups, never on the per-person group | e2e test 3; built in `buildRoleGroup()` only |
| 4 | Locked rows stay derived: never written, still checked and `aria-disabled` | e2e test 2; `applySelectAll()` unit tests |
| 5 | Accessible name includes the group heading; the result is announced | e2e test 1 (`getByRole` by full name, recorded `wp.a11y.speak()`) |
| 6 | Zero regression | local: unit, JS, e2e, WPCS, PHPStan, doc links; CI: both integration lanes, e2e, Plugin Check |

## Human check — open

- [x] D3 confirmed by Dan 2026-10-23: the tri-state checkbox reading "All
      other roles (not Administrator)".
- [ ] On a real site, tick it on an item and confirm another role's user
      loses the item while you keep it.
- [ ] With a screen reader, the control reads with its group heading and the
      mixed state is announced as mixed.


## Role-limit review follow-up

The bulk control reads `Config::MAX_HIDDEN_ROLES` from the localized
`maxHiddenRoles`. When the complete proposed set (including retained own or
locked roles) exceeds that limit, it leaves both the model and stored choices
alone, restores the checkbox state, and displays and announces an explanation.
It does not save a truncated prefix. Clearing remains available.

Regression coverage includes a 60-role site with partial selections in both
role groups: refused bulk attempts followed by a valid manual save and reload
retain exactly those selections. At the 50-target boundary, select, save,
reload and clear all round-trip. Four pure-helper cases cover overflow,
retained entries, the exact boundary and clearing. The overflow unit cases and
the browser refusal case failed before the fix.

**Real touch-device testing remains outstanding.** Browser emulation and these
automated checks do not close the human checks above or Phase 28 acceptance.
