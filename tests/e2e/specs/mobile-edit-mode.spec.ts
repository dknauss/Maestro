import { test, expect } from '../fixtures';

/**
 * UX-10 — entering edit mode at narrow widths must reveal the menu it edits.
 *
 * Below 782px WordPress collapses the admin menu behind the toolbar hamburger:
 * #adminmenuwrap is display:none until #wp-admin-bar-menu-toggle is used. Maestro
 * deliberately keeps its own toggle reachable at that width (UX-08a un-hides it
 * from core's <=782px rule), so mobile editing is intended to work.
 *
 * It does not. Entering edit mode paints the toolbar and decorates the items,
 * but every one of them is inside a display:none menu, and nothing says to tap
 * the hamburger first. Same shape as the 7.1 fullscreen bug, different trigger,
 * and this one predates 7.1 entirely.
 *
 * Facet two is core's outside-click handler (wp-admin/js/common.js): while the
 * responsive menu is open, a click that is in neither #wp-admin-bar-menu-toggle
 * nor #adminmenuwrap closes it. Maestro's toolbar is in neither, so editing
 * controls would close the very menu being edited. That handler early-returns on
 * !document.hasFocus(), which is why this has to be asserted in a real browser
 * run rather than a scripted click in a background page.
 */

const MOBILE = { width: 375, height: 812 };

test.describe( 'UX-10 — edit mode at <=782px', () => {
	test.use( { viewport: MOBILE } );

	test( 'entering edit mode reveals the collapsed admin menu', async ( {
		page,
	} ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		// The toolbar proves edit mode engaged at this width.
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();

		// ...and the menu it edits must actually be on screen.
		await expect( page.locator( '#adminmenu' ) ).toBeVisible();
		await expect(
			page.locator( '#adminmenu li.maestro-item' ).first()
		).toBeVisible();
	} );

	test( 'the menu stays open while using the editor toolbar', async ( {
		page,
	} ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '#adminmenu' ) ).toBeVisible();

		// Select an item first, so the toolbar's per-item controls are live.
		await page.locator( '#menu-posts.maestro-item > a' ).click();

		/*
		 * The click that matters is on the TOOLBAR, not the menu. A menu click
		 * lands inside #adminmenuwrap, which core's outside-click handler
		 * explicitly treats as inside — so it would never exercise this at all.
		 * The toolbar is outside both that and the hamburger, which is exactly
		 * the case core closes on. Real click, so the handler is not skipped by
		 * its own !document.hasFocus() guard.
		 */
		await page.locator( '.maestro-toolbar .maestro-move-up' ).click();

		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
		await expect( page.locator( '#adminmenu' ) ).toBeVisible();
		await expect(
			page.locator( '#adminmenu li.maestro-item' ).first()
		).toBeVisible();
	} );

	test( 'closing the menu withdraws the toolbar with it, reversibly', async ( {
		page,
	} ) => {
		/*
		 * A deliberate consequence of attaching the toolbar inside #adminmenuwrap
		 * rather than an accident worth hiding: closing the menu takes the toolbar
		 * with it, because it is part of that subtree.
		 *
		 * That is the right reading — no menu on screen means nothing to edit —
		 * and it is what keeps the hamburger honest instead of inert. Exit stays
		 * on the admin bar, which UX-09 already made the single entry/exit, so
		 * the user is never stranded.
		 */
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();

		const hamburger = page.locator( '#wp-admin-bar-menu-toggle a' );

		await hamburger.click();
		await expect( page.locator( '#adminmenu' ) ).toBeHidden();
		await expect( page.locator( '.maestro-toolbar' ) ).toBeHidden();

		// Never stranded: the way out is still on the admin bar.
		await expect(
			page.locator( '#wp-admin-bar-maestro-toggle' )
		).toBeVisible();

		// And it comes straight back.
		await hamburger.click();
		await expect( page.locator( '#adminmenu' ) ).toBeVisible();
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
	} );
} );
