# Testing

Three layers, smallest and fastest first.

> **Current expected status:** unit 221/221 with 540 assertions, integration 202 total single-site (188 passed, 14 skipped) + 202 total under WP_MULTISITE=1 (201 passed, 1 skipped), JavaScript unit tests, phpcs, PHPStan, Plugin Check, and the Playwright E2E suite should pass before release. E2E coverage includes reset-this-item, per-role visibility, icon persistence, keyboard reordering, first-run cues, toolbar accessibility checks, (COMPAT-04) independent shared-slug top-level/submenu editing, (COMPAT-10) the "Hide its sub-items from:" role group's independent child-hiding behavior, and (ROLE-02) per-user hiding asserted in a targeted user's own authenticated session — including a same-role bystander who must keep every row, which is the assertion that proves the rule did not widen to the whole role. (Phase 27) hiding profiles get the same proof in [`tests/e2e/specs/hidden-profiles.spec.ts`](tests/e2e/specs/hidden-profiles.spec.ts): a member loses the row in their own session while a same-role bystander keeps it, taking the member out of the profile brings the row back while the item still names the profile (membership is live, not compiled), putting them back hides it again, deleting the profile restores it, and the hidden page still loads by URL. (Phase 29) the "All other roles" select-all is covered in [`tests/e2e/specs/select-all-roles.spec.ts`](tests/e2e/specs/select-all-roles.spec.ts): one activation hides the item from every role the admin does not hold in a single save, the admin keeps the item while an editor loses it, a mixed state shows after one role is unticked, a second activation clears them, and in the sub-items list a row locked by the parent's own hide stays checked, `aria-disabled` and out of the payload. (Phase 25) the toolbar's reserved status slot (no layout shift across a save), its widened focus-ring contrast, focused buttons keeping readable text on the dark surface, and the derived-locked checkbox's aria-disabled/aria-describedby semantics are covered in [`tests/e2e/specs/toolbar-dark-surface.spec.ts`](tests/e2e/specs/toolbar-dark-surface.spec.ts).

## Gotchas (first run)

- **Activate the plugin on the tests instance.** wp-env mounts the plugin on both
  the dev (`:8888`) and tests (`:8889`) instances, but the E2E layer drives the
  tests instance as a real site and needs the plugin *activated* there:
  `npx wp-env run tests-cli wp plugin activate maestro-menu-editor/maestro-menu-editor.php`.
  (The integration layer loads the plugin via the test bootstrap, so it does not
  depend on activation.)
- **`test:php` runs phpunit in the container directly** — there is no longer a
  `wp-scripts test-unit-php`. The script is
  `wp-env run tests-cli --env-cwd=… vendor/bin/phpunit -c phpunit-integration.xml.dist`.

## 1. Unit (pure PHP, no WordPress, no Docker)

Covers the highest-risk pure logic: the `Ordering` resilience rules, the
dashicon validator, (COMPAT-07) [`Title::replace_label()`](includes/class-title.php)'s
text-node label-replacement against [`tests/unit/TitleTest.php`](tests/unit/TitleTest.php)'s
badge/wrapping-markup fixtures, and (COMPAT-10) [`Cascade::effective_hidden_roles()`](includes/class-cascade.php)'s
pure role-list union of a child's own `hidden_roles` with its parent's
independent `child_hidden_roles`, against [`tests/unit/CascadeTest.php`](tests/unit/CascadeTest.php)'s
union / dedup / multi-role cases. (ROLE-02) [`Config::sanitize()`](includes/class-config.php)'s
per-user `hidden_users` / `child_hidden_users` axes are covered in
[`tests/unit/ConfigSanitizeTest.php`](tests/unit/ConfigSanitizeTest.php) — coercion,
intersect-against-live, `MAX_HIDDEN_USERS` cap, the sparse drop-when-empty contract,
the parent-only rule for the child axis, and a zero-regression guard asserting a
role-only config sanitizes byte-identically. `Cascade::effective_hidden_users()`'s
per-user union is covered alongside the role union in
[`tests/unit/CascadeTest.php`](tests/unit/CascadeTest.php), including a case
asserting the two axes never bleed into one another. (Phase 28-02) the stored
`menu_width` is covered in the same file (bounded, clamped, sparse, re-bounded on
read), and the CSS it emits in
[`tests/unit/MenuWidthCssTest.php`](tests/unit/MenuWidthCssTest.php): desktop-only,
never on `body.folded`, RTL mirrored, and never `!important`. Fast, runs anywhere with
PHP + Composer.

```bash
composer install
composer test:unit
```

Config: [`phpunit-unit.xml.dist`](phpunit-unit.xml.dist) → bootstrap [`tests/bootstrap-unit.php`](tests/bootstrap-unit.php) (fakes
`ABSPATH`, loads only the pure classes — no stubbing required).

