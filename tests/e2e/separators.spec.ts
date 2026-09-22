import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * Separator management: move, add, and remove the admin menu's separators.
 *
 * Core prints each separator as an id-less li.wp-menu-separator. In edit mode
 * they become selectable rows (they used to be collapsed to zero height and
 * left out of the saved order, which is how one reorder used to wipe every
 * one of them: see OrderingTest).
 */

const POST_SAVE = ( url: string ) => url.includes( '/maestro/v1/config' );

const sepLi = ( page: Page, slug: string ) =>
	page.locator( `#adminmenu > li.maestro-separator[data-maestro-slug="${ slug }"]` );

// Top-level slugs in rendered order, separators included.
const topOrder = ( page: Page ) =>
	page.evaluate( () =>
		Array.from( document.querySelectorAll( '#adminmenu > li.maestro-item[data-maestro-slug]' ) ).map(
			( li ) => ( li as HTMLElement ).dataset.maestroSlug as string
		)
	);

function saved( page: Page ) {
	return page.waitForResponse( r => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok() );
}

test.describe( 'Menu separators', () => {

	test( 'separators are visible, selectable rows with only move and remove controls', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		const sep = sepLi( page, 'separator1' );
		await expect( sep ).toBeVisible();
		expect( ( await sep.boundingBox() )!.height ).toBeGreaterThan( 4 );
		await expect( sep ).not.toHaveAttribute( 'aria-hidden', 'true' );

		// Keyboard-selectable like any row.
		await sep.focus();
		await page.keyboard.press( 'Enter' );
		await expect( sep ).toHaveClass( /maestro-selected/ );

		const panel = page.locator( '.maestro-toolbar .maestro-panel' );
		await expect( panel.locator( '.maestro-remove-separator' ) ).toBeVisible();
		await expect( panel.locator( '.maestro-move-up' ) ).toBeVisible();
		await expect( panel.locator( '.maestro-rename-input' ) ).toBeHidden();
		await expect( panel.locator( '.maestro-icon-btn' ) ).toBeHidden();
		await expect( panel.locator( '.maestro-vis-btn' ) ).toBeHidden();
		await expect( panel.locator( '.maestro-add-separator' ) ).toBeHidden();
	} );

	test( 'moving an item keeps every core separator, and a separator can be moved too', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php' );
		const naturalCount = await page.locator( '#adminmenu > li.wp-menu-separator' ).count();
		expect( naturalCount ).toBeGreaterThan( 0 );

		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await page.locator( '#menu-media > a.menu-top' ).click();
		let save = saved( page );
		await page.locator( '.maestro-panel .maestro-move-up' ).click();
		await save;

		await sepLi( page, 'separator2' ).click();
		save = saved( page );
		await page.locator( '.maestro-panel .maestro-move-up' ).click();
		const payload = ( await save ).request().postDataJSON();
		const order: string[] = payload.config.top_order;
		expect( order ).toContain( 'separator1' );
		expect( order.indexOf( 'separator2' ) ).toBeLessThan( order.length - 1 );

		const expected = await topOrder( page );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		expect( await topOrder( page ) ).toEqual( expected );

		// Outside edit mode too: no separator was lost to the old sink-to-the-end.
		await page.goto( '/wp-admin/index.php' );
		await expect( page.locator( '#adminmenu > li.wp-menu-separator' ) ).toHaveCount( naturalCount );
	} );

	test( 'add a separator below an item, then remove it', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		await page.locator( '#menu-posts > a.menu-top' ).click();
		const save = saved( page );
		await page.locator( '.maestro-panel .maestro-add-separator' ).click();
		const payload = ( await save ).request().postDataJSON();

		const ids: string[] = payload.config.separators;
		expect( ids ).toHaveLength( 1 );
		expect( ids[ 0 ] ).toMatch( /^separator-maestro-[a-z0-9]+$/ );
		const order: string[] = payload.config.top_order;
		expect( order[ order.indexOf( 'edit.php' ) + 1 ] ).toBe( ids[ 0 ] );

		// The new row is selected, so a follow-up move or remove needs no hunting.
		await expect( sepLi( page, ids[ 0 ] ) ).toHaveClass( /maestro-selected/ );

		// It renders for real, in place, outside edit mode.
		await page.goto( '/wp-admin/index.php' );
		await expect( page.locator( '#menu-posts + li.wp-menu-separator' ) ).toHaveCount( 1 );

		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await sepLi( page, ids[ 0 ] ).click();
		const removed = saved( page );
		await page.locator( '.maestro-panel .maestro-remove-separator' ).click();
		const after = ( await removed ).request().postDataJSON();
		expect( after.config.separators ?? [] ).toEqual( [] );
		expect( after.config.removed_separators ?? [] ).toEqual( [] );
		await expect( sepLi( page, ids[ 0 ] ) ).toHaveCount( 0 );
	} );

	test( 'removing a core separator persists, and Reset All brings it back', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		await sepLi( page, 'separator2' ).click();
		const save = saved( page );
		await page.locator( '.maestro-panel .maestro-remove-separator' ).click();
		const payload = ( await save ).request().postDataJSON();
		expect( payload.config.removed_separators ).toEqual( [ 'separator2' ] );

		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( sepLi( page, 'separator2' ) ).toHaveCount( 0 );

		page.once( 'dialog', d => d.accept() );
		await page.locator( '.maestro-reset-all' ).click();
		await expect( sepLi( page, 'separator2' ) ).toHaveCount( 1 );
	} );
} );
