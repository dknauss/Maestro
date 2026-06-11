# Testing

Three layers, smallest and fastest first.

> **Status:** all three layers have now been executed and pass against a local
> wp-env (Docker via colima): unit 23/23, integration 13/13, E2E 4/4. Two fixes
> were needed to get there — the integration bootstrap referenced the pre-rename
> plugin filename, and `@wordpress/scripts` v30 dropped the `test-unit-php`
> command (`test:php` now calls phpunit directly in the tests container). See the
> gotchas below before a first run.

## Gotchas (first run)

- **Activate the plugin on the tests instance.** wp-env mounts the plugin on both
  the dev (`:8888`) and tests (`:8889`) instances, but the E2E layer drives the
  tests instance as a real site and needs the plugin *activated* there:
  `npx wp-env run tests-cli wp plugin activate admin-menu-maestro`.
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

Config: `phpunit-unit.xml.dist` → bootstrap `tests/bootstrap-unit.php` (fakes
`ABSPATH`, loads only the pure classes — no stubbing required).

## 2. Integration (WordPress test suite, via wp-env)

Covers `Config::sanitize()`, the replay engine mutating real `$menu`/`$submenu`
globals, role-based visibility, and the REST round-trip. Uses Docker.

```bash
npm install
npm run env:start          # boots WordPress + MySQL in Docker
npm run test:php           # wp-scripts runs PHPUnit inside the tests container
```

`wp-scripts test-unit-php` provisions the WP PHPUnit library and sets
`WP_TESTS_DIR`, which `tests/bootstrap-integration.php` reads. Config:
`phpunit-integration.xml.dist`.

Standalone (no wp-env): install the WP test library with a configured test DB,
export `WP_TESTS_DIR`, then `composer test:integration`.

## 3. End-to-end (Playwright, against live WordPress)

Drives the editor in a real browser: edit-mode gating, the admin-bar toggle,
rename → save → persist → reset, and the icon picker preview.

```bash
npm run env:start          # if not already running
npx playwright install     # one-time browser download
npm run test:e2e           # or: npm run test:e2e:headed
```

Targets the wp-env **tests** instance at `http://localhost:8889`
(default login `admin` / `password`). `global-setup.ts` authenticates once and
stores the session.

## What each layer is good for

| Layer        | Speed | Needs Docker | Catches |
|--------------|-------|--------------|---------|
| Unit         | ⚡ ms  | no           | ordering edge cases, icon validation regressions |
| Integration  | ~10s  | yes          | replay against real globals, sanitization, REST auth + round-trip |
| E2E          | ~30s  | yes          | the DOM-join + sortable + save/reset flow that no PHP test can reach |

The DOM-join (locating submenu items by index within `.wp-submenu`) is only
exercised by the E2E layer — that is the layer to watch when testing against a
real-world menu with third-party plugins registered.