## 2. Integration (WordPress test suite, via wp-env)

Covers `Config::sanitize()`, the replay engine mutating real `$menu`/`$submenu`
globals, role-based visibility, the REST round-trip, the localized editor
payload, (COMPAT-07) badge/wrapping-markup preservation on rename at both
title-write seams in [`Replay::replay()`](includes/class-replay.php), and
(COMPAT-10) independent `child_hidden_roles` — hides ALL live children while
the parent stays visible, independence from the parent's own hide, role-mirror,
union-with-a-child's-own-rule, and the mandatory cosmetic-only guardrail
(`current_user_can()` byte-for-byte unchanged; the hidden child's own
capability requirement still resolves true) in
[`tests/integration/ReplayTest.php`](tests/integration/ReplayTest.php).

(Phase 28-02) [`tests/integration/MenuWidthAssetTest.php`](tests/integration/MenuWidthAssetTest.php)
asserts that a stored menu width reaches ordinary admin pages as inline CSS on
the always-loaded `maestro-admin-bar` stylesheet, that a site with no width gets
none, that applying it costs no query beyond the config read Replay already
makes, and the REST save/reset round trip.

(Phase 27-02) hiding-profile storage is covered in
[`tests/integration/ProfilesCompileTest.php`](tests/integration/ProfilesCompileTest.php):
a profile's hide-lists compile onto `items[slug].hidden_profiles` and
`child_hidden_profiles` through the real REST save, repeated full-replace saves
do not drift, members are intersected against live users (a deleted account
drops out, the profile stays), and a saver without `list_users` can neither
change nor destroy profiles on save or Reset All. The caps, name rules, the
MAX_ITEMS bound on compiled entries and the zero-regression guard for the role
and user axes are unit tests in
[`tests/unit/ConfigSanitizeTest.php`](tests/unit/ConfigSanitizeTest.php).

(Phase 27 hardening) [`tests/integration/ProfilesPrivacyTest.php`](tests/integration/ProfilesPrivacyTest.php)
checks delegated-editor REST GET/POST responses and localized JS, authorized
reads, and a redacted read/save round trip that preserves stored profile and
per-user rules. `Config::for_editor()` is the shared outbound projection; replay
and storage retain the full configuration. The three member-validation
regressions in [`tests/unit/ConfigSanitizeTest.php`](tests/unit/ConfigSanitizeTest.php)
cover duplicate IDs, deleted IDs, and invalid profiles preceding a valid one.
All three failed before the candidate-collection fix; all three delegated
response tests failed before outbound filtering. Profile/member caps apply to
accepted profiles and live unique members, after validation, not raw positions.

(Phase 27-03) Term 3 of the hide seam is covered in
[`tests/integration/ReplayHiddenProfilesTest.php`](tests/integration/ReplayHiddenProfilesTest.php):
a profile member loses the row and a same-role non-member keeps it, the
`child_hidden_profiles` cascade, live membership (editing only the stored
member list changes the next request, with the compiled axis untouched), a
reference to a deleted profile self-healing, per-user memoization, OR
independence across all three terms, the fast path (no membership lookup unless
an item carries a profile axis), the edit-mode suspension and the multisite
super-admin exemption. The cosmetic-only proof for both profile axes runs the
same six steps in
[`tests/integration/CosmeticInvariantUsersTest.php`](tests/integration/CosmeticInvariantUsersTest.php).

(Phase 27-04) the editor's view of profiles is covered in
[`tests/integration/ReplayMenuModelProfilesTest.php`](tests/integration/ReplayMenuModelProfilesTest.php):
every node carries `hiddenProfiles` and `childHiddenProfiles` (a child its own
`hiddenProfiles`) through the same normalized resolvers replay uses, the item
the popover shows ticked is the one removed for a member, a reference to a
missing profile is left out, the registry pairs members with names in one
query, and a viewer without `list_users` gets no registry, empty profile axes
and no carry list. The localized config never holds the profiles map, and the
carry list holds exactly the stored hides that match no rendered row. The
popover and dialog logic (assignment toggles, IDs that are never reused, name
rules, the delete count, the save payload and the carry) is unit-tested in
[`tests/js/profile-targets.test.mjs`](tests/js/profile-targets.test.mjs).

