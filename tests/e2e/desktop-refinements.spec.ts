import { test, expect } from './fixtures';

test.beforeEach( async ( { page } ) => {
	await page.setViewportSize( { width: 1440, height: 900 } );
	await page.addInitScript( () => localStorage.setItem( 'maestroFirstRunDone', '1' ) );
	await page.goto( '/wp-admin/index.php?maestro_edit=1' );
} );

test( 'group edits survive closing immediately and reopening after reload', async ( { page } ) => {
	const trigger = page.locator( '.maestro-profiles-btn' );
	await trigger.click();
	const dialog = page.getByRole( 'dialog', { name: 'Visibility groups' } );
	await dialog.getByRole( 'textbox', { name: 'New group name' } ).fill( 'Desktop test' );
	await dialog.getByRole( 'button', { name: 'Add group', exact: true } ).click();
	await dialog.getByRole( 'button', { name: 'Close dialog' } ).click();
	await expect( trigger ).toBeFocused();
	await expect( page.locator( '.maestro-status-saved' ) ).toBeVisible();
	await page.reload();
	await trigger.click();
	await expect( dialog.getByRole( 'textbox', { name: 'Group name', exact: true } ) ).toHaveValue( 'Desktop test' );
} );

test( 'width saves on close, with one title and no Done action', async ( { page } ) => {
	await page.locator( '.maestro-settings-btn' ).click();
	const dialog = page.getByRole( 'dialog', { name: 'Menu width', exact: true } );
	await expect( dialog.getByRole( 'heading' ) ).toHaveText( 'Menu width' );
	await expect( dialog.getByRole( 'button', { name: 'Done' } ) ).toHaveCount( 0 );
	await dialog.getByLabel( 'Menu width in pixels' ).fill( '240' );
	await dialog.getByRole( 'button', { name: 'Close dialog' } ).click();
	await expect( page.locator( '.maestro-status-saved' ) ).toBeVisible();
	await page.reload();
	await page.locator( '.maestro-settings-btn' ).click();
	await expect( dialog.getByLabel( 'Menu width in pixels' ) ).toHaveValue( '240' );
} );

test( 'compact preview waits for explicit action and tour closes from its header', async ( { page } ) => {
	await expect( page.locator( '.maestro-toolbar select' ) ).toHaveCount( 0 );
	await page.locator( '.maestro-preview-toggle' ).click();
	await page.getByRole( 'combobox', { name: 'Preview as' } ).selectOption( 'editor' );
	await expect( page ).not.toHaveURL( /maestro_preview=/ );
	await page.keyboard.press( 'Shift+Tab' );
	await expect( page.getByRole( 'button', { name: 'Close dialog', exact: true } ) ).toBeFocused();
	await page.keyboard.press( 'Tab' );
	await expect( page.getByRole( 'combobox', { name: 'Preview as' } ) ).toBeFocused();
	await page.keyboard.press( 'Escape' );
	await expect( page.locator( '.maestro-preview-toggle' ) ).toBeFocused();
	await page.locator( '.maestro-tour-help' ).click();
	await page.getByRole( 'button', { name: 'Close tour' } ).click();
	await expect( page.locator( '.maestro-tour' ) ).toHaveCount( 0 );
	await expect( page.locator( '.maestro-tour-help' ) ).toBeFocused();
} );

test( 'save feedback never shifts toolbar controls and hover uses the menu scheme', async ( { page } ) => {
	await page.locator( '#menu-posts > a.menu-top' ).click();
	const name = page.locator( '.maestro-rename-input' );
	const before = await name.boundingBox();
	await name.fill( 'Articles' );
	await name.press( 'Enter' );
	await expect( page.locator( '.maestro-status-saved' ) ).toBeVisible();
	expect( ( await name.boundingBox() )!.x ).toBe( before!.x );
	const button = page.locator( '.maestro-profiles-btn' );
	await button.hover();
	const colours = await button.evaluate( node => {
		const current = document.querySelector( '#adminmenu li.current > a, #adminmenu li.wp-has-current-submenu > a' )!;
		return { actual: getComputedStyle( node ).backgroundColor, expected: getComputedStyle( current ).backgroundColor };
	} );
	expect( colours.actual ).toBe( colours.expected );
} );

test( 'hovering a disabled action preserves its neutral glyph colour', async ( { page } ) => {
	await page.locator( '#menu-posts > a.menu-top' ).click();
	const reset = page.locator( '.maestro-reset-item' );
	await expect( reset ).toBeDisabled();
	const colour = await reset.evaluate( node => getComputedStyle( node ).color );
	await reset.hover();
	await expect( reset ).toHaveCSS( 'color', colour );
	await expect( reset ).toHaveCSS( 'background-color', 'rgba(0, 0, 0, 0)' );
} );

