import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

/**
 * Selected-row controls prototype (.planning/DESKTOP-UX-NEXT-PASS.md).
 *
 * Opt-in with ?maestro_rows=1 while it is a prototype: rename, move and icon
 * controls sit on the selected menu row, and the toolbar keeps Visibility,
 * Reset item, the separator actions and the global controls.
 */

const POST_SAVE = ( url: string ) => url.includes( '/maestro/v1/config' );
const EDIT = '/wp-admin/index.php?maestro_edit=1&maestro_rows=1';

const posts = ( page: Page ) => page.locator( '#adminmenu > li#menu-posts' );
const strip = ( page: Page ) => page.locator( '#adminmenu .maestro-row-strip' );

function saved( page: Page ) {
	return page.waitForResponse( r => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok() );
}

async function openEditor( page: Page, url = EDIT ) {
	await page.goto( url );
	await expect( page.locator( '.maestro-toolbar' ) ).toBeAttached();
	const closeTour = page.getByRole( 'button', { name: 'Close tour' } );
	if ( await closeTour.isVisible() ) { await closeTour.click(); }
}

test.describe( 'selected-row controls, desktop', () => {
	test.use( { viewport: { width: 1280, height: 800 } } );

	test( 'selecting a row puts its controls on it and keeps focus there', async ( { page } ) => {
		await openEditor( page );
		await posts( page ).locator( '> a' ).click();

		await expect( posts( page ).locator( '> .maestro-row-strip' ) ).toBeVisible();
		await expect( posts( page ).locator( '> .maestro-row-icon' ) ).toBeVisible();
		await expect( page.locator( '.maestro-toolbar .maestro-rename-input' ) ).toBeHidden();
		await expect( page.locator( '.maestro-toolbar .maestro-move-up' ) ).toBeHidden();
		// What stays in the toolbar for now.
		await expect( page.locator( '.maestro-toolbar .maestro-vis-btn' ) ).toBeVisible();
		await expect( page.locator( '.maestro-toolbar .maestro-reset-item' ) ).toBeVisible();

		// Row, then Change icon, Rename, Move up, Move down.
		await expect( posts( page ).locator( '> a' ) ).toBeFocused();
		for ( const name of [ /Change icon of Posts/, /Rename Posts/, 'Move up', 'Move down' ] ) {
			await page.keyboard.press( 'Tab' );
			await expect( page.locator( ':focus' ) ).toHaveAccessibleName( name );
		}
	} );

	test( 'rename in place: Enter commits, Escape cancels, focus returns to the pencil', async ( { page } ) => {
		await openEditor( page );
		await posts( page ).locator( '> a' ).click();

		await strip( page ).getByRole( 'button', { name: 'Rename Posts' } ).click();
		const field = posts( page ).locator( '.maestro-row-rename-input' );
		await expect( field ).toBeFocused();
		await expect( field ).toHaveAccessibleName( 'Menu label' );
		await field.fill( 'Articles' );
		const save = saved( page );
		await field.press( 'Enter' );
		await save;
		await expect( field ).toHaveCount( 0 );
		await expect( posts( page ).locator( '.wp-menu-name' ) ).toHaveText( /^Articles/ );
		await expect( strip( page ).getByRole( 'button', { name: 'Rename Articles' } ) ).toBeFocused();

		await page.keyboard.press( 'Enter' ); // activates the pencil again
		await page.keyboard.type( 'Discarded' );
		await page.keyboard.press( 'Escape' );
		await expect( posts( page ).locator( '.wp-menu-name' ) ).toHaveText( /^Articles/ );

		await page.reload();
		await expect( posts( page ).locator( '.wp-menu-name' ) ).toHaveText( /^Articles/ );
	} );

	test( 'Enter on the selected row and F2 both start a rename', async ( { page } ) => {
		await openEditor( page );
		const row = posts( page ).locator( '> a' );
		await row.focus();
		await page.keyboard.press( 'Enter' ); // first Enter selects
		await expect( posts( page ) ).toHaveClass( /maestro-selected/ );
		await expect( posts( page ).locator( '.maestro-row-rename-input' ) ).toHaveCount( 0 );
		await page.keyboard.press( 'Enter' ); // second renames
		await expect( posts( page ).locator( '.maestro-row-rename-input' ) ).toBeFocused();
		await page.keyboard.press( 'Escape' );

		await page.locator( '#adminmenu > li#menu-media > a' ).focus();
		await page.keyboard.press( 'F2' );
		await expect( page.locator( '#adminmenu > li#menu-media' ) ).toHaveClass( /maestro-selected/ );
		await expect( page.locator( '#menu-media .maestro-row-rename-input' ) ).toBeFocused();
	} );

	test( 'the arrows move the row and keep focus for the next press', async ( { page } ) => {
		await openEditor( page );
		await page.locator( '#adminmenu > li#menu-media > a' ).click();
		const up = strip( page ).getByRole( 'button', { name: 'Move up' } );
		const save = saved( page );
		await up.click();
		await save;
		await expect( up ).toBeFocused();
		const order = await page.evaluate( () =>
			Array.from( document.querySelectorAll( '#adminmenu > li.maestro-item:not(.maestro-separator)' ) ).map( li => li.id )
		);
		expect( order.indexOf( 'menu-media' ) ).toBeLessThan( order.indexOf( 'menu-posts' ) );
	} );

	test( 'an icon only opens the picker once its row is selected', async ( { page } ) => {
		await openEditor( page );
		await posts( page ).locator( '.wp-menu-image' ).click();
		await expect( posts( page ) ).toHaveClass( /maestro-selected/ );
		await expect( page.locator( '.maestro-icon-popover' ) ).toHaveCount( 0 );

		await posts( page ).locator( '> .maestro-row-icon' ).click();
		await expect( page.locator( '.maestro-icon-popover' ) ).toBeVisible();
		await page.keyboard.press( 'Escape' );
		await expect( posts( page ).locator( '> .maestro-row-icon' ) ).toBeFocused();
	} );

	test( 'at the 160px default every control fits inside the menu', async ( { page } ) => {
		await openEditor( page );
		await posts( page ).locator( '> a' ).click();
		const menu = ( await page.locator( '#adminmenu' ).boundingBox() )!;
		for ( const b of await strip( page ).locator( 'button' ).all() ) {
			const box = ( await b.boundingBox() )!;
			expect( box.x ).toBeGreaterThanOrEqual( menu.x );
			expect( box.x + box.width ).toBeLessThanOrEqual( menu.x + menu.width );
			expect( box.height ).toBeGreaterThanOrEqual( 24 ); // WCAG 2.5.8
		}
		expect( await page.evaluate( () => document.documentElement.scrollWidth <= document.documentElement.clientWidth ) ).toBe( true );
	} );

	test( 'without the flag the shipped toolbar flow is unchanged', async ( { page } ) => {
		await openEditor( page, '/wp-admin/index.php?maestro_edit=1&maestro_rows=0' );
		await posts( page ).locator( '> a' ).click();
		await expect( strip( page ) ).toHaveCount( 0 );
		await expect( page.locator( '.maestro-toolbar .maestro-rename-input' ) ).toBeFocused();
	} );
} );

