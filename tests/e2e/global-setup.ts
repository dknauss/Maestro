import { chromium, FullConfig } from '@playwright/test';
import { execFileSync } from 'child_process';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * Log in to the wp-env tests instance once and save the storage state so every
 * spec starts authenticated. wp-env's tests site default credentials are
 * admin / password.
 */
function ensureEditorUser() {
	try {
		execFileSync( 'npx', [ 'wp-env', 'run', 'tests-cli', 'wp', 'user', 'get', 'maestro_editor' ], { stdio: 'ignore' } );
	} catch ( e ) {
		execFileSync(
			'npx',
			[
				'wp-env',
				'run',
				'tests-cli',
				'wp',
				'user',
				'create',
				'maestro_editor',
				'maestro-editor@example.com',
				'--role=editor',
				'--user_pass=password',
			],
			{ stdio: 'inherit' }
		);
	}
	execFileSync( 'npx', [ 'wp-env', 'run', 'tests-cli', 'wp', 'user', 'update', 'maestro_editor', '--user_pass=password' ], { stdio: 'inherit' } );
}

function ensureAdminPassword() {
	execFileSync( 'npx', [ 'wp-env', 'run', 'tests-cli', 'wp', 'user', 'update', 'admin', '--user_pass=password' ], { stdio: 'inherit' } );
}

async function globalSetup( config: FullConfig ) {
	const statePath = './tests/e2e/.auth/admin.json';
	mkdirSync( dirname( statePath ), { recursive: true } );
	ensureAdminPassword();
	ensureEditorUser();

	const browser = await chromium.launch();
	const page = await browser.newPage();

	await page.goto( 'http://localhost:8889/wp-login.php' );
	await page.fill( '#user_login', 'admin' );
	await page.fill( '#user_pass', 'password' );
	await page.click( '#wp-submit' );
	await page.waitForURL( /wp-admin/ );

	await page.context().storageState( { path: statePath } );
	await browser.close();
}

export default globalSetup;
