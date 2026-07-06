import { test as setup, expect } from '@playwright/test';
import { execFileSync } from 'child_process';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * Authentication setup, run as a Playwright *project* that every spec depends on.
 *
 * This replaces the old `globalSetup` function. globalSetup runs outside the test
 * runner, so its failures are fatal and NOT covered by `retries` — one flaky
 * login (a cold/slow wp-env exceeding the nav timeout) sank the entire E2E run.
 * As a setup project this is a real test: `retries` apply, a trace is captured on
 * retry, and it shows up in the report. We also self-heal the login so it rarely
 * needs the retry in the first place.
 *
 * wp-env's tests site default admin is admin / password.
 */

const STATE_PATH = './tests/e2e/.auth/admin.json';

// Honor WP_ENV_TESTS_PORT so login matches playwright.config.ts's baseURL when
// the tests instance runs on a non-default port (to dodge a port collision with
// another wp-env project).
const TESTS_PORT = process.env.WP_ENV_TESTS_PORT || '8889';

function wp( args: string[], stdio: 'inherit' | 'ignore' = 'inherit' ): void {
	execFileSync( 'npx', [ 'wp-env', 'run', 'tests-cli', 'wp', ...args ], { stdio } );
}

function ensureEditorUser(): void {
	try {
		wp( [ 'user', 'get', 'maestro_editor' ], 'ignore' );
	} catch ( e ) {
		wp( [
			'user',
			'create',
			'maestro_editor',
			'maestro-editor@example.com',
			'--role=editor',
			'--user_pass=password',
		] );
	}
	wp( [ 'user', 'update', 'maestro_editor', '--user_pass=password' ] );
}

function ensureAdminPassword(): void {
	wp( [ 'user', 'update', 'admin', '--user_pass=password' ] );
}

setup( 'authenticate', async ( { page } ) => {
	// wp-env can be cold on first contact in CI; give this step extra headroom.
	setup.slow();

	mkdirSync( dirname( STATE_PATH ), { recursive: true } );
	ensureAdminPassword();
	ensureEditorUser();

	const loginUrl = `http://localhost:${ TESTS_PORT }/wp-login.php`;

	// Readiness gate: wp-env reports "started" before WordPress is actually
	// serving. Poll until the login form is really there, rather than firing the
	// submit at a half-up server and timing out on the redirect.
	await expect( async () => {
		await page.goto( loginUrl, { waitUntil: 'domcontentloaded' } );
		await expect( page.locator( '#user_login' ) ).toBeVisible( { timeout: 5_000 } );
	} ).toPass( { timeout: 60_000 } );

	await page.fill( '#user_login', 'admin' );
	await page.fill( '#user_pass', 'password' );
	await Promise.all( [
		page.waitForURL( /wp-admin/, { waitUntil: 'domcontentloaded' } ),
		page.click( '#wp-submit' ),
	] );
	// Confirm we actually landed authenticated before persisting the state.
	await expect( page.locator( '#wpadminbar' ) ).toBeVisible();

	await page.context().storageState( { path: STATE_PATH } );
} );
