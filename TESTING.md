# Testing

Three layers, smallest and fastest first.

> **Current expected status:** unit 90/90 with 101 assertions, integration 47/47 with 122 assertions, JavaScript unit tests, phpcs, PHPStan, Plugin Check, and the Playwright E2E suite should pass before release. E2E coverage includes reset-this-item, per-role visibility, icon persistence, keyboard reordering, first-run cues, and toolbar accessibility checks.

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

Covers the highest-risk pure logic: the `Ordering` resilience rules and the
dashicon validator. Fast, runs anywhere with PHP + Composer.

```bash
composer install
composer test:unit
```

Config: [`phpunit-unit.xml.dist`](phpunit-unit.xml.dist) → bootstrap [`tests/bootstrap-unit.php`](tests/bootstrap-unit.php) (fakes
`ABSPATH`, loads only the pure classes — no stubbing required).

## 2. Integration (WordPress test suite, via wp-env)

Covers `Config::sanitize()`, the replay engine mutating real `$menu`/`$submenu`
globals, role-based visibility, the REST round-trip, and the localized editor
payload. Uses Docker.

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

The E2E global setup normalizes the tests-site `admin` and `maestro_editor`
passwords to `password` before browser login, so reruns are deterministic even
after a persisted wp-env database has drifted.

Targets the wp-env **tests** instance at `http://localhost:8889`
(default login `admin` / `password`). [`global-setup.ts`](tests/e2e/global-setup.ts) authenticates once and
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

The DOM-join (locating submenu items by index within `.wp-submenu`) is only
exercised by the E2E layer — that is the layer to watch when testing against a
real-world menu with third-party plugins registered.


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