(ROLE-02) the per-user axes are covered in
[`tests/integration/ReplayHiddenUsersTest.php`](tests/integration/ReplayHiddenUsersTest.php)
— `hidden_users`, the `child_hidden_users` cascade, OR-independence between the
role and user axes, the multisite-scoped super-admin exemption, and a tripwire
asserting Maestro owns no `$menu` row a hide could remove. Their cosmetic-only
proof lives in
[`tests/integration/CosmeticInvariantUsersTest.php`](tests/integration/CosmeticInvariantUsersTest.php),
which implements the feasibility note's §6 six-step invariant literally: the
capability set is read off the LIVE role object (so a future WordPress
capability cannot escape it), the whole cap map is asserted at once across
apply/remove, the menu model is asserted to actually change, and the direct-URL
escape hatch is asserted. Note `snapshot_caps()` deliberately rebuilds the
current user before reading — without that, `current_user_can()` answers from a
cached allcaps array and the guardrail would pass a broken seam. Uses Docker.

```bash
npm install
npm run env:start          # boots WordPress + MySQL in Docker
npm run test:php           # runs PHPUnit inside the tests container
```

`@wordpress/env` provisions the WP PHPUnit library in the tests container. The
`test:php` script runs `vendor/bin/phpunit` there directly with config:
[`phpunit-integration.xml.dist`](phpunit-integration.xml.dist).

Standalone (no wp-env): install the WP test library with a configured test DB,
export `WP_TESTS_DIR`, then `composer test:integration`.

### Multisite lane

```bash
npm run test:php:multisite   # same suite, WP_MULTISITE=1
```

ROLE-02's super-admin exemption is `is_multisite() && is_super_admin()`, so on a
single-site run the second half never evaluates and the branch is uncovered —
which is exactly how it shipped through the v1.5.0 gates as a known unknown. The
multisite-only cases in
[`tests/integration/ReplayHiddenUsersTest.php`](tests/integration/ReplayHiddenUsersTest.php)
assert all three halves of the rule: a network super admin is exempt from the
person axis, an ordinary user on the same network is **not**, and the role axis
still applies to super admins (the documented asymmetry). They `markTestSkipped`
on single-site, and the single-site-only self-target case skips under multisite,
so both lanes report 127 tests. CI runs both.

## 3. End-to-end (Playwright, against live WordPress)

Drives the editor in a real browser: edit-mode gating, the admin-bar toggle,
rename → save → persist → reset, reset-this-item, per-role visibility, and the
icon picker preview.

```bash
npm run env:start          # if not already running
npx playwright install     # one-time browser download
npm run test:e2e           # or: npm run test:e2e:headed
```

The E2E auth setup normalizes the tests-site `admin` and `maestro_editor`
passwords to `password` before browser login, so reruns are deterministic even
after a persisted wp-env database has drifted.

Targets the wp-env **tests** instance at `http://localhost:8889`
(default login `admin` / `password`). [`auth.setup.ts`](tests/e2e/auth.setup.ts) runs as a
Playwright setup project that every spec depends on — it authenticates once and
stores the session.

### Test isolation and why the suite runs serially

The plugin keeps its entire state in **one** WordPress option (`maestro_config`)
on a single wp-env instance — there is no per-test database. So
[`fixtures.ts`](tests/e2e/fixtures.ts) wipes that option before **every** test
(an `auto` fixture that runs `wp option delete maestro_config`), giving each test
the natural WordPress menu regardless of what a prior spec left behind. Specs
must import `test`/`expect` from `./fixtures`, not `@playwright/test`, to get
this reset. Without it, the save-race specs — which deliberately race an
autosave against a Reset-All — could leave `Posts` renamed and fail unrelated
specs that assert the default label.

That per-test reset is a destructive delete, so the suite is pinned to
`workers: 1` in [`playwright.config.ts`](playwright.config.ts). `fullyParallel:
false` only serializes *within* a file; separate spec files would still run on
separate workers against the one shared backend, where a `beforeEach` delete in
one file could land mid-test in another and create a fresh race. Serializing is
what makes the shared-option reset race-free — it is the precondition for the
isolation, not a flake mask.

> **Trade-off:** serializing roughly doubles wall-clock (~2 min per full run on
> a typical dev machine vs. parallel). That is the correct call for a
> single-shared-backend suite where correctness depends on serialization. If
> suite runtime becomes a concern later, the real fix is giving each worker its
> own isolated WordPress instance (e.g. one wp-env/database per worker) so the
> per-test reset no longer needs to be global — then `workers: 1` can be lifted.

## What each layer is good for

| Layer        | Speed | Needs Docker | Catches |
|--------------|-------|--------------|---------|
| Unit         | ⚡ ms  | no           | ordering edge cases, icon validation regressions |
| Integration  | ~10s  | yes          | replay against real globals, sanitization, REST auth + round-trip |
| E2E          | ~2 min | yes         | the DOM-join + sortable + save/reset flow that no PHP test can reach |

