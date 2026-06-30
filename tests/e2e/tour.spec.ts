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
	for ( let i = 0; i < 6; i++ ) {
		if ( ( await tour.count() ) === 0 ) {
			break;
		}
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
