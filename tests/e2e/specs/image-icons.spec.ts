import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { execFileSync } from 'child_process';

/**
 * Re-icon preview on items whose NATURAL icon is an image, not a dashicon.
 *
 * Third-party plugins mostly ship image icons: UpdraftPlus and miniOrange SAML
 * pass a URL (core prints an <img> in div.wp-menu-image); Yoast SEO and Smush
 * pass a base64 SVG data-URI (core paints an inline background-image, and
 * wp-admin/js/svg-painter.js caches that SVG and repaints it — with
 * `!important` — on every hover of the row). Both used to defeat the live
 * preview: the <img> stayed on top of the new icon, and the next hover put the
 * plugin's own logo back.
 *
 * `maestro-e2e-image-icons.php` (a gated mu-plugin, mapped in .wp-env.json)
 * registers one item of each shape, inert unless `maestro_e2e_image_icons` is
 * set; only this spec turns it on.
 */

const POST_SAVE = ( url: string ) => url.includes( '/maestro/v1/config' );

function wp( args: string[] ): void {
	try {
		execFileSync( 'npx', [ 'wp-env', 'run', 'tests-cli', 'wp', ...args ], { stdio: 'ignore' } );
	} catch ( e ) {
		// `option delete` on an absent option exits non-zero — the desired state.
	}
}

async function pickIcon( page: Page, slug: string, cell: ( popover: ReturnType<Page['locator']> ) => Promise<void> ) {
	await page.locator( `li.maestro-item[data-maestro-slug="${ slug }"] > a.menu-top` ).click();
	const panel = page.locator( '.maestro-toolbar .maestro-panel' );
	await expect( panel ).toBeVisible();
	await panel.locator( '.maestro-icon-btn' ).click();
	const popover = page.locator( '.maestro-icon-popover' );
	await expect( popover ).toBeVisible();
	const saved = page.waitForResponse(
		r => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
	);
	await cell( popover );
	await saved;
}

// Hover the row and leave it again, past svg-painter's 100 ms mouseleave delay,
// so any cached repaint has had its chance to fire.
async function hoverAndLeave( page: Page, slug: string ) {
	await page.locator( `li.maestro-item[data-maestro-slug="${ slug }"] > a.menu-top` ).hover();
	await page.waitForTimeout( 250 );
	await page.locator( '#wpbody-content' ).hover( { position: { x: 400, y: 300 } } );
	await page.waitForTimeout( 250 );
}

const image = ( page: Page, slug: string ) =>
	page.locator( `li.maestro-item[data-maestro-slug="${ slug }"] .wp-menu-image` );

test.describe( 'Re-icon preview on image-icon items', () => {

	test.beforeEach( () => {
		wp( [ 'option', 'update', 'maestro_e2e_image_icons', '1' ] );
	} );

	test.afterEach( () => {
		wp( [ 'option', 'delete', 'maestro_e2e_image_icons' ] );
	} );

	test( 'a dashicon replaces a URL icon: the natural <img> is removed', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		const img = image( page, 'maestro-e2e-url-icon' );
		await expect( img.locator( 'img' ) ).toHaveCount( 1 ); // Core's URL-icon markup.

		await pickIcon( page, 'maestro-e2e-url-icon', p => p.locator( '.maestro-icon-cell.dashicons-book' ).click() );

		await expect( img ).toHaveClass( /dashicons-book/ );
		await expect( img.locator( 'img' ) ).toHaveCount( 0 );
	} );

	test( 'a dashicon replaces an SVG icon and survives svg-painter hover repaints', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		const slug = 'maestro-e2e-svg-icon';
		const img  = image( page, slug );
		await expect( img ).toHaveClass( /\bsvg\b/ ); // Core's data-URI markup.

		await pickIcon( page, slug, p => p.locator( '.maestro-icon-cell.dashicons-book' ).click() );
		await hoverAndLeave( page, slug );

		await expect( img ).toHaveClass( /dashicons-book/ );
		expect( await img.evaluate( el => getComputedStyle( el ).backgroundImage ) ).toBe( 'none' );
	} );

	test( 'a Bootstrap icon replaces an SVG icon and the plugin logo does not come back on hover', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		const slug     = 'maestro-e2e-svg-icon';
		const img      = image( page, slug );
		const natural  = await img.evaluate( el => getComputedStyle( el ).backgroundImage );
		expect( natural ).toContain( 'data:image/svg+xml;base64' );

		await pickIcon( page, slug, async p => {
			await p.getByRole( 'tab', { name: 'Bootstrap' } ).click();
			await p.getByRole( 'button', { name: 'Gear', exact: true } ).click();
		} );
		await hoverAndLeave( page, slug );

		const painted = await img.evaluate( el => getComputedStyle( el ).backgroundImage );
		expect( painted ).toContain( 'data:image/svg+xml;base64' );
		expect( painted ).not.toBe( natural );
	} );
} );
