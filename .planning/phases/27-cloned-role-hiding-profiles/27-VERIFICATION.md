# Phase 27 — Verification

**Status: code complete; human verification open.** All five plans are
built: 27-01 decisions (#230), 27-02 storage and compile (#237), 27-03 hide
seam and live membership (#238), the #240 privacy and member-validation
follow-up, 27-04 editor (#239), and 27-05 (this plan: e2e, gate, docs). The
phase closes when Dan has driven the profile flow in a browser himself and
ticked the boxes below. **No human has signed off on Phase 27 yet.** The
browser runs recorded here were driven by automation (Playwright), and are
labelled as such.

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

## Human verification — open

- [ ] Dan creates a profile, adds a person, ticks it on an item, and confirms
      in that person's own browser session that the item is gone.
- [ ] A second person with the same role, not in the profile, still sees it.
- [ ] Removing the person from the profile (no other change) brings the item
      back on their next page load; adding them back hides it again.
- [ ] Deleting the profile shows the affected counts, and the item returns.
- [ ] The hidden page still opens by URL for the member.
- [ ] The Visibility popover and the dialog are usable at a short laptop
      viewport (they scroll inside themselves rather than leave the screen).
- [ ] **Real touch-device testing** of the dialog and popover. Desktop
      emulation does not complete this check.

## What a machine did check

Playwright, against a local WordPress 7.1.3 + SQLite site and against CI's
wp-env, drove every step in the first five boxes above with separate
authenticated sessions for the member and the bystander. That is evidence the
code does what it says; it is not the human sign-off this phase needs.