test.describe( 'selected-row controls, phone', () => {
	test.use( { viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true } );

	test( 'targets are 44px, live inside #adminmenuwrap, and leave the menu open', async ( { page } ) => {
		await openEditor( page );
		await posts( page ).locator( '> a' ).tap();
		await expect( strip( page ) ).toBeVisible();
		expect( await strip( page ).evaluate( n => !! n.closest( '#adminmenuwrap' ) ) ).toBe( true );
		await expect( page.locator( '.maestro-toolbar .maestro-rename-input' ) ).toBeHidden();
		// Selecting does not raise the on-screen keyboard.
		expect( await page.evaluate( () => document.activeElement?.tagName ) ).not.toBe( 'INPUT' );

		for ( const b of await strip( page ).locator( 'button' ).all() ) {
			const box = ( await b.boundingBox() )!;
			expect( box.width ).toBeGreaterThanOrEqual( 44 );
			expect( box.height ).toBeGreaterThanOrEqual( 44 );
		}

		await strip( page ).getByRole( 'button', { name: 'Move down' } ).tap();
		await posts( page ).locator( '> .maestro-row-icon' ).tap();
		await expect( page.locator( '.maestro-icon-popover' ) ).toBeVisible();
		expect( await page.evaluate( () => document.getElementById( 'wpwrap' )!.classList.contains( 'wp-responsive-open' ) ) ).toBe( true );
	} );
} );
