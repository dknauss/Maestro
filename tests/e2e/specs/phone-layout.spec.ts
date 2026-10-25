import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

/**
 * The editor on a phone, held either way.
 *
 * Found on a small iPhone in WordPress Playground: the Help tour went from
 * step 1 to 2 and then straight to the last one, the toolbar took a third of
 * the screen upright, and on its side the phone was worse.
 *
 * The tour and the popovers fail for the reason UX-10 documents in
 * mobile-edit-mode.spec.ts. Core closes the responsive menu on any click
 * outside the hamburger and #adminmenuwrap, and closing it takes the toolbar
 * with it. The coachmark and the icon and Visibility popovers were mounted on
 * <body>, so a tap inside them closed the menu, and every tour step after
 * that found its control unrendered and was skipped. Real clicks, because
 * core's handler returns early unless the document has focus.
 *
 * Landscape adds height. 667 to 932px wide is mostly above the 782px
 * breakpoint, so width rules alone left a two-row toolbar under 400px of
 * height. And from 601 to 782px core lets the page it pushes aside for the
 * open menu scroll sideways; edit mode keeps that menu open.
 */

const PORTRAIT = { width: 375, height: 667 };
const LANDSCAPE = { width: 667, height: 375 };
const LANDSCAPE_WIDE = { width: 844, height: 390 };

const menuOpen = ( page: Page ) =>
	page.evaluate( () => document.getElementById( 'wpwrap' )!.classList.contains( 'wp-responsive-open' ) );

for ( const [ name, viewport ] of [ [ 'portrait', PORTRAIT ], [ 'landscape', LANDSCAPE ], [ 'wide landscape', LANDSCAPE_WIDE ] ] as const ) {
	test.describe( `phone, ${ name } (${ viewport.width }x${ viewport.height })`, () => {
		test.use( { viewport } );

		test( 'the phone toolbar omits coach tips', async ( { page } ) => {
			await page.goto( '/wp-admin/index.php?maestro_edit=1' );
			await expect( page.locator( '.maestro-tour-help' ) ).toBeHidden();
		} );

		test( 'the toolbar is compact and fits the screen', async ( { page } ) => {
			await page.goto( '/wp-admin/index.php?maestro_edit=1' );
			await page.locator( '#menu-posts > a.menu-top' ).click();
			await expect( page.locator( '.maestro-panel' ) ).toBeVisible();

			const m = await page.evaluate( () => {
				const bar = document.querySelector( '.maestro-toolbar' )!.getBoundingClientRect();
				const controls = Array.from( document.querySelectorAll( '.maestro-toolbar .maestro-panel, .maestro-toolbar .maestro-toolbar-right' ) )
					.filter( ( n ) => ( n as HTMLElement ).offsetParent !== null )
					.map( ( n ) => n.getBoundingClientRect() );
				return {
					height: bar.height,
					left: Math.min( ...controls.map( ( r ) => r.left ) ),
					right: Math.max( ...controls.map( ( r ) => r.right ) ),
					bottom: Math.max( ...controls.map( ( r ) => r.bottom ) ),
					clientWidth: document.documentElement.clientWidth,
					scrollWidth: document.documentElement.scrollWidth,
				};
			} );

			// Upright: two rows of 44px touch targets. On its side: one.
			const rows = viewport.width < viewport.height ? 2 : 1;
			expect( m.height ).toBeLessThanOrEqual( rows * 48 + ( rows - 1 ) * 4 + 16 );
			expect( m.left ).toBeGreaterThanOrEqual( 0 );
			expect( m.right ).toBeLessThanOrEqual( m.clientWidth );
			expect( m.bottom ).toBeLessThanOrEqual( viewport.height );
			// No sideways page: a phone browser would zoom out to show it.
			expect( m.scrollWidth ).toBeLessThanOrEqual( m.clientWidth );
		} );

		test( 'a tap inside the icon picker or Visibility keeps the editor open', async ( { page } ) => {
			await page.goto( '/wp-admin/index.php?maestro_edit=1' );
			await page.locator( '#menu-posts > a.menu-top' ).click();

			await page.locator( '.maestro-toolbar .maestro-icon-btn' ).click();
			const picker = page.locator( '.maestro-icon-popover' );
			await expect( picker ).toBeVisible();
			// The whole picker is reachable: above the toolbar, never off the bottom.
			const box = await picker.boundingBox();
			expect( box!.y ).toBeGreaterThanOrEqual( 0 );
			expect( box!.y + box!.height ).toBeLessThanOrEqual( viewport.height );
			// Switching tabs re-renders the tab list, so this click's target is
			// detached by the time it bubbles to core.
			await picker.getByRole( 'tab', { name: 'Bootstrap' } ).click();
			await expect( picker ).toBeVisible();
			await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
			if ( viewport.width <= 782 ) {
				expect( await menuOpen( page ) ).toBe( true );
			}

			await picker.getByRole( 'button', { name: 'Close dialog', exact: true } ).click();
			await page.locator( '.maestro-toolbar .maestro-vis-btn' ).click();
			const vis = page.locator( '.maestro-vis-popover' );
			await expect( vis ).toBeVisible();
			await vis.getByRole( 'checkbox', { name: 'Subscriber' } ).first().click();
			await expect( vis ).toBeVisible();
			await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
			if ( viewport.width <= 782 ) {
				expect( await menuOpen( page ) ).toBe( true );
			}
		} );
	} );
}
