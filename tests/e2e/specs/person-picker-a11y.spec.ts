import { test, expect } from '../fixtures';
import { execFileSync } from 'child_process';

/**
 * ROLE-02 — accessibility of the person-picker surfaces.
 *
 * Written for the v1.5.0 release gate, because these surfaces had never had an
 * independent a11y pass — they were written to the bar, not audited against it.
 * That distinction matters here: v1.4.0's a11y gate found a serious defect
 * (WCAG 1.3.1) in this same popover when it had HALF as many groups, and the
 * defect was a missing programmatic name — precisely the kind that looks fine
 * on screen.
 *
 * What this spec can and cannot do: it verifies the programmatic structure and
 * keyboard operability that a screen reader depends on. It cannot verify what a
 * screen reader actually announces. A real AT pass is still worth doing.
 */

const TARGET_LOGIN = 'maestro_a11y_target';
const TARGET_NAME = 'Alex Aria';

function wp( args: string[] ): void {
	try {
		execFileSync( 'npx', [ 'wp-env', 'run', 'tests-cli', 'wp', ...args ], { stdio: 'ignore' } );
	} catch ( e ) {
		// create-when-present / delete-when-absent both exit non-zero; both fine.
	}
}

test.describe( 'ROLE-02 — person picker accessibility', () => {

	test.beforeAll( () => {
		wp( [ 'user', 'create', TARGET_LOGIN, `${ TARGET_LOGIN }@example.com`,
			'--role=editor', `--display_name=${ TARGET_NAME }`, '--user_pass=password' ] );
	} );

	test.afterAll( () => {
		wp( [ 'user', 'delete', TARGET_LOGIN, '--yes' ] );
	} );

	async function openPicker( page ) {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await page.locator( '#menu-posts > a.menu-top' ).click();
		await expect( page.locator( '.maestro-toolbar .maestro-panel' ) ).toBeVisible();
		await page.locator( '.maestro-toolbar .maestro-panel .maestro-vis-btn' ).click();
		const pop = page.locator( '.maestro-vis-popover' );
		await expect( pop ).toBeVisible();
		return pop;
	}

	test( 'the search field has a programmatic label, not just a placeholder', async ( { page } ) => {
		const pop = await openPicker( page );
		const search = pop.locator( '.maestro-vis-own-users .maestro-user-search' );

		// A placeholder is NOT an accessible name — it disappears on input and
		// several AT combinations ignore it outright.
		const id = await search.getAttribute( 'id' );
		expect( id ).toBeTruthy();
		const label = page.locator( `label[for="${ id }"]` );
		await expect( label ).toHaveCount( 1 );
		await expect( label ).toHaveText( 'Search for a person' );
	} );

	test( 'all four visibility groups expose DISTINCT accessible names', async ( { page } ) => {
		const pop = await openPicker( page );
		const groups = pop.locator( '[role="group"]' );
		await expect( groups ).toHaveCount( 4 );

		const names: string[] = [];
		for ( let i = 0; i < 4; i++ ) {
			const g = groups.nth( i );
			const labelledBy = await g.getAttribute( 'aria-labelledby' );
			expect( labelledBy, 'every group needs a programmatic name' ).toBeTruthy();
			names.push( ( await page.locator( `#${ labelledBy }` ).textContent() ) ?? '' );
		}

		// The failure mode is two groups sharing an id — an AT user then cannot
		// tell "hide this item" from "hide its sub-items".
		expect( new Set( names ).size, 'group names must be distinct' ).toBe( 4 );
	} );

	test( 'search results are keyboard reachable and each chip remove names WHO it removes', async ( { page } ) => {
		const pop = await openPicker( page );
		const group = pop.locator( '.maestro-vis-own-users' );
		const search = group.locator( '.maestro-user-search' );

		await search.focus();
		await search.fill( 'Alex' );
		const result = group.locator( '.maestro-user-result' ).filter( { hasText: TARGET_NAME } ).first();
		await expect( result ).toBeVisible( { timeout: 15000 } );

		// Reachable by keyboard from the field, and activatable by Enter — a
		// mouse-only result list would strand keyboard users at the search box.
		await page.keyboard.press( 'Tab' );
		await expect( result ).toBeFocused();
		await page.keyboard.press( 'Enter' );

		const chip = group.locator( '.maestro-user-chip' );
		await expect( chip ).toContainText( TARGET_NAME );

		// The visible control is a bare glyph, so the accessible name has to
		// carry the person — otherwise AT hears N identical "remove" buttons.
		const remove = group.locator( '.maestro-user-chip-remove' );
		await expect( remove ).toHaveAttribute( 'aria-label', `Remove ${ TARGET_NAME }` );
	} );

	test( 'status messages live in a polite live region', async ( { page } ) => {
		const pop = await openPicker( page );
		const group = pop.locator( '.maestro-vis-own-users' );
		const status = group.locator( '.maestro-user-status' );

		await expect( status ).toHaveAttribute( 'aria-live', 'polite' );

		// A no-results message that is only visual leaves an AT user waiting.
		await group.locator( '.maestro-user-search' ).fill( 'zzzznobodymatchesthis' );
		await expect( status ).toBeVisible( { timeout: 15000 } );
		await expect( status ).toHaveText( 'No matching people found.' );
	} );

	test( 'focus returns to the search field after adding and after removing', async ( { page } ) => {
		const pop = await openPicker( page );
		const group = pop.locator( '.maestro-vis-own-users' );
		const search = group.locator( '.maestro-user-search' );

		await search.fill( 'Alex' );
		const result = group.locator( '.maestro-user-result' ).filter( { hasText: TARGET_NAME } ).first();
		await expect( result ).toBeVisible( { timeout: 15000 } );
		await result.click();

		// After a pick, focus must not be lost to <body> — the picked result
		// node is destroyed, so something has to claim focus deliberately.
		await expect( search ).toBeFocused();

		await group.locator( '.maestro-user-chip-remove' ).first().click();
		await expect( search ).toBeFocused();
	} );

	test( 'the popover keeps a working focus trap with the person groups present', async ( { page } ) => {
		const pop = await openPicker( page );

		// Tab far enough to wrap. The trap must not be broken by the added
		// controls, and Escape must still close and restore focus.
		for ( let i = 0; i < 40; i++ ) {
			await page.keyboard.press( 'Tab' );
			expect( await pop.evaluate( ( n ) => n.contains( document.activeElement ) ) ).toBe( true );
		}

		await page.keyboard.press( 'Escape' );
		await expect( pop ).toHaveCount( 0 );
		await expect( page.locator( '.maestro-toolbar .maestro-panel .maestro-vis-btn' ) ).toBeFocused();
	} );
} );
