# Testing

Three layers, smallest and fastest first.

> **Current expected status:** unit 128/128 with 160 assertions, integration 72/72 with 168 assertions, JavaScript unit tests, phpcs, PHPStan, Plugin Check, and the Playwright E2E suite should pass before release. E2E coverage includes reset-this-item, per-role visibility, icon persistence, keyboard reordering, first-run cues, toolbar accessibility checks, (COMPAT-04) independent shared-slug top-level/submenu editing, and (COMPAT-10) the "also hide children" cascade checkbox's default-off-vs-on behavior.

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
pure role-list union computation against [`tests/unit/CascadeTest.php`](tests/unit/CascadeTest.php)'s
rides-parent-hide / role-mirror / union / flag-off cases. Fast, runs anywhere
with PHP + Composer.

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
(COMPAT-10) cascade-hide-to-children — rides-the-parent-hide, role-mirror,
union-with-a-child's-own-rule, all-live-children, and the mandatory
cosmetic-only guardrail (`current_user_can()` byte-for-byte unchanged; the
cascade-hidden child's own capability requirement still resolves true) in
[`tests/integration/ReplayTest.php`](tests/integration/ReplayTest.php). Uses Docker.

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

(COMPAT-10) [`tests/e2e/specs/cascade-hide.spec.ts`](tests/e2e/specs/cascade-hide.spec.ts) proves the "also hide
children" checkbox is gated to parents with children (absent on a childless
item — via the gated fixture
[`tests/e2e/fixtures/maestro-e2e-childless.php`](tests/e2e/fixtures/maestro-e2e-childless.php), since every native WP
core top-level item always registers at least one submenu row — and absent on
a submenu row), that toggling it persists `cascade_hide` via the normal save,
and that cascade OFF leaves every child visible while cascade ON hides them
all, role-mirrored. Because hiding a parent's own top-level row already
removes its entire rendered dropdown regardless of cascade (WordPress core's
`_wp_menu_output()` never renders a `$submenu` array whose parent row was
`unset()`), the on/off distinction is asserted against the real
`$submenu['edit.php']` state `Replay::replay()` produces for a given user via
[`tests/e2e/fixtures/dump-cascade-submenu.php`](tests/e2e/fixtures/dump-cascade-submenu.php) — the same
`admin_menu`@`PHP_INT_MAX` wp-cli dump technique the R1 compat surveys used —
run against whatever config the browser actually saved through the REST
endpoint.


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
