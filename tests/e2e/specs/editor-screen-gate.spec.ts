import { test, expect } from '../fixtures';
import { execFileSync } from 'child_process';

/**
 * WP71-01 — Maestro follows the admin menu, not the screen.
 *
 * WordPress 7.1 shows the toolbar persistently in the Post and Site Editors.
 * Before that the Post Editor hid it in fullscreen (the default) and the Site
 * Editor never rendered one, so Maestro's toggle was registered there but
 * unreachable. Now it is reachable — and in fullscreen it leads nowhere, because
 * #adminmenu is behind the editor chrome.
 *
 * The rule is NOT "editor screens are off limits". Verified on 7.1-RC4:
 *
 *   - Post Editor, fullscreen ON (default): #adminmenu hidden -> nothing to edit.
 *   - Post Editor, fullscreen OFF:          #adminmenu visible at 160x523, and
 *                                           Maestro works completely.
 *   - Site Editor:                          permanently fullscreen. Forcing every
 *                                           fullscreen preference to false does not
 *                                           change it and there is no fullscreen
 *                                           menu item, so the menu is never reachable.
 *
 * So the gate keys on fullscreen, not on the screen, which keeps the Post Editor
 * path that genuinely works today.
 *
 * The Site Editor then needs an explicit exception (UX-11). Keying on fullscreen
 * would hide the toggle there too — technically consistent, but it leaves those
 * users no route to menu editing at all, since they cannot turn fullscreen off.
 * A hidden toggle is the right answer only where the menu is one preference
 * away. Where it is unreachable for good, the toggle stays and points at the
 * Dashboard instead.
 *
 * Note these assert VISIBILITY, not absence: the toggle is server-rendered into
 * the toolbar and hidden by CSS, so the node exists in the DOM either way.
 */

/**
 * Set the persisted fullscreen preference for the admin user.
 *
 * Written straight to user meta rather than toggled through the editor UI so the
 * state is deterministic at first paint — core reads this to decide whether to
 * strip the server-rendered `is-fullscreen-mode` class during hydration.
 */
function setFullscreenMode( on: boolean ): void {
	execFileSync(
		'npx',
		[
			'wp-env', 'run', 'tests-cli',
			'wp', 'user', 'meta', 'update', 'admin', 'wp_persisted_preferences',
			JSON.stringify( { 'core/edit-post': { fullscreenMode: on } } ),
			'--format=json',
		],
		{ stdio: 'ignore' }
	);
}

test.describe( 'WP71-01 — fullscreen decides, not the screen', () => {
	test.afterAll( () => {
		// Leave the shared instance on the WordPress default.
		setFullscreenMode( true );
	} );

	test( 'Post Editor in fullscreen: no toggle, and ?maestro_edit=1 paints nothing', async ( {
		page,
	} ) => {
		setFullscreenMode( true );

		await page.goto( '/wp-admin/post-new.php' );
		await expect( page.locator( 'body' ) ).toHaveClass( /is-fullscreen-mode/ );
		await expect(
			page.locator( '#wp-admin-bar-maestro-toggle' )
		).toBeHidden();

		// The URL is reachable by bookmark even with the toggle hidden.
		await page.goto( '/wp-admin/post-new.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeHidden();
		// The tour traps focus, so it must never open over the canvas.
		await expect( page.locator( '.maestro-tour' ) ).toHaveCount( 0 );
	} );

	test( 'Post Editor out of fullscreen: Maestro still works (BC)', async ( {
		page,
	} ) => {
		setFullscreenMode( false );

		await page.goto( '/wp-admin/post-new.php' );
		await expect( page.locator( 'body' ) ).not.toHaveClass(
			/is-fullscreen-mode/
		);
		await expect( page.locator( '#adminmenu' ) ).toBeVisible();
		await expect(
			page.locator( '#wp-admin-bar-maestro-toggle' )
		).toBeVisible();

		await page.goto( '/wp-admin/post-new.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
		await expect(
			page.locator( '#adminmenu li.maestro-item' ).first()
		).toBeVisible();
	} );

	test( 'Site Editor: the toggle leads to the Dashboard, not nowhere (UX-11)', async ( {
		page,
	} ) => {
		// Even with the preference off, the Site Editor stays fullscreen — which
		// is exactly why it cannot be treated like the Post Editor.
		setFullscreenMode( false );

		await page.goto( '/wp-admin/site-editor.php' );
		await expect( page.locator( 'body' ) ).toHaveClass( /is-fullscreen-mode/ );

		/*
		 * Deliberately NOT hidden here, unlike the Post Editor. Fullscreen is a
		 * preference there, so the menu is one toggle away and hiding costs
		 * nothing. The Site Editor has no such control, so hiding would leave no
		 * route to menu editing at all.
		 */
		const toggle = page.locator( '#wp-admin-bar-maestro-toggle' );
		await expect( toggle ).toBeVisible();
		await expect( toggle ).toHaveClass( /maestro-toggle-offsite/ );

		// Following it must land somewhere the menu actually exists.
		await toggle.locator( 'a' ).click();
		await expect( page ).toHaveURL( /index\.php\?maestro_edit=1/ );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
		await expect(
			page.locator( '#adminmenu li.maestro-item' ).first()
		).toBeVisible();
	} );

	test( 'classic admin is untouched', async ( { page } ) => {
		setFullscreenMode( true );

		await page.goto( '/wp-admin/index.php' );
		await expect(
			page.locator( '#wp-admin-bar-maestro-toggle' )
		).toBeVisible();

		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
	} );
} );
