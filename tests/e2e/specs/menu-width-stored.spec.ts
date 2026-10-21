import { test, expect } from '../fixtures';
import { execFileSync } from 'child_process';

/**
 * Phase 28-02 — a stored `menu_width` applies while BROWSING wp-admin.
 *
 * What is asserted is the rendered geometry on ordinary admin pages, because
 * that is where this breaks in the wild: a width that leaks into folded mode
 * breaks the collapse control, one that leaks below 961px fights core's
 * auto-fold, and one without the matching content margin overlaps the page.
 *
 * Also asserted: a width another plugin forces with !important (Keel, PX; the
 * `maestro-e2e-wide-menu.php` fixture prints Keel's exact rule) wins, and an
 * unrelated edit-mode autosave keeps the stored width instead of erasing it.
 */

function wp( args: string[] ): string {
	try {
		return execFileSync( 'npx', [ 'wp-env', 'run', 'tests-cli', 'wp', ...args ], {
			encoding: 'utf8',
			stdio: [ 'ignore', 'pipe', 'ignore' ],
		} ).trim();
	} catch ( e ) {
		// `option delete` / `pluck` on an absent value exits non-zero, which is
		// the state the caller is checking for.
		return '';
	}
}

function storeWidth( width: number ): void {
	wp( [
		'eval',
		`$c = get_option( 'maestro_config', array() ); $c['menu_width'] = ${ width }; update_option( 'maestro_config', $c, false );`,
	] );
}

async function geometry( page ) {
	return page.evaluate( () => {
		const box = ( sel: string ) => {
			const el = document.querySelector( sel );
			return el ? el.getBoundingClientRect() : null;
		};
		return {
			menu: Math.round( box( '#adminmenuwrap' )!.width ),
			content: Math.round( box( '#wpcontent' )!.left ),
		};
	} );
}

const SAVE = ( url: string ) => url.includes( '/maestro/v1/config' );

test.describe( 'Phase 28-02 — stored admin menu width', () => {
	test.afterEach( () => {
		wp( [ 'option', 'delete', 'maestro_e2e_wide_menu' ] );
	} );

	test( 'no stored width: core layout, and nothing new on the page', async ( { page } ) => {
		await page.setViewportSize( { width: 1280, height: 900 } );
		await page.goto( '/wp-admin/index.php' );

		expect( await geometry( page ) ).toEqual( { menu: 160, content: 160 } );
		await expect( page.locator( 'style#maestro-admin-bar-inline-css' ) ).toHaveCount( 0 );
	} );

	test( 'a stored width applies on an ordinary admin page, with the content column after it', async ( {
		page,
	} ) => {
		storeWidth( 240 );
		await page.setViewportSize( { width: 1280, height: 900 } );
		await page.goto( '/wp-admin/index.php' );

		expect( await geometry( page ) ).toEqual( { menu: 240, content: 240 } );

		// A flyout opens where the wider menu ends, not at core's 160px.
		await page.locator( '#menu-posts > a.menu-top' ).hover();
		await expect
			.poll( () =>
				page.evaluate( () =>
					Math.round( document.querySelector( '#menu-posts .wp-submenu' )!.getBoundingClientRect().left )
				)
			)
			.toBe( 240 );
	} );

	test( 'folded still folds to core’s 36px rail', async ( { page } ) => {
		storeWidth( 240 );
		await page.setViewportSize( { width: 1280, height: 900 } );
		await page.goto( '/wp-admin/index.php' );

		// The collapse control's whole effect is this class; adding it directly
		// avoids persisting a folded preference into later specs.
		await page.evaluate( () => document.body.classList.add( 'folded' ) );
		expect( await geometry( page ) ).toEqual( { menu: 36, content: 36 } );
	} );

	test( 'at 960px and below, core’s auto-fold wins', async ( { page } ) => {
		storeWidth( 240 );
		await page.setViewportSize( { width: 900, height: 900 } );
		await page.goto( '/wp-admin/index.php' );

		expect( ( await geometry( page ) ).menu ).toBe( 36 );
	} );

	test( 'a width another plugin forces with !important wins over the stored one', async ( {
		page,
	} ) => {
		storeWidth( 240 );
		wp( [ 'option', 'update', 'maestro_e2e_wide_menu', '200' ] );
		await page.setViewportSize( { width: 1280, height: 900 } );
		await page.goto( '/wp-admin/index.php' );

		expect( await geometry( page ) ).toEqual( { menu: 200, content: 200 } );
	} );

	test( 'edit mode uses the stored width, and an unrelated save keeps it', async ( { page } ) => {
		storeWidth( 240 );
		await page.setViewportSize( { width: 1280, height: 900 } );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();

		// 28-01 measures the rendered menu, so the toolbar follows the stored width.
		await expect
			.poll( () =>
				page.evaluate( () => Math.round( document.querySelector( '.maestro-toolbar' )!.getBoundingClientRect().left ) )
			)
			.toBe( 240 );

		const panel = page.locator( '.maestro-toolbar .maestro-panel' );
		const rename = panel.locator( '.maestro-rename-input' );
		await page.locator( '#menu-posts > a.menu-top' ).click();
		await expect( rename ).toHaveValue( 'Posts' );

		const saved = page.waitForResponse(
			( r ) => SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
		);
		await rename.fill( 'Articles' );
		await rename.press( 'Enter' );
		const payload = ( await saved ).request().postDataJSON();

		// The save is full-replace; without the carry-forward it would erase the width.
		expect( payload.config.menu_width ).toBe( 240 );
		expect( wp( [ 'option', 'pluck', 'maestro_config', 'menu_width' ] ) ).toBe( '240' );
	} );
} );
