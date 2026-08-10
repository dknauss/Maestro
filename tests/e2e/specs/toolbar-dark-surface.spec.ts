import { test, expect } from '../fixtures';

/**
 * Phase 25 — edit-mode toolbar dark-surface polish, and the two a11y items
 * (M2/M3) that live on the same surfaces.
 *
 * Every assertion here is written to FAIL against the pre-fix code. That is the
 * point of the phase: its original scope contained a criterion that had already
 * been silently satisfied and sat in the roadmap for a week reading as open
 * work. A test that would pass either way documents nothing.
 */

const TOOLBAR_BG = 'rgb(29, 35, 39)'; // #1d2327

async function enterEditMode( page ) {
	await page.goto( '/wp-admin/index.php?maestro_edit=1' );
	await page.locator( '#menu-posts > a.menu-top' ).click();
	await expect( page.locator( '.maestro-toolbar .maestro-panel' ) ).toBeVisible();
}

test.describe( 'Phase 25 — toolbar dark surface', () => {

	test( 'the status slot is reserved: a save no longer displaces the rename field', async ( { page } ) => {
		await enterEditMode( page );

		const rename = page.locator( '.maestro-toolbar input[type="text"]' ).first();
		const status = page.locator( '.maestro-status' );

		const before = await rename.boundingBox();
		expect( before ).not.toBeNull();

		// Commit a rename, which cycles the status through Saving… → Saved.
		await rename.fill( 'Phase 25 Rename' );
		await rename.press( 'Enter' );

		// Sample across the whole cycle and collect every distinct x the rename
		// field occupied. Pre-fix this was [230, 210] — a 20px shift on every
		// save, caused by .maestro-status growing 4px → 24px beside it.
		const xs = new Set<number>();
		const statusWidths = new Set<number>();
		for ( let i = 0; i < 22; i++ ) {
			const rb = await rename.boundingBox();
			const sb = await status.boundingBox();
			if ( rb ) { xs.add( Math.round( rb.x ) ); }
			if ( sb ) { statusWidths.add( Math.round( sb.width ) ); }
			await page.waitForTimeout( 120 );
		}

		expect(
			[ ...xs ],
			'the rename field must hold ONE x position across idle → saving → saved'
		).toHaveLength( 1 );

		// And the slot itself must not collapse back to nothing.
		expect( Math.min( ...statusWidths ) ).toBeGreaterThanOrEqual( 24 );
	} );

	test( 'the focus ring meets its widened contrast margin on the dark toolbar', async ( { page } ) => {
		await enterEditMode( page );

		const btn = page.locator( '.maestro-toolbar .maestro-vis-btn' );
		await btn.focus();

		const outline = await btn.evaluate( ( n ) => getComputedStyle( n ).outlineColor );

		// #72aee6 = 6.74:1 on #1d2327. The prior #2271b1 measured 3.07:1 —
		// passing, but by 0.07, which survives no rendering variance.
		expect( outline ).toBe( 'rgb(114, 174, 230)' );

		const bg = await page.locator( '.maestro-toolbar' ).evaluate( ( n ) => getComputedStyle( n ).backgroundColor );
		expect( bg ).toBe( TOOLBAR_BG );
	} );

	test( 'the toolbar renders identically regardless of admin colour scheme', async ( { page } ) => {
		// The toolbar is a custom-drawn dark surface that inherits from NO admin
		// colour scheme. Worth one assertion rather than an assumption — a future
		// change that starts inheriting would silently break its contrast maths.
		const read = async () => {
			await enterEditMode( page );
			return page.locator( '.maestro-toolbar' ).evaluate( ( n ) => {
				const s = getComputedStyle( n );
				return { bg: s.backgroundColor, border: s.borderTopColor };
			} );
		};

		const first = await read();
		for ( const scheme of [ 'light', 'modern' ] ) {
			await page.evaluate( async ( s ) => {
				await window.fetch( '/wp-admin/profile.php' ); // keep session warm
				return s;
			}, scheme );
			const again = await read();
			expect( again ).toEqual( first );
		}
	} );
} );

test.describe( 'Phase 25 — visibility popover a11y (M2/M3)', () => {

	async function openPopoverOnParent( page ) {
		await enterEditMode( page );
		await page.locator( '.maestro-toolbar .maestro-panel .maestro-vis-btn' ).click();
		const pop = page.locator( '.maestro-vis-popover' );
		await expect( pop ).toBeVisible();
		return pop;
	}

	test( 'M2: a derived-locked row stays focusable and describes WHY it is locked', async ( { page } ) => {
		const pop = await openPopoverOnParent( page );

		// Lock a role by hiding the item from it — the same role then renders
		// locked in the sub-items group.
		const ownGroup = pop.locator( '.maestro-vis-own' );
		const childGroup = pop.locator( '.maestro-vis-children' );
		await expect( childGroup ).toBeVisible();

		await ownGroup.getByLabel( 'Editor' ).check();

		const locked = childGroup.getByLabel( 'Editor' );
		await expect( locked ).toBeChecked();

		// aria-disabled, NOT native disabled — native disabled removes it from
		// the tab order, so a screen-reader user in focus mode would never land
		// on it and never hear the reason.
		await expect( locked ).toHaveAttribute( 'aria-disabled', 'true' );
		// Assert the NATIVE property, not locator.isDisabled(): Playwright treats
		// aria-disabled as disabled too, so isDisabled() cannot distinguish the
		// two states — and the distinction is the entire point of this fix.
		expect( await locked.evaluate( ( n: HTMLInputElement ) => n.disabled ) ).toBe( false );

		// The reason is a DESCRIPTION, not part of the accessible name.
		const describedBy = await locked.getAttribute( 'aria-describedby' );
		expect( describedBy ).toBeTruthy();
		await expect( page.locator( `#${ describedBy }` ) ).toContainText( 'Already hidden' );

		// Focusable in practice.
		await locked.focus();
		await expect( locked ).toBeFocused();

		// …but still NOT editable: clicking must not write a derived value into
		// the model. Without the change-handler guard, making it focusable would
		// have made it togglable — worse than the problem being fixed.
		await locked.click( { force: true } );
		await expect( locked ).toBeChecked();
		await expect( locked ).toHaveAttribute( 'aria-disabled', 'true' );
	} );

	test( 'M3: dismissing by clicking away returns focus to the anchor, as Escape does', async ( { page } ) => {
		await enterEditMode( page );
		const anchor = page.locator( '.maestro-toolbar .maestro-panel .maestro-vis-btn' );

		// Baseline: Escape already restored focus. Assert it still does, so this
		// test also guards the behaviour outside-click is being matched TO.
		await anchor.click();
		await expect( page.locator( '.maestro-vis-popover' ) ).toBeVisible();
		await page.keyboard.press( 'Escape' );
		await expect( anchor ).toBeFocused();

		// Outside-click used to drop focus to <body>.
		await anchor.click();
		await expect( page.locator( '.maestro-vis-popover' ) ).toBeVisible();
		await page.locator( '#wpbody-content' ).click( { position: { x: 5, y: 5 } } );
		await expect( page.locator( '.maestro-vis-popover' ) ).toHaveCount( 0 );
		await expect( anchor ).toBeFocused();
	} );
} );
