import { test, expect } from '@playwright/test';

/**
 * UX-11: the first-run guided coachmark tour. Auto-launches once (localStorage
 * seen-flag), steps through anchored tooltips, sets the seen-flag on finish so
 * it does not re-launch, and is replayable anytime via the toolbar "?" button.
 * Esc closes it.
 */
test( 'guided tour: auto-launch, step through, seen-flag, replay, Esc', async ( { page } ) => {
	await page.goto( '/wp-admin/index.php?maestro_edit=1' );
	// Force first-run state, then reload so init() auto-launches the tour.
	await page.evaluate( () => window.localStorage.removeItem( 'maestroFirstRunDone' ) );
	await page.reload();
	await page.waitForSelector( '#adminmenu li.maestro-item' );

	const tour = page.locator( '.maestro-tour' );

	// Auto-launches on first run, starting at step 1.
	await expect( tour ).toBeVisible();
	await expect( page.locator( '.maestro-tour-progress' ) ).toContainText( '1' );

	// Step through to the end (Next becomes Done on the last step and closes).
	// At the default desktop viewport every control is on screen, so no step
	// is skipped: each toolbar control and the menu's width edge gets its
	// own coachmark, in toolbar order.
	const expected = [
		'Click any menu item',
		'Type a new name',
		'Reorder items',
		'icon',
		'Hide the item',
		'Undo every change',
		'separator',
		'edge',
		'Visibility groups',
		'Menu settings',
		'tour again',
		'Reset All',
		'Exit',
	];
	await expect( page.locator( '.maestro-tour-progress' ) ).toHaveText( `1 of ${ expected.length }` );
	for ( const [ i, text ] of expected.entries() ) {
		await expect( page.locator( '.maestro-tour-progress' ) ).toHaveText( `${ i + 1 } of ${ expected.length }` );
		await expect( page.locator( '.maestro-tour-text' ) ).toContainText( text );
		await page.locator( '.maestro-tour-next' ).click();
	}
	await expect( tour ).toHaveCount( 0 );

	// Seen-flag set → no auto-relaunch on reload.
	expect( await page.evaluate( () => window.localStorage.getItem( 'maestroFirstRunDone' ) ) ).toBe( '1' );
	await page.reload();
	await page.waitForSelector( '#adminmenu li.maestro-item' );
	await expect( tour ).toHaveCount( 0 );

	// Replayable via the toolbar "?" button.
	await page.locator( '.maestro-tour-help' ).click();
	await expect( tour ).toBeVisible();

	// Focus containment (aria-modal): focus escaping to the page behind the tour
	// is pulled back inside it.
	const contained = await page.evaluate( () => {
		const bg = document.querySelector( '#adminmenu a' );
		if ( bg ) {
			( bg as HTMLElement ).focus();
		}
		const t = document.querySelector( '.maestro-tour' );
		return !! t && t.contains( document.activeElement );
	} );
	expect( contained ).toBe( true );

	// Esc closes it.
	await page.keyboard.press( 'Escape' );
	await expect( tour ).toHaveCount( 0 );
} );


test( 'narrow tour: the hidden width and Settings steps are dropped, and Back walks to the start', async ( { page } ) => {
	await page.setViewportSize( { width: 900, height: 900 } );
	await page.goto( '/wp-admin/index.php?maestro_edit=1' );
	await page.evaluate( () => window.localStorage.removeItem( 'maestroFirstRunDone' ) );
	await page.reload();
	const text = page.locator( '.maestro-tour-text' );
	const progress = page.locator( '.maestro-tour-progress' );
	await expect( page.locator( '.maestro-tour' ) ).toBeVisible();
	// The width handle and the Settings gear only render at 961px and up, so
	// below that their steps are not in the tour at all and the count has no
	// gap where they were. Eight steps, Profiles included, precede Help.
	await expect( progress ).toHaveText( '1 of 11' );
	for ( let i = 0; i < 8; i++ ) {
		await page.locator( '.maestro-tour-next' ).click();
	}
	await expect( text ).toContainText( 'tour again' );
	await expect( progress ).toHaveText( '9 of 11' );
	await page.locator( '.maestro-tour-back' ).click();
	await expect( text ).toContainText( /Hiding profiles|Visibility groups/ );
	await page.locator( '.maestro-tour-back' ).click();
	await expect( text ).toContainText( 'Add a separator' );
	await page.locator( '.maestro-tour-next' ).click();
	await expect( text ).toContainText( /Hiding profiles|Visibility groups/ );
	await page.locator( '.maestro-tour-next' ).click();
	await expect( text ).toContainText( 'tour again' );
	// Back must keep moving across every remaining step and stop at the first.
	for ( let i = 0; i < 8; i++ ) {
		await page.locator( '.maestro-tour-back' ).click();
	}
	await expect( text ).toContainText( 'Click any menu item' );
	await expect( page.locator( '.maestro-tour-back' ) ).toBeDisabled();
	await page.keyboard.press( 'Escape' );
	await expect( page.locator( '.maestro-tour' ) ).toHaveCount( 0 );
} );