The DOM-join (locating submenu items by resolved anchor href/slug within
`.wp-submenu`, including a shared-slug top-level/submenu pair — COMPAT-04) is
only exercised by the E2E layer — that is the layer to watch when testing
against a real-world menu with third-party plugins registered.
[`tests/e2e/specs/shared-slug.spec.ts`](tests/e2e/specs/shared-slug.spec.ts) covers the shared-slug case against a
gated fixture CPT ([`tests/e2e/fixtures/maestro-e2e-shared-slug.php`](tests/e2e/fixtures/maestro-e2e-shared-slug.php)) that
reproduces WordPress's post-type self-link convention (the WooCommerce
Products / "All Products" shape) without depending on a real third-party
plugin.

(Phase 28) [`tests/e2e/specs/menu-width-measured.spec.ts`](tests/e2e/specs/menu-width-measured.spec.ts)
proves edit mode follows the menu's measured width, and
[`tests/e2e/specs/menu-width-stored.spec.ts`](tests/e2e/specs/menu-width-stored.spec.ts)
proves a stored width while browsing: menu and content column at the stored
width, flyouts opening at its edge, folded still 36px, core's auto-fold at 960px
and below, a Keel-style `!important` width winning, and an unrelated edit-mode
autosave carrying the width forward.
[`tests/e2e/specs/menu-width.spec.ts`](tests/e2e/specs/menu-width.spec.ts)
(28-03) covers the controls: the Menu settings field previews live, saves, and
applies on an ordinary admin page after reload; the slider is keyboard-operable;
**Use default** clears the width; the edge handle resizes by drag and by
keyboard; **Reset this item** leaves the width alone; the dialog stays inside the
viewport; the dialog says so when another plugin owns the width, and the
handle saves nothing then; **Reset All** clears the width; and the handle is
hidden below 961px. The pure
helpers behind them (clamping, the preview CSS, pointer-to-width) are in
[`tests/js/menu-width.test.mjs`](tests/js/menu-width.test.mjs), which asserts the
same CSS literal as the PHP `MenuWidthCssTest`, so preview and reload cannot drift.

(COMPAT-10) [`tests/e2e/specs/cascade-hide.spec.ts`](tests/e2e/specs/cascade-hide.spec.ts) proves the "Hide its
sub-items from:" role group is gated to parents with children (absent on a
childless item — via the gated fixture
[`tests/e2e/fixtures/maestro-e2e-childless.php`](tests/e2e/fixtures/maestro-e2e-childless.php), since every native WP
core top-level item always registers at least one submenu row — and absent on
a submenu row), that toggling a role in it persists `child_hidden_roles`
independently of the item's own `hidden_roles`, and — because this model
leaves the parent VISIBLE — the effect is asserted DIRECTLY against the
rendered sidebar as the targeted role: the parent's row stays, its child rows
are gone, role-mirrored (an admin not in `child_hidden_roles` still sees every
child), and the hidden child page still loads by direct URL for a capable user
(cosmetic-only guardrail, reconfirmed end-to-end). The same case also asserts
(WCAG 1.3.1) that each role group carries a programmatic accessible name —
`role="group"` plus an `aria-labelledby` that resolves to the group's own
heading text — with the two groups' heading ids distinct, so an assistive-tech
user can tell which axis a shared role name controls.

A second `cascade-hide.spec.ts` case covers the DERIVED-lock refinement: a
role checked in "Hide this item from:" renders that same role's checkbox in
"Hide its sub-items from:" as checked+disabled (with a title tooltip and an
AT-only [`screen-reader-text`](assets/maestro.css) hint), live and without
reopening the popover, while the save payload for that action never carries
`child_hidden_roles` for that role — proving the lock is a pure display
derivation ([`isChildRoleLockedByParent()`](assets/maestro-logic.js), unit
tests in
[`tests/js/child-role-lock.test.mjs`](tests/js/child-role-lock.test.mjs)),
never something written into the model. Un-hiding the parent restores the
locked role to unchecked+enabled, and the live menu (a second authenticated
browser context) proves the round-trip end-to-end: the children reappear for
that role, because the lock never persisted it into `child_hidden_roles`.


## 4. Static and package QA

Additional release gates:

```bash
composer lint
composer analyse:phpstan
npm run test:js
npm run check:doc-links
npm run audit:npm
bash bin/build.sh
```

To run Plugin Check locally against the runtime tree:

```bash
npm run env:start
npx wp-env run cli wp plugin install plugin-check --activate
npx wp-env run cli wp plugin check /var/www/html/wp-content/plugins/maestro-menu-editor/build/maestro-menu-editor --format=json
```

`npm run audit:npm` wraps `npm audit` with a narrow allowlist for the current dev-only `@wordpress/env` → `js-yaml` advisory. Remove that allowlist when upstream ships a clean dependency path.
