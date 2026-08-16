import { test, expect } from '../fixtures';

/**
 * WP71-01 — Maestro stays out of the Post Editor and the Site Editor.
 *
 * WordPress 7.1 shows the toolbar persistently in both editors. Before that the
 * Post Editor hid it in fullscreen (the default) and the Site Editor never
 * rendered one, so the edit-mode toggle was there but unreachable. Once it is
 * reachable, clicking it enters edit mode on a screen whose #adminmenu is behind
 * the editor's fullscreen chrome: sortables bind to an invisible menu and the
 * Maestro toolbar floats over the block canvas.
 *
 * WHY THIS RUNS ON PRE-7.1 TOO: the gate is server-side (PHP screen check), so
 * asking for the editor URL with ?maestro_edit=1 exercises it on any supported
 * WordPress. What differs in 7.1 is only whether a user can *reach* the toggle
 * by clicking — not what the server does with the URL. These specs take the URL
 * path directly, which is also the path a bookmark or a shared link takes.
 */

const EDITOR_SCREENS = [
	{ name: 'Post Editor', path: '/wp-admin/post-new.php' },
	{ name: 'Site Editor', path: '/wp-admin/site-editor.php' },
];

test.describe( 'WP71-01 — editor screens are out of scope for Maestro', () => {
	for ( const screen of EDITOR_SCREENS ) {
		test( `${ screen.name }: no toggle, and ?maestro_edit=1 loads no editor`, async ( {
			page,
		} ) => {
			// 1. The entry point is absent. In 7.1 the toolbar renders here, so
			//    without the gate this node would be visible and clickable.
			await page.goto( screen.path );
			await expect(
				page.locator( '#wp-admin-bar-maestro-toggle' )
			).toHaveCount( 0 );

			// 2. The URL is inert even when asked for directly. Hiding the toggle
			//    does not retract a bookmarked or shared ?maestro_edit=1 link, so
			//    the asset gate has to hold on its own.
			await page.goto( `${ screen.path }?maestro_edit=1` );
			await expect( page.locator( '.maestro-toolbar' ) ).toHaveCount( 0 );
			await expect(
				page.locator( '#adminmenu li.maestro-item' )
			).toHaveCount( 0 );

			// 3. Nothing of ours is on the page at all — not even the admin-bar
			//    stylesheet, which exists only to keep a toggle we no longer
			//    render reachable on narrow screens.
			const maestroAssets = await page.evaluate( () =>
				Array.from(
					document.querySelectorAll(
						'script[src], link[rel="stylesheet"][href]'
					)
				)
					.map(
						( el ) =>
							el.getAttribute( 'src' ) ||
							el.getAttribute( 'href' ) ||
							''
					)
					.filter( ( url ) => url.includes( '/maestro-menu-editor/' ) )
			);
			expect( maestroAssets ).toEqual( [] );
		} );
	}

	test( 'the classic admin path is unaffected', async ( { page } ) => {
		// Regression guard: a gate that refused everything everywhere would pass
		// every assertion above.
		await page.goto( '/wp-admin/index.php' );
		await expect(
			page.locator( '#wp-admin-bar-maestro-toggle' )
		).toBeVisible();

		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
	} );
} );
