import { test, expect } from '../fixtures';

/**
 * UX-12 — edit mode must not leave inert controls on screen.
 *
 * forceUnfold() keeps the menu unfolded while editing, and neutralises
 * #collapse-menu by swallowing its click (preventDefault +
 * stopImmediatePropagation). That stops the menu collapsing out from under the
 * editor, but leaves the button rendered and focusable: it looks operable,
 * does nothing, and says nothing about why. Clicking it is a dead end.
 *
 * The same reasoning that hides the toggle where the menu is unreachable
 * applies here: a control that cannot act should not be offered.
 *
 * Hidden with display:none rather than disabled/aria-hidden so it also leaves
 * the tab order — a keyboard user should not land on it either.
 */
test.describe( 'UX-12 — no inert controls during edit mode', () => {
	test( 'the collapse-menu button is offered normally outside edit mode', async ( {
		page,
	} ) => {
		await page.goto( '/wp-admin/index.php' );

		// Guard: without this, "hide it always" would pass the next test.
		await expect( page.locator( '#collapse-menu' ) ).toBeVisible();
	} );

	test( 'the collapse-menu button is withdrawn during edit mode', async ( {
		page,
	} ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
		await expect( page.locator( '#collapse-menu' ) ).toBeHidden();
	} );
} );
