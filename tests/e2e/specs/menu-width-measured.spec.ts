import { test, expect } from '../fixtures';
import { execFileSync } from 'child_process';

/**
 * Phase 28-01 — edit mode must follow the menu's REAL width, not assume 160px.
 *
 * Keel and PX both widen the admin menu with `!important` rules from 961px up.
 * Maestro's toolbar was pinned at `left: 160px`, so on those sites it covered
 * the right edge of the very menu being edited (reproduced 2026-09-15 with Keel
 * at 240px: menu 240px, toolbar left edge 160px).
 *
 * The fixture mu-plugin `maestro-e2e-wide-menu.php` prints Keel's exact rule
 * while the `maestro_e2e_wide_menu` option holds a width, so these assertions run
 * against the real selector set rather than an approximation of it.
 */

function setWideMenu( width: number | null ): void {
	try {
		execFileSync(
			'npx',
			width === null
				? [ 'wp-env', 'run', 'tests-cli', 'wp', 'option', 'delete', 'maestro_e2e_wide_menu' ]
				: [ 'wp-env', 'run', 'tests-cli', 'wp', 'option', 'update', 'maestro_e2e_wide_menu', String( width ) ],
			{ stdio: 'ignore' }
		);
	} catch ( e ) {
		// `option delete` exits non-zero when the option is already absent,
		// which is the state we want. A real failure surfaces in the assertions.
	}
}

async function geometry( page ) {
	return page.evaluate( () => {
		const left = ( sel: string ) => {
			const el = document.querySelector( sel );
			return el ? Math.round( el.getBoundingClientRect().left ) : null;
		};
		const wrap = document.getElementById( 'adminmenuwrap' );
		return {
			menu: wrap ? Math.round( wrap.getBoundingClientRect().width ) : null,
			toolbar: left( '.maestro-toolbar' ),
			content: left( '#wpcontent' ),
		};
	} );
}

test.describe( 'Phase 28-01 — toolbar follows the measured menu width', () => {
	test.afterEach( () => setWideMenu( null ) );

	test( 'core width: toolbar starts at 160px, as before', async ( { page } ) => {
		setWideMenu( null );
		await page.setViewportSize( { width: 1280, height: 900 } );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();

		const g = await geometry( page );
		expect( g.menu ).toBe( 160 );
		expect( g.toolbar ).toBe( 160 );
		expect( g.content ).toBe( 160 );
	} );

	test( 'a menu another plugin widened to 240px: toolbar starts at 240px', async ( {
		page,
	} ) => {
		setWideMenu( 240 );
		await page.setViewportSize( { width: 1280, height: 900 } );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();

		const g = await geometry( page );
		expect( g.menu ).toBe( 240 );
		// The defect: the toolbar used to start at 160px, over the menu.
		expect( g.toolbar ).toBe( 240 );
		// And the content column still starts where the menu ends.
		expect( g.content ).toBe( 240 );
	} );

	test( 'crossing the widening breakpoint: toolbar tracks the menu live', async ( {
		page,
	} ) => {
		setWideMenu( 240 );
		await page.setViewportSize( { width: 1280, height: 900 } );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
		await expect.poll( async () => ( await geometry( page ) ).toolbar ).toBe( 240 );

		// Below 961px the widening rule switches off and core's 160px applies.
		// No reload: the toolbar has to follow the resize on its own.
		await page.setViewportSize( { width: 900, height: 900 } );
		await expect.poll( async () => ( await geometry( page ) ).menu ).toBe( 160 );
		await expect.poll( async () => ( await geometry( page ) ).toolbar ).toBe( 160 );
	} );

	test( 'below 782px the toolbar still spans the full width', async ( { page } ) => {
		setWideMenu( 240 );
		await page.setViewportSize( { width: 375, height: 812 } );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();

		expect( ( await geometry( page ) ).toolbar ).toBe( 0 );
	} );
} );
