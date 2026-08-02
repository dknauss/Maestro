import { test, expect } from '../fixtures';
import { execFileSync } from 'child_process';

/**
 * COMPAT-04 + minimal A1b: a top-level menu item and a submenu it renders
 * under the SAME slug (WordPress's post-type self-link convention — the
 * exact WooCommerce Products / "All Products" collision COMPAT-04 targets)
 * must be independently selectable, editable, and persist to the correct
 * row in the live in-place editor.
 *
 * The fixture: `tests/e2e/fixtures/maestro-e2e-shared-slug.php` (a mu-plugin,
 * mapped in .wp-env.json) registers a "Widgets" CPT whose top-level item and
 * default "All Widgets" submenu item both render
 * `edit.php?post_type=maestro_e2e_widget` — reproducing the shared-slug shape
 * without depending on any real third-party plugin. It is gated behind the
 * `maestro_e2e_shared_slug` option so it never affects any other spec's menu
 * shape; only this file turns the option on.
 */

const POST_SAVE = ( url: string ) => url.includes( '/maestro/v1/config' );

const TOP_ID = '#menu-posts-maestro_e2e_widget';

function wp( args: string[] ): void {
	try {
		execFileSync( 'npx', [ 'wp-env', 'run', 'tests-cli', 'wp', ...args ], { stdio: 'ignore' } );
	} catch ( e ) {
		// `option delete` on an absent option exits non-zero — that IS the
		// desired state post-cleanup, so ignore it (same pattern fixtures.ts
		// uses for maestro_config).
	}
}

test.describe( 'COMPAT-04 — shared-slug top-level vs submenu independent editing', () => {

	test.beforeEach( () => {
		wp( [ 'option', 'update', 'maestro_e2e_shared_slug', '1' ] );
	} );

	test.afterEach( () => {
		wp( [ 'option', 'delete', 'maestro_e2e_shared_slug' ] );
	} );

	test( 'renaming the top-level item leaves the same-slug submenu untouched, and vice versa; both persist to the correct row', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		const topLi = page.locator( TOP_ID );
		await expect( topLi ).toBeVisible();
		await expect( topLi.locator( '.wp-menu-name' ) ).toContainText( 'Widgets' );

		// The shared-slug submenu row is WordPress's self-link "All Widgets"
		// entry — always the first non-head child of this CPT's .wp-submenu.
		const subLi = topLi.locator( '.wp-submenu > li.maestro-subitem' ).first();
		await expect( subLi ).toBeVisible();
		await expect( subLi ).toContainText( 'All Widgets' );

		const panel = page.locator( '.maestro-toolbar .maestro-panel' );
		const rename = panel.locator( '.maestro-rename-input' );

		// 1. Select the TOP-LEVEL item and rename it.
		await topLi.locator( '> a.menu-top' ).click();
		await expect( panel ).toBeVisible();
		await expect( rename ).toHaveValue( 'Widgets' );

		const topSaved = page.waitForResponse(
			( r ) => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
		);
		await rename.fill( 'Gadgets' );
		await rename.press( 'Enter' );
		const topPayload = ( await topSaved ).request().postDataJSON();

		// Only the top-level row changed; the submenu's own label is untouched.
		await expect( topLi.locator( '.wp-menu-name' ) ).toContainText( 'Gadgets' );
		await expect( subLi ).toContainText( 'All Widgets' );

		// 2. Select the SUBMENU row and rename it.
		await subLi.locator( 'a' ).click();
		await expect( panel ).toBeVisible();
		await expect( rename ).toHaveValue( 'All Widgets' );

		const subSaved = page.waitForResponse(
			( r ) => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
		);
		await rename.fill( 'Every Widget' );
		await rename.press( 'Enter' );
		const subPayload = ( await subSaved ).request().postDataJSON();

		// The save payload carries a BARE top-level key AND a QUALIFIED
		// `parent>child` submenu key — the two never collide under one key.
		const items = subPayload?.config?.items ?? {};
		const keys = Object.keys( items );
		const bareKey = keys.find( ( k ) => ! k.includes( '>' ) );
		const qualifiedKey = keys.find( ( k ) => k.includes( '>' ) );
		expect( bareKey, 'expected a bare top-level key for the top-level rename' ).toBeTruthy();
		expect( qualifiedKey, 'expected a qualified parent>child key for the submenu rename' ).toBeTruthy();
		expect( items[ bareKey! ]?.title ).toBe( 'Gadgets' );
		expect( items[ qualifiedKey! ]?.title ).toBe( 'Every Widget' );

		// The top-level row is unaffected by the submenu rename.
		await expect( topLi.locator( '.wp-menu-name' ) ).toContainText( 'Gadgets' );
		await expect( subLi ).toContainText( 'Every Widget' );

		// 3. Reload — both changes must land on the correct rows.
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		const reloadedTop = page.locator( TOP_ID );
		await expect( reloadedTop.locator( '.wp-menu-name' ) ).toContainText( 'Gadgets' );
		await expect(
			reloadedTop.locator( '.wp-submenu > li.maestro-subitem' ).first()
		).toContainText( 'Every Widget' );

		// No console errors during any of the above.
		// (Collected implicitly — Playwright fails the test on an uncaught page error
		// only if asserted; explicitly assert no console errors were logged.)

		// Clean up: reset all so a rerun starts clean.
		page.once( 'dialog', ( d ) => d.accept() );
		await page.locator( '.maestro-reset-all' ).click();
		await expect( reloadedTop.locator( '.wp-menu-name' ) ).toContainText( 'Widgets' );
	} );

	test( 'no console errors are logged while selecting and editing the shared-slug rows', async ( { page } ) => {
		const errors: string[] = [];
		page.on( 'console', ( msg ) => {
			if ( msg.type() === 'error' ) { errors.push( msg.text() ); }
		} );
		page.on( 'pageerror', ( err ) => { errors.push( err.message ); } );

		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		const topLi = page.locator( TOP_ID );
		await expect( topLi ).toBeVisible();
		const subLi = topLi.locator( '.wp-submenu > li.maestro-subitem' ).first();

		await topLi.locator( '> a.menu-top' ).click();
		await expect( page.locator( '.maestro-toolbar .maestro-panel' ) ).toBeVisible();

		await subLi.locator( 'a' ).click();
		await expect( page.locator( '.maestro-toolbar .maestro-panel' ) ).toBeVisible();

		expect( errors, `console/page errors: ${ errors.join( '; ' ) }` ).toHaveLength( 0 );
	} );

} );
