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
const EDITOR_STATE_PATH = './tests/e2e/.auth/editor.json';

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

/**
 * Fill and submit the login form on a page already showing it.
 *
 * Shared so the admin and editor sessions are created the same way — a second
 * hand-rolled login helper is how the secondary logins drifted apart from this
 * file's hard-won budget in the first place.
 */
async function submitLogin( page, login: string, loginUrl: string ): Promise< void > {
	/*
	 * The whole login is retried, not just the initial page load.
	 *
	 * The readiness gate below proves WordPress is serving, but a fresh context
	 * can still meet a cold container: the first version of the editor login
	 * here inherited exactly that and died on
	 * `page.waitForURL: Timeout 60000ms exceeded`. Short per-attempt timeouts let
	 * a hung navigation fail fast and be retried, rather than one attempt
	 * consuming the entire budget — the same reasoning as the gate itself.
	 */
	await expect( async () => {
		await page.goto( loginUrl, {
			waitUntil: 'domcontentloaded',
			timeout: 15_000,
		} );
		await expect( page.locator( '#user_login' ) ).toBeVisible( { timeout: 5_000 } );
		await page.fill( '#user_login', login );
		await page.fill( '#user_pass', 'password' );
		await Promise.all( [
			page.waitForURL( /wp-admin/, {
				waitUntil: 'domcontentloaded',
				timeout: 20_000,
			} ),
			page.click( '#wp-submit' ),
		] );
	} ).toPass( { timeout: 120_000 } );

	// Confirm we actually landed authenticated before persisting the state.
	await expect( page.locator( '#wpadminbar' ) ).toBeVisible();
}

setup( 'authenticate', async ( { page, browser } ) => {
	/*
	 * Explicit, not setup.slow().
	 *
	 * slow() triples the 30s default to 90s, which is less than this step can now
	 * legitimately need: two logins, each retried for up to 120s against a cold
	 * container. A 90s ceiling would abort the recovery it exists to allow.
	 */
	setup.setTimeout( 300_000 );

	mkdirSync( dirname( STATE_PATH ), { recursive: true } );
	ensureAdminPassword();
	ensureEditorUser();

	const loginUrl = `http://localhost:${ TESTS_PORT }/wp-login.php`;

	// The readiness gate that used to sit here — poll until the login form is
	// really there, because wp-env reports "started" before WordPress is serving
	// — is now inside submitLogin(), which retries the load AND the submit. Two
	// nested retry loops would have stacked their budgets for no extra coverage.

	await submitLogin( page, 'admin', loginUrl );
	await page.context().storageState( { path: STATE_PATH } );

	/*
	 * The EDITOR session, stored here rather than performed in each spec.
	 *
	 * Three tests used to sign in as maestro_editor mid-test to assert what that
	 * user's own sidebar renders. On a cold CI container that login exceeded even
	 * the 60s navigationTimeout — measured at ~66s on run 32790711889, after a
	 * raised per-test budget had already moved the failure from 31.5s — while the
	 * retry took 4.6s because the container was warm by then.
	 *
	 * Budgets could not fix that; they only moved the wall. This removes the
	 * operation instead. The one login that remains happens here, where the
	 * readiness gate above has already waited for WordPress to actually serve,
	 * and where a failure is a retried setup rather than a spec timing out
	 * somewhere unrelated.
	 */
	const editorContext = await browser.newContext();
	const editorPage = await editorContext.newPage();
	await submitLogin( editorPage, 'maestro_editor', loginUrl );
	await editorContext.storageState( { path: EDITOR_STATE_PATH } );
	await editorContext.close();
} );
