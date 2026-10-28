import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * Stale cached editor files (v1.11 Phase 34). Each editor file states its own
 * release; the page states the server's. A browser running an older copy
 * (a plugin stripped ?ver= and the host caches static files for years) gets a
 * notice with a Reload button that refetches the files past the cache.
 *
 * Route interception stands in for the stale cache: it rewrites the file's
 * build stamp on the way in.
 */

const EDIT = '/wp-admin/index.php?maestro_edit=1';

async function serveStale( page: Page, pattern: string, from: RegExp, to: string ) {
	let served = 0;
	await page.route( pattern, async route => {
		served++;
		// Only the first load is stale; the Reload button's refetch and the
		// page reload after it get the real file, as a cleared cache would.
		if ( served > 1 ) { return route.continue(); }
		const response = await route.fetch();
		const body = ( await response.text() ).replace( from, to );
		return route.fulfill( { response, body } );
	} );
}

test.describe( 'Stale editor files notice', () => {

	test( 'no notice when the files match the server', async ( { page } ) => {
		await page.goto( EDIT );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
		await expect( page.locator( '.maestro-stale-notice' ) ).toHaveCount( 0 );
	} );

	test( 'a stale maestro.js shows the notice, and Reload clears it', async ( { page } ) => {
		await serveStale( page, '**/assets/maestro.js*', /window\.maestroBuild = '[0-9.]+';/, "window.maestroBuild = '0.0.1';" );
		await page.goto( EDIT );

		const notice = page.locator( '.maestro-stale-notice' );
		await expect( notice ).toBeVisible();
		await expect( notice ).toContainText( 'older version of Maestro' );
		// Editing still works under the notice.
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();

		const reloaded = page.waitForEvent( 'load' );
		await notice.getByRole( 'button', { name: 'Reload' } ).click();
		await reloaded;
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
		await expect( page.locator( '.maestro-stale-notice' ) ).toHaveCount( 0 );
	} );

	test( 'a stale maestro.css with a current maestro.js shows the notice', async ( { page } ) => {
		await serveStale( page, '**/assets/maestro.css*', /--maestro-build: "[0-9.]+";/, '' );
		await page.goto( EDIT );
		await expect( page.locator( '.maestro-stale-notice' ) ).toBeVisible();
	} );

	test( 'a stale maestro-logic.js shows the notice', async ( { page } ) => {
		await serveStale( page, '**/assets/maestro-logic.js*', /window\.maestroLogicBuild = '[0-9.]+';/, '' );
		await page.goto( EDIT );
		await expect( page.locator( '.maestro-stale-notice' ) ).toBeVisible();
	} );

	test( 'the check never runs outside edit mode', async ( { page } ) => {
		await serveStale( page, '**/assets/maestro.js*', /window\.maestroBuild = '[0-9.]+';/, "window.maestroBuild = '0.0.1';" );
		await page.goto( '/wp-admin/index.php' );
		await expect( page.locator( '#adminmenu' ) ).toBeVisible();
		await expect( page.locator( '.maestro-stale-notice' ) ).toHaveCount( 0 );
	} );
} );
