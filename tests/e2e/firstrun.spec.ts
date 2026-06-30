import { test, expect } from '@playwright/test';

/**
 * BUG-09 regression: the first-run attention pulse on the first menu item must be
 * a true one-shot in ALL motion preferences.
 *
 * Under prefers-reduced-motion the pulse CSS sets `animation: none`, so the
 * `animationend` event that normally removes the `maestro-firstrun-pulse` class
 * never fires. Before the fix this left a permanent 2px solid outline on the
 * first top-level item — read by users as a stray dark band above the next menu
 * group — and it re-appeared on every load (the seen flag is only set on
 * explicit dismiss). A timed fallback must remove the class regardless.
 */
test( 'first-run pulse self-clears under reduced motion', async ( { page } ) => {
	await page.emulateMedia( { reducedMotion: 'reduce' } );
	await page.goto( '/wp-admin/index.php?maestro_edit=1' );

	// Force first-run state so the cue + pulse are actually built, then reload.
	await page.evaluate( () => window.localStorage.removeItem( 'maestroFirstRunDone' ) );
	await page.reload();
	await page.waitForSelector( '#adminmenu li.maestro-item' );

	// The pulse may appear briefly, but must clear itself within a couple seconds
	// even though animationend never fires under reduced motion.
	await expect
		.poll( () => page.locator( '#adminmenu .maestro-firstrun-pulse' ).count(), {
			timeout: 4000,
		} )
		.toBe( 0 );
} );
