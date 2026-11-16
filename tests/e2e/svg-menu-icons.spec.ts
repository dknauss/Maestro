import { test, expect } from './fixtures';

/**
 * WordPress 7.2 draws many core menu icons as an inline <svg> inside
 * div.wp-menu-image.svg-icon, in place of the Dashicons font glyph. $menu[6]
 * still holds the dashicons-* value; core maps it only at render time.
 *
 * The live icon preview must not leave that <svg> behind when the icon
 * changes, and Reset must bring core's own markup back, not the old font
 * glyph. On WordPress before 7.2 there is no inline <svg> to test, so these
 * specs skip; CI runs them in the "WordPress next" job.
 *
 * Dev note: https://make.wordpress.org/core/2026/11/05/svg-icons-in-the-admin-bar-and-menu-in-wordpress-7-2/
 */

const POST_SAVE = ( url: string ) => url.includes( '/maestro/v1/config' );

test.describe( 'Inline SVG menu icons (WordPress 7.2+)', () => {
	test.beforeEach( async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		const inline = await page.locator( '#menu-posts .wp-menu-image.svg-icon svg' ).count();
		test.skip( 0 === inline, 'This WordPress draws menu icons with the Dashicons font.' );
	} );

	async function openPicker( page ) {
		await page.locator( '#menu-posts > a.menu-top' ).click();
		await page.locator( '.maestro-toolbar .maestro-panel .maestro-icon-btn' ).click();
		const picker = page.locator( '.maestro-icon-popover' );
		await expect( picker ).toBeVisible();
		return picker;
	}

	test( 'No icon clears core\'s inline SVG from the preview', async ( { page } ) => {
		const picker = await openPicker( page );
		const saved = page.waitForResponse( r => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok() );
		await picker.locator( '.maestro-icon-none' ).click();
		await saved;

		const img = page.locator( '#menu-posts .wp-menu-image' );
		await expect( img.locator( 'svg' ) ).toHaveCount( 0 );
		await expect( img ).not.toHaveClass( /\bsvg-icon\b/ );
	} );

	test( 'a picked Dashicon replaces the SVG, and Reset brings core\'s SVG back', async ( { page } ) => {
		const img = page.locator( '#menu-posts .wp-menu-image' );
		const original = await img.innerHTML();

		const picker = await openPicker( page );
		const saved = page.waitForResponse( r => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok() );
		await picker.locator( '.maestro-icon-cell[data-maestro-icon="dashicons-book"]' ).click();
		await saved;

		await expect( img ).toHaveClass( /dashicons-book/ );
		await expect( img.locator( 'svg' ) ).toHaveCount( 0 );
		await expect( img ).not.toHaveClass( /\bsvg-icon\b/ );

		// Reset Item: the pristine icon is dashicons-admin-post, which core
		// draws as an SVG on 7.2. The preview must show that SVG, not the font pin.
		const reset = page.waitForResponse( r => POST_SAVE( r.url() ) && r.ok() );
		await page.locator( '.maestro-toolbar .maestro-panel .maestro-reset-item' ).click();
		await reset;

		await expect( img ).toHaveClass( /\bsvg-icon\b/ );
		await expect( img ).not.toHaveClass( /dashicons-book/ );
		await expect( img.locator( 'svg' ) ).toHaveCount( 1 );
		expect( await img.innerHTML() ).toBe( original );
	} );

	test( 'a picked SVG icon replaces core\'s inline SVG', async ( { page } ) => {
		const picker = await openPicker( page );
		await picker.getByRole( 'tab', { name: 'Bootstrap' } ).click();
		const panel = picker.locator( '#maestro-panel-bootstrap' );
		await expect.poll( () => panel.locator( '.maestro-icon-cell' ).count() ).toBeGreaterThan( 300 );

		const saved = page.waitForResponse( r => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok() );
		await panel.getByRole( 'button', { name: 'Gear', exact: true } ).click();
		await saved;

		const img = page.locator( '#menu-posts .wp-menu-image' );
		await expect( img.locator( 'svg' ) ).toHaveCount( 0 );
		await expect( img ).toHaveClass( /(^|\s)svg(\s|$)/ );
		await expect( img ).not.toHaveClass( /\bsvg-icon\b/ );
		await expect( page.locator( '#menu-posts' ) ).toHaveClass( /\bmaestro-mask-icon\b/ );
	} );
} );
