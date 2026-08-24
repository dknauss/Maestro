import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for the in-place menu editor.
 *
 * Targets the wp-env *tests* instance (port 8889 by default), whose default admin login is
 * admin / password. The `setup` project (tests/e2e/auth.setup.ts) logs in once and
 * stores the session so specs start authenticated; every spec depends on it.
 */
const testsPort = process.env.WP_ENV_TESTS_PORT || '8889';

export default defineConfig( {
	testDir: './tests/e2e',
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
	// CI absorbs genuine flakes (network/timing races in wp-env) with two
	// retries; local runs stay strict at zero so a real break surfaces
	// immediately.
	retries: process.env.CI ? 2 : 0,
	reporter: 'list',
	use: {
		baseURL: `http://localhost:${ testsPort }`,
		/*
		 * retain-on-failure, NOT on-first-retry.
		 *
		 * The claim this replaces — that on-first-retry keeps a flaky failure
		 * diagnosable — is false for the case that matters. When attempt 0 fails
		 * and the first retry passes (the green-flake this suite actually
		 * produces), on-first-retry records the RETRY: the attempt that
		 * succeeded. The failing execution is never traced, so the artefact shows
		 * the run that worked and explains nothing.
		 *
		 * retain-on-failure traces every attempt and keeps only the ones that
		 * failed, so attempt 0's trace survives a recovered retry. It costs
		 * recording overhead on every test; watch the E2E job duration, since
		 * #174 bounded CI runtime deliberately, and reconsider if it moves much.
		 *
		 * Caught in review on #182.
		 */
		trace: 'retain-on-failure',
		// Several specs sign in as a SECOND user mid-test (cascade-hide,
		// editor.spec, hidden-users) to assert what that user's own sidebar
		// renders. A wp-env login is the slowest navigation in the suite, and on
		// a loaded machine it can exceed Playwright's 30s default — which
		// presents as an unrelated spec failing, moving between runs.
		// auth.setup.ts already carried a 90s budget for exactly this reason;
		// this extends the same protection to every navigation instead of
		// leaving each secondary login to rediscover it. Raising a ceiling does
		// not mask a genuine failure — a login that is actually broken still
		// fails, just later.
		navigationTimeout: 60000,
	},
	projects: [
		// Runs first (every spec depends on it) and unauthenticated — it is what
		// creates the stored session. Shares chromium's device profile so the
		// context that generates the session matches the one that consumes it;
		// storageState lives on the chromium project only, so this logs in fresh.
		{ name: 'setup', testMatch: /auth\.setup\.ts/, use: { ...devices['Desktop Chrome'] } },
		{
			name: 'chromium',
			dependencies: [ 'setup' ],
			use: {
				...devices['Desktop Chrome'],
				storageState: './tests/e2e/.auth/admin.json',
			},
		},
	],
} );
