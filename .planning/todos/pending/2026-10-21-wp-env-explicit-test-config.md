---
created: 2026-10-21T00:00:00.000Z
title: Migrate wp-env to explicit development and test configurations
area: dev-tooling
files:
  - .wp-env.json
  - tests/compat/.wp-env.json
  - package.json
  - .github/workflows/ci.yml
  - playwright.config.ts
  - TESTING.md
---

## Where it came from

During verification of #225 (@wordpress/env 12, closing the simple-git
advisories), `wp-env start` warned that starting development and tests
environments together by default is deprecated and will be removed in a
future version. It also deprecated `testsEnvironment`, `env`, and `testsPort`,
pointing to `--config` with a separate test configuration instead.

The root configuration currently relies on the implicit test environment:
`npm run env:start` starts both sites, and test scripts address `tests-cli`.
The environment still boots successfully on wp-env 12; this is preventive
maintenance, with no removal version established here.

## What to do

- Inventory root and compatibility configurations, npm scripts, CI, Playwright,
  and documented commands for implicit dual startup, legacy options, container
  names, and `WP_ENV_TESTS_PORT` overrides.
- Check the installed wp-env documentation and supported `--config` behavior
  before choosing file names or command syntax. Use explicit development and
  test configurations; preserve the pinned WordPress git source, plugin and
  fixture mappings, debug settings, and test-library setup.
- Update start/run/stop/destroy commands consistently so each targets the
  intended configuration. Account for PHP integration, multisite, E2E, and
  compatibility workflows, including their container names and ports.
- Preserve the alternate-port workflow used when another project occupies
  8888/8889. Confirm how port overrides work with explicit configurations.
- Update TESTING.md alongside the scripts and CI. Keep this separate from
  plugin behavior changes.

## Check when doing it

- Explicitly start the test environment from a clean setup and verify the
  pinned core version, plugin mapping, fixtures, and PHPUnit library.
- Run PHP integration and multisite tests and the Playwright E2E suite using
  the new commands; confirm CI uses those same commands successfully.
- Verify development startup and the compatibility workflow independently.
- Exercise alternate ports and ensure stopping or destroying one configuration
  targets only its own environment, without affecting other local projects.
- Confirm normal startup emits none of the dual-start or legacy-option
  deprecation warnings, and document the replacement commands.
