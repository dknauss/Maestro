# Phase 27 — Verification

**Status: code complete; desktop human checks passed 2026-10-23.** All five
plans are on main, including 27-05 through #242 (superseding #241).
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

## What shipped

- **Hiding profiles dialog** (toolbar, next to Menu settings): create, rename,
  delete, and choose people with the shared person picker. Delete confirms
  with the number of items and people affected.
- **Visibility popover:** "Hide this item for profiles:" and, on parents,
  "Hide its sub-items for profiles:", plus "Manage profiles…".
- **Storage:** a `profiles` authoring map (`p_<n>` → name, users, hides,
  child_hides) compiled on every save onto `items[slug].hidden_profiles` and
  `child_hidden_profiles`. The map is the only source of those axes.
- **Runtime:** Term 3 of `is_hidden_for_current_user()`, OR'd with roles and
  users. Membership is resolved live per request, memoized per user, suspended
  in edit mode, with the multisite super-admin exemption.
- **Gate:** profile authoring needs `list_users`. For anyone else the registry,
  the model axes, the carry list and the localized config's profile data are
  withheld server-side, and their saves keep the stored map.
- **Limits:** 20 profiles, 50 live members each, names 1–40 characters,
  unique ignoring case. Users only in v1 (no role membership).

## Automated coverage

| Layer | Where |
|---|---|
| Unit (PHP) | `ConfigSanitizeTest` (profiles map, caps, names, compile, MAX_ITEMS, gate, zero-regression guard) |
| Unit (JS) | `tests/js/profile-targets.test.mjs`, `tests/js/reset-item.test.mjs` |
| Integration | `ProfilesCompileTest`, `ReplayHiddenProfilesTest`, `ProfilesPrivacyTest`, `ReplayMenuModelProfilesTest`, `CosmeticInvariantUsersTest` (profile six-step), on single-site and multisite |
| e2e | `tests/e2e/specs/hidden-profiles.spec.ts` |

## The gate at the judged commit

CI on `a9daf3d` (27-05, #241), all green: integration 202/202 single-site
(14 skipped) and 202/202 multisite (1 skipped); e2e 113 passed, including both
`hidden-profiles.spec.ts` tests; unit, JS, WPCS, PHPStan and Plugin Check on
the runtime ZIP.

## Human verification — desktop passed; touch outstanding

- [x] Dan creates a profile, adds a person, ticks it on an item, and confirms
      in that person's own browser session that the item is gone.
- [x] A second person with the same role, not in the profile, still sees it.
- [x] Removing the person from the profile (no other change) brings the item
      back on their next page load; adding them back hides it again.
- [x] Deleting the profile shows the affected counts, and the item returns.
- [x] The hidden page still opens by URL for the member.
- [x] The Visibility popover and the dialog are usable at a short laptop
      viewport (they scroll inside themselves rather than leave the screen).
- [ ] **Real touch-device testing** of the dialog and popover. Desktop
      emulation does not complete this check.

## What a machine did check

Playwright, against a local WordPress 7.1.3 + SQLite site and against CI's
wp-env, drove every step in the first five boxes above with separate
authenticated sessions for the member and the bystander. That is evidence the
code does what it says; it is separate from Dan's desktop sign-off above.

## Profile guidance follow-up — #247, 2026-10-23

The tour now includes the Hiding profiles toolbar button and explains creating
and assigning a profile. Each saved profile has persistent next-step guidance,
associated with its name input through `aria-describedby`; validation preserves
that association. The introduction explains adding people, assigning the profile
in an item's Visibility controls, and the cosmetic-only page-access boundary.
The name remains Hiding profiles; no feature rename was approved.

Automated regression evidence on a separate disposable Studio WordPress 7.1.3 /
SQLite site: four Playwright cases passed (saved guidance after reload at a
900×600 viewport, invalid-name recovery, desktop tour, narrow Back traversal,
and missing-anchor navigation, grouped into four tests). The missing guidance
and tour expectations failed against the previous implementation. JavaScript
unit tests: 142 passed; PHP syntax, WPCS, documentation links and whitespace
checks passed. New strings are included in the translation template.

Dan's earlier desktop functional sign-off is retained. This automated follow-up
does not claim human acceptance of the new wording or coachmark. **Real
touch-device testing remains outstanding.**

## Approved terminology follow-up — 2026-10-23

After #249, Dan approved **Visibility groups** as the user-facing name and:
“A visibility group lets you hide a menu item from everyone in the group.”
The introduction continues with adding people, selecting the group in a menu
item's Visibility controls, and hiding links without changing page access.
Toolbar/dialog labels, actions, validation/announcements, tour and current user
documentation use group terminology. Internal `profiles` storage/API keys stay
unchanged; no migration is required. This supersedes the earlier note that no
rename had been approved, without changing its historical context.

Four desktop Playwright cases passed with the new labels and copy, including
saved-group reload and validation recovery; the new dialog-name expectation
failed before the rename. Earlier desktop functional acceptance is retained;
new copy is not claimed human-tested. **Real touch-device testing remains
outstanding.**

## Partial real touch-device report — 2026-10-23

Dan supplied functional successes and mobile usability findings. See the
[consolidated touch results and remaining checks](../../TOUCH-DEVICE-CHECKLIST.md#dans-reported-touch-results--2026-10-23).
Small targets/accidental dismissal, cramped dialogs, keyboard obstruction and
three-tip tour coverage remain unresolved. Role mixed-state/locked-row checks,
exact commit and OS/browser versions remain unrecorded. Dan identifies current
main in Playground on iPhone 17 and confirms Arabic/English parity; no RTL-specific
regression was reported. Real Keel mobile interaction was not tested. This report does not close touch acceptance
or replace the earlier desktop sign-off.
