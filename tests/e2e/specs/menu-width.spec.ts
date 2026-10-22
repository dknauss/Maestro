import { test, expect } from '../fixtures';
import { execFileSync } from 'child_process';

/**
 * Phase 28-03 — the menu-width controls: the Settings dialog field and the
 * handle on the menu's edge.
 *
 * The assertion that matters most is the ordinary admin page after a reload:
 * that is the difference between this feature and a CSS tweak inside edit mode.
 */

function wp( args: string[] ): string {
	try {
		return execFileSync( 'npx', [ 'wp-env', 'run', 'tests-cli', 'wp', ...args ], {
			encoding: 'utf8',
			stdio: [ 'ignore', 'pipe', 'ignore' ],
		} ).trim();
	} catch ( e ) {
		// `option delete` / `pluck` on an absent value exits non-zero.
		return '';
	}
}

const SAVE = ( url: string ) => url.includes( '/maestro/v1/config' );

// Waits for the save that drops the width, not just the next save: an earlier
// change may already have one queued.
function savedWithoutWidth( page ) {
	return page.waitForResponse( ( r ) =>
		SAVE( r.url() ) && r.request().method() === 'POST' && r.ok() &&
		! ( 'menu_width' in ( r.request().postDataJSON()?.config ?? {} ) )
	);
}

async function menuWidth( page ) {
	return page.evaluate( () => Math.round( document.getElementById( 'adminmenuwrap' )!.getBoundingClientRect().width ) );
}

async function openSettings( page ) {
	await page.locator( '.maestro-toolbar .maestro-settings-btn' ).click();
	const dialog = page.getByRole( 'dialog', { name: 'Menu settings' } );
	await expect( dialog ).toBeVisible();
	return dialog;
}

