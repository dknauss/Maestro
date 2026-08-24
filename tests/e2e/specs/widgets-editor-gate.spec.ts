import { test, expect } from '../fixtures';
import { execFileSync } from 'child_process';

/**
 * WP71-05 must not over-block the BLOCK WIDGETS EDITOR.
 *
 * `widgets.php` reports `WP_Screen::is_block_editor()` true on a classic theme,
 * but it is an ordinary admin screen: `#adminmenu` is rendered and 160px wide,
 * and Maestro worked there before WP71-05. The first version of that change
 * gated on "is this a block editor" and removed both the toggle and the editor
 * assets there — the exact over-blocking #156 rejected `is_block_editor()` for.
 *
 * Caught in review on #176, after it had merged. It survived the integration
 * pass because `set_current_screen( 'widgets' )` reports is_block_editor FALSE —
 * core sets that during the real page bootstrap — so only a rendered page shows
 * it. That is why this spec exists alongside the integration test rather than
 * instead of it.
 *
 * Requires a CLASSIC theme: under a block theme core redirects widgets.php into
 * the Site Editor, so the screen under test does not exist.
 */

/**
 * Activate a theme, installing it first if this WordPress does not bundle it.
 *
 * `wp theme activate` only activates an already-installed theme, so on a build
 * that ships a narrower default set this would exit nonzero in `beforeAll` and
 * fail the job before the regression test ran. Which themes a given WordPress
 * bundles is not something this spec should have to know, so it does not assume:
 * it tries, and falls back to installing. Raised as P1 by Codex on #179.
 */
function activateTheme( slug: string ): void {
	const run = ( ...args: string[] ) =>
		execFileSync( 'npx', [ 'wp-env', 'run', 'tests-cli', 'wp', ...args ], { stdio: 'ignore' } );

	try {
		run( 'theme', 'activate', slug );
	} catch ( e ) {
		run( 'theme', 'install', slug, '--activate' );
	}
}

test.describe( 'WP71-05 — the block widgets editor is not an editor screen for this purpose', () => {
	test.beforeAll( () => activateTheme( 'twentytwentyone' ) );
	// Restore the block theme the rest of the suite assumes (the Site Editor
	// specs need one). afterAll runs even when a test in the block fails.
	test.afterAll( () => activateTheme( 'twentytwentyfive' ) );

	test( 'the toggle stays, and edit mode still works', async ( { page } ) => {
		await page.goto( '/wp-admin/widgets.php' );

		// Establish the premise: this really is a block-editor screen, and the
		// admin menu really is usable. Without both, the test proves nothing.
		await expect( page.locator( 'body' ) ).toHaveClass( /block-editor-page/ );
		await expect( page.locator( '#adminmenu' ) ).toBeVisible();

		await expect( page.locator( '#wp-admin-bar-maestro-toggle' ) ).toBeVisible();

		await page.goto( '/wp-admin/widgets.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
		await expect(
			page.locator( '#adminmenu li.maestro-item' ).first()
		).toBeVisible();
	} );
} );
