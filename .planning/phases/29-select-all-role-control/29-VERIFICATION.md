# Phase 29 — Verification

**Status: built; desktop human checks passed 2026-10-23.** Automated coverage
is in [29-SUMMARY.md](29-SUMMARY.md). D3 (the tri-state checkbox) is confirmed.
Real touch-device testing remains outstanding.

## Desktop human sign-off — 2026-10-23

Dan reported that all desktop human checks passed on the disposable Studio
site prepared from main `312c8b7`: WordPress 7.1.3, PHP 8.4, SQLite,
Keel 0.8.0 (main `7013953`, saved 240px baseline), and Arabic active.
The site included an administrator, two Editors (profile member and same-role
non-member), and an Author for the role comparison. This is Dan's human
sign-off, separate from the automated evidence below. No browser or
assistive-technology version was supplied.

**Real touch-device testing remains outstanding.** Desktop sign-off does not
complete that check or establish full acceptance across devices.

## Success criteria (ROADMAP)

| # | Criterion | Evidence |
|---|---|---|
| 1 | One activation ticks every role the user does not hold when the result fits the server limit; a second clears them. An over-limit selection preserves existing choices and explains the limit. | e2e normal, over-limit and exact-50 save/reload cases |
| 2 | The editing user still sees the item after reload | e2e test 1 (admin reload) |
| 3 | On both role groups, never on the per-person group | e2e test 3; built in `buildRoleGroup()` only |
| 4 | Locked rows stay derived: never written, still checked and `aria-disabled` | e2e test 2; `applySelectAll()` unit tests |
| 5 | Accessible name includes the group heading; the result is announced | e2e test 1 (`getByRole` by full name, recorded `wp.a11y.speak()`) |
| 6 | Zero regression | local: unit, JS, e2e, WPCS, PHPStan, doc links; CI: both integration lanes, e2e, Plugin Check |

## Human check — desktop passed

- [x] D3 confirmed by Dan 2026-10-23: the tri-state checkbox reading "All
      other roles (not Administrator)".
- [x] On a real site, tick it on an item and confirm another role's user
      loses the item while you keep it.
- [x] With a screen reader, the control reads with its group heading and the
      mixed state is announced as mixed.
- [ ] Real touch-device testing of the role controls and Visibility popover.


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
automated checks are separate from Dan's desktop sign-off and do not complete
touch-device acceptance.

## Partial real touch-device report — 2026-10-23

Dan supplied functional successes and mobile usability findings. See the
[consolidated touch results and remaining checks](../../TOUCH-DEVICE-CHECKLIST.md#dans-reported-touch-results--2026-10-23).
Small targets/accidental dismissal, cramped dialogs, keyboard obstruction and
three-tip tour coverage remain unresolved. Role mixed-state/locked-row checks,
exact commit remains unrecorded. Dan identifies current main in Playground on
iPhone 17, Safari on iOS 26.6.2, and confirms Arabic/English parity; no RTL-specific
regression was reported. Real Keel mobile interaction was not tested. This report does not close touch acceptance
or replace the earlier desktop sign-off.
