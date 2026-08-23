import { test, expect } from '../fixtures';
import { execFileSync } from 'child_process';

/**
 * WP71-05 — the entry point only appears where entering is worth it.
 *
 * WordPress 7.1 shows the toolbar persistently in the Post and Site Editors, so
 * Maestro's toggle became reachable on screens it had never been reachable on.
 *
 * #156 (WP71-01) gated on fullscreen: in fullscreen #adminmenu sits behind the
 * editor chrome, so the toggle led nowhere; out of fullscreen the menu is there
 * and Maestro worked, so that path was kept. That reasoning weighed the cost of
 * ARRIVING and not the cost of ENTERING. The toggle is a plain href
 * (class-admin-bar.php), so following it is a full page navigation — and from
 * the Post Editor that raises core's unsaved-changes dialog and puts post
 * content at risk, whether or not the menu happens to be visible.
 *
 * So the gate now keys on the screen after all, and the Post Editor gets no
 * toggle in either fullscreen state. Nothing is lost: the sidebar is one click
 * away on every other admin screen.
 *
 * The Site Editor keeps its toggle (UX-11) for the opposite reason — it is
 * permanently fullscreen with no control to leave, so hiding it there would
 * leave those users no route at all. Its variant points at the Dashboard.
 *
 * These assert ABSENCE, not invisibility. #156 rendered the node and hid it with
 * CSS; the gate is server-side now, so on the Post Editor the node is never
 * emitted at all.
 */

/**
 * Set the persisted fullscreen preference for the admin user.
 *
 * Still exercised in both states even though fullscreen no longer decides —
 * that is the point: the outcome must be the same either way. A regression that
 * reintroduced the fullscreen dependency would pass a single-state test.
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

test.describe( 'WP71-05 — the screen decides, in both fullscreen states', () => {
	test.afterAll( () => {
		// Leave the shared instance on the WordPress default.
		setFullscreenMode( true );
	} );

	for ( const fullscreen of [ true, false ] ) {
		test( `Post Editor, fullscreen ${ fullscreen ? 'ON' : 'OFF' }: no toggle, and ?maestro_edit=1 paints nothing`, async ( {
			page,
		} ) => {
			setFullscreenMode( fullscreen );

			await page.goto( '/wp-admin/post-new.php' );
			// Not emitted at all, rather than emitted-and-hidden.
			await expect(
				page.locator( '#wp-admin-bar-maestro-toggle' )
			).toHaveCount( 0 );

			// Hiding the entry point does not retract a bookmarked URL.
			await page.goto( '/wp-admin/post-new.php?maestro_edit=1' );
			await expect( page.locator( '.maestro-toolbar' ) ).toHaveCount( 0 );
			// The tour is aria-modal and traps focus; it must never open here.
			await expect( page.locator( '.maestro-tour' ) ).toHaveCount( 0 );
			// The editor assets must not load at all (WP71-05 gates in PHP).
			await expect(
				page.locator( 'link[href*="maestro.css"]' )
			).toHaveCount( 0 );
		} );
	}

	test( 'Site Editor: the toggle leads to the Dashboard, not nowhere (UX-11)', async ( {
		page,
	} ) => {
		// Even with the preference off the Site Editor stays fullscreen, which is
		// exactly why it cannot be treated like the Post Editor.
		setFullscreenMode( false );

		await page.goto( '/wp-admin/site-editor.php' );

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
