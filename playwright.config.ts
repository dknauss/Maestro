import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for the in-place menu editor.
 *
 * Targets the wp-env *tests* instance (port 8889 by default), whose default admin login is
 * admin / password. global-setup logs in once and stores the session so specs
 * start authenticated.
 */
const testsPort = process.env.WP_ENV_TESTS_PORT || '8889';

export default defineConfig( {
	testDir: './tests/e2e',
	globalSetup: './tests/e2e/global-setup.ts',
	timeout: 30_000,
	expect: { timeout: 10_000 },
	fullyParallel: false,
	// Serialize across spec files. The plugin's entire state is ONE shared
	// WordPress option (maestro_config) on a single wp-env instance; fixtures.ts
	// wipes it before every test for isolation. That per-test reset is a
	// destructive `option delete` — under concurrent workers it could land mid-
	// test in another spec file (e.g. delete the option between a save and its
	// reload-assert), creating a fresh cross-file race. workers:1 makes the
	// shared-option reset race-free; it is the precondition for true isolation
	// here, not a flake mask. (fullyParallel:false alone only serializes WITHIN
	// a file — separate files still run on separate workers.)
	workers: 1,
	retries: 0,
	reporter: 'list',
	use: {
		baseURL: `http://localhost:${ testsPort }`,
		storageState: './tests/e2e/.auth/admin.json',
		trace: 'on-first-retry',
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
	],
} );