test.describe( 'Phase 28-03 — menu width controls', () => {
	test.beforeEach( async ( { page } ) => {
		await page.setViewportSize( { width: 1280, height: 900 } );
	} );

	test.afterEach( () => {
		wp( [ 'option', 'delete', 'maestro_e2e_wide_menu' ] );
	} );

	test( 'the field previews live, saves, and applies on an ordinary page after reload', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		const dialog = await openSettings( page );

		await expect( dialog.getByText( 'Using the WordPress default (160px).' ) ).toBeVisible();
		// Opened from the toolbar's right zone, the dialog must stay on screen
		// rather than push the page into a sideways scroll.
		expect(
			await page.evaluate( () => document.documentElement.scrollWidth <= document.documentElement.clientWidth )
		).toBe( true );
		await expect( dialog.getByRole( 'button', { name: 'Use default' } ) ).toBeDisabled();

		const saved = page.waitForResponse( ( r ) => SAVE( r.url() ) && r.request().method() === 'POST' && r.ok() );
		await dialog.getByLabel( 'Menu width in pixels' ).fill( '240' );

		// Live, before the save lands: the menu and the toolbar both move.
		await expect.poll( () => menuWidth( page ) ).toBe( 240 );
		await expect
			.poll( () =>
				page.evaluate( () => Math.round( document.querySelector( '.maestro-toolbar' )!.getBoundingClientRect().left ) )
			)
			.toBe( 240 );
		await expect( dialog.getByRole( 'slider', { name: 'Menu width' } ) ).toHaveValue( '240' );

		expect( ( await saved ).request().postDataJSON().config.menu_width ).toBe( 240 );

		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		expect( await menuWidth( page ) ).toBe( 240 );

		await page.goto( '/wp-admin/edit.php' );
		expect( await menuWidth( page ) ).toBe( 240 );

		// Folding still works at a custom width.
		await page.evaluate( () => document.body.classList.add( 'folded' ) );
		expect( await menuWidth( page ) ).toBe( 36 );
	} );

	test( 'the slider is keyboard-operable and Use default clears the width', async ( { page } ) => {
		wp( [ 'eval', "update_option( 'maestro_config', array( 'menu_width' => 200 ), false );" ] );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		const dialog = await openSettings( page );

		const slider = dialog.getByRole( 'slider', { name: 'Menu width' } );
		await expect( slider ).toBeFocused();
		await expect( slider ).toHaveAttribute( 'aria-valuetext', '200 pixels' );
		await page.keyboard.press( 'ArrowRight' );
		await expect.poll( () => menuWidth( page ) ).toBe( 201 );

		const saved = savedWithoutWidth( page );
		await dialog.getByRole( 'button', { name: 'Use default' } ).click();
		await expect.poll( () => menuWidth( page ) ).toBe( 160 );
		await saved;

		// Escape closes and returns focus to the toolbar button.
		await page.keyboard.press( 'Escape' );
		await expect( dialog ).toHaveCount( 0 );
		await expect( page.locator( '.maestro-toolbar .maestro-settings-btn' ) ).toBeFocused();
	} );

	test( 'the edge handle resizes by drag and by keyboard', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		const handle = page.getByRole( 'separator', { name: 'Resize menu' } );
		await expect( handle ).toBeVisible();
		await expect( handle ).toHaveAttribute( 'aria-valuenow', '160' );

		const box = ( await handle.boundingBox() )!;
		await page.mouse.move( box.x + box.width / 2, box.y + 100 );
		await page.mouse.down();
		await page.mouse.move( 260, box.y + 100, { steps: 5 } );
		await page.mouse.up();
		await expect.poll( () => menuWidth( page ) ).toBe( 260 );
		await expect( handle ).toHaveAttribute( 'aria-valuenow', '260' );

		await handle.focus();
		await page.keyboard.press( 'Shift+ArrowLeft' );
		await expect.poll( () => menuWidth( page ) ).toBe( 240 );
		await page.keyboard.press( 'End' );
		await expect.poll( () => menuWidth( page ) ).toBe( 320 );

		const saved = savedWithoutWidth( page );
		await page.keyboard.press( 'Home' );
		await expect.poll( () => menuWidth( page ) ).toBe( 160 );
		await saved;
	} );

	test( 'Reset Item leaves the width alone', async ( { page } ) => {
		wp( [ 'eval', "update_option( 'maestro_config', array( 'menu_width' => 240, 'items' => array( 'edit.php' => array( 'title' => 'Articles' ) ) ), false );" ] );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		await page.locator( '#menu-posts > a.menu-top' ).click();
		const saved = page.waitForResponse( ( r ) => SAVE( r.url() ) && r.request().method() === 'POST' && r.ok() );
		await page.locator( '.maestro-toolbar .maestro-reset-item' ).click();
		const config = ( await saved ).request().postDataJSON().config;

		expect( config.menu_width ).toBe( 240 );
		expect( await menuWidth( page ) ).toBe( 240 );
	} );

	test( 'when another plugin forces the width, the dialog says so', async ( { page } ) => {
		wp( [ 'option', 'update', 'maestro_e2e_wide_menu', '200' ] );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		const dialog = await openSettings( page );

		await dialog.getByLabel( 'Menu width in pixels' ).fill( '260' );
		await expect( dialog.getByText( /Another plugin sets the menu width \(200px\)/ ) ).toBeVisible();
		expect( await menuWidth( page ) ).toBe( 200 );
	} );

	test( 'when another plugin forces the width, the edge handle saves nothing', async ( { page } ) => {
		wp( [ 'option', 'update', 'maestro_e2e_wide_menu', '200' ] );
		const posts: string[] = [];
		page.on( 'request', ( r ) => { if ( SAVE( r.url() ) && r.method() === 'POST' ) { posts.push( r.url() ); } } );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		const handle = page.getByRole( 'separator', { name: 'Resize menu' } );
		await handle.focus();
		await page.keyboard.press( 'Shift+ArrowRight' );
		await expect( handle ).toHaveAttribute( 'aria-valuenow', '160' );
		await expect( page.locator( '#a11y-speak-polite' ) ).toContainText( /Another plugin sets the menu width/ );
		// Longer than the autosave debounce.
		await page.waitForTimeout( 800 );
		expect( posts ).toHaveLength( 0 );
	} );

	test( 'Reset All clears the width', async ( { page } ) => {
		wp( [ 'eval', "update_option( 'maestro_config', array( 'menu_width' => 240 ), false );" ] );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		expect( await menuWidth( page ) ).toBe( 240 );

		page.once( 'dialog', ( d ) => d.accept() );
		// Reset All reloads the page once the DELETE lands.
		const reloaded = page.waitForEvent( 'load' );
		await page.locator( '.maestro-toolbar .maestro-reset-all' ).click();
		await reloaded;
		expect( await menuWidth( page ) ).toBe( 160 );
		expect( wp( [ 'option', 'get', 'maestro_config', '--format=json' ] ) ).not.toContain( 'menu_width' );
	} );

	test( 'the edge handle is hidden below 961px', async ( { page } ) => {
		await page.setViewportSize( { width: 900, height: 900 } );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-width-handle' ) ).toBeHidden();
	} );

	for ( const width of [ 160, 240, 320 ] ) {
		test( `RTL toolbar clears the right menu at ${ width }px`, async ( { page } ) => {
			wp( [ 'option', 'update', 'maestro_config', JSON.stringify( { menu_width: width } ), '--format=json' ] );
			await page.goto( '/wp-admin/index.php?maestro_edit=1' );
			await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
			await page.evaluate( () => {
				document.body.classList.add( 'rtl' );
				document.documentElement.dir = 'rtl';
			} );
			await expect.poll( () => page.evaluate( () => {
				const bar = document.querySelector( '.maestro-toolbar' )!.getBoundingClientRect();
				return { left: Math.round( bar.left ), right: Math.round( bar.right ) };
			} ) ).toEqual( { left: 0, right: 1280 - width } );
		} );
	}

	for ( const width of [ 375, 782 ] ) {
		test( `mobile settings preserve the open overlay at ${ width }px`, async ( { page } ) => {
			await page.setViewportSize( { width, height: 900 } );
			wp( [ 'option', 'update', 'maestro_config', '{"menu_width":240}', '--format=json' ] );
			await page.goto( '/wp-admin/index.php?maestro_edit=1' );
			const menu = page.locator( '#adminmenu' );
			await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
			await expect( menu ).toBeVisible();
			const dialog = await openSettings( page );
			await dialog.getByLabel( 'Menu width in pixels' ).click();
			await dialog.getByLabel( 'Menu width in pixels' ).fill( '260' );
			await expect( menu ).toBeVisible();
			await page.keyboard.press( 'Tab' );
			await expect( menu ).toBeVisible();
			await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
			await page.keyboard.press( 'Escape' );
			await expect( dialog ).toHaveCount( 0 );
			await expect( menu ).toBeVisible();
			await expect( page.locator( '.maestro-settings-btn' ) ).toBeFocused();
			await page.locator( '#wp-admin-bar-menu-toggle a' ).click();
			await expect( menu ).toBeHidden();
			await page.locator( '#wp-admin-bar-menu-toggle a' ).click();
			await expect( menu ).toBeVisible();
		} );
	}

} );