test.describe( 'touch hover', () => {
	test.use( { hasTouch: true } );
	test( 'touch input does not activate desktop accent hover', async ( { page } ) => {
		await page.locator( '#menu-posts > a.menu-top' ).tap();
		const button = page.locator( '.maestro-vis-btn' );
		// An open tool keeps its solid background on purpose, so close the
		// popover with a tap outside it (Escape would return keyboard focus,
		// which shows the accent too) before checking that the tap left no
		// hover accent behind.
		await button.tap();
		await expect( button ).toHaveAttribute( 'aria-expanded', 'true' );
		await page.touchscreen.tap( 900, 600 );
		await expect( button ).toHaveAttribute( 'aria-expanded', 'false' );
		expect( await page.evaluate( () => matchMedia( '(hover: hover)' ).matches ) ).toBe( false );
		const background = await button.evaluate( node => getComputedStyle( node ).backgroundColor );
		// Core may retain a subtle translucent hover; the desktop solid accent
		// must not stick after a tap.
		expect( background ).toMatch( /^rgba\(/ );
		expect( Number( background.split( ',' )[ 3 ].replace( ')', '' ) ) ).toBeLessThan( 0.1 );
	} );
} );

async function failSaves( page ) {
	await page.route( '**/maestro/v1/config**', ( route ) => {
		if ( route.request().method() === 'POST' ) {
			return route.fulfill( { status: 500, body: '{}' } );
		}
		return route.continue();
	} );
}

test( 'a stuck save error can be dismissed without clearing the failure', async ( { page } ) => {
	await failSaves( page );
	await page.locator( '#menu-posts > a.menu-top' ).click();
	await page.locator( '.maestro-rename-input' ).fill( 'Broken' );
	await page.locator( '.maestro-rename-input' ).press( 'Enter' );
	const status = page.locator( '.maestro-toolbar .maestro-status' );
	const dismiss = page.getByRole( 'button', { name: 'Dismiss save error' } );
	await expect( status ).toHaveClass( /maestro-status-error/ );
	await expect( dismiss ).toBeVisible();

	// The × sits over the bubble's reserved trailing room, not over the page.
	const bubble = ( await status.boundingBox() )!;
	const x = ( await dismiss.boundingBox() )!;
	expect( x.x ).toBeGreaterThanOrEqual( bubble.x );
	expect( x.x + x.width ).toBeLessThanOrEqual( bubble.x + bubble.width + 1 );

	await dismiss.click();
	await expect( dismiss ).toBeHidden();
	expect( ( await status.boundingBox() )!.width ).toBeLessThanOrEqual( 1 );
	await expect( status ).toHaveText( /Save failed/ ); // still exposed to assistive tech
	expect( await page.evaluate( () => document.activeElement!.closest( '.maestro-toolbar' ) !== null ) ).toBe( true );

	// Dismissing hid the bubble, not the failure: Preview still refuses and
	// brings the error back.
	await page.locator( '.maestro-preview-toggle' ).click();
	await page.getByRole( 'combobox', { name: 'Preview as' } ).selectOption( 'editor' );
	await page.locator( '.maestro-preview-btn' ).click();
	await expect( dismiss ).toBeVisible();
	expect( page.url() ).not.toContain( 'maestro_preview' );
	await page.keyboard.press( 'Escape' );

	// A later successful save clears the error and its ×.
	await page.unroute( '**/maestro/v1/config**' );
	await page.locator( '.maestro-rename-input' ).fill( 'Fixed' );
	await page.locator( '.maestro-rename-input' ).press( 'Enter' );
	await expect( status ).toHaveClass( /maestro-status-saved/ );
	await expect( dismiss ).toBeHidden();
} );

test( 'the save-error × is a 44px target in the compact phone layout', async ( { page } ) => {
	await page.setViewportSize( { width: 390, height: 844 } );
	await page.reload();
	await failSaves( page );
	await page.locator( '#menu-posts > a.menu-top' ).click();
	await page.locator( '.maestro-rename-input' ).fill( 'Broken' );
	await page.locator( '.maestro-rename-input' ).press( 'Enter' );
	const dismiss = page.getByRole( 'button', { name: 'Dismiss save error' } );
	await expect( dismiss ).toBeVisible();
	const box = ( await dismiss.boundingBox() )!;
	expect( box.width ).toBeGreaterThanOrEqual( 44 );
	expect( box.height ).toBeGreaterThanOrEqual( 44 );
	await dismiss.click();
	await expect( dismiss ).toBeHidden();
	// Tapping it must not close core's responsive menu, which holds the toolbar.
	await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
} );
