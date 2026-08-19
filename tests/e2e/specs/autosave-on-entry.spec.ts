import { test, expect } from '../fixtures';
import { execFileSync } from 'child_process';

/**
 * UX-13 — entering edit mode from the post editor must not risk unsaved work.
 *
 * Maestro's toggle is a plain link: clicking it navigates. From the post editor
 * with unsaved changes that trips core's beforeunload handler, so the user gets
 * the browser's generic "Leave site? Changes you made may not be saved" — a
 * scary, uninformative prompt in response to what looks like a mode switch.
 *
 * Only reachable with fullscreen OFF, since the toggle is hidden in fullscreen
 * (WP71-01) — the same backward-compatible path that fix deliberately kept.
 *
 * The fix autosaves before navigating. Autosave, NOT savePost: on a published
 * post savePost would push the user's in-progress edits live, which would be a
 * far worse bug than the one being fixed. Autosave writes a revision without
 * publishing, and is what WordPress already does on its own timer.
 *
 * These assert PERSISTENCE rather than the absence of a dialog. Playwright
 * auto-dismisses dialogs, so "no dialog appeared" would pass whether or not the
 * work survived — which is the thing that actually matters.
 */

/**
 * Set fullscreen, and always suppress the welcome guide.
 *
 * The guide's modal overlay intercepts pointer events and silently blocks every
 * click in the editor — it cost a debugging round here, presenting as a click
 * timeout that looked like the beforeunload prompt.
 */
function setFullscreenMode( on: boolean ): void {
	execFileSync(
		'npx',
		[ 'wp-env', 'run', 'tests-cli', 'wp', 'user', 'meta', 'update', 'admin',
			'wp_persisted_preferences',
			JSON.stringify( {
				'core/edit-post': { fullscreenMode: on },
				core: { welcomeGuide: false },
			} ),
			'--format=json' ],
		{ stdio: 'ignore' }
	);
}

/** Titles of every post WordPress currently knows about, any status. */
function persistedTitles(): string {
	return execFileSync(
		'npx',
		[ 'wp-env', 'run', 'tests-cli', 'wp', 'post', 'list',
			'--post_type=post', '--post_status=any', '--field=post_title' ],
		{ encoding: 'utf8' }
	);
}


/**
 * Close the welcome guide if it mounted.
 *
 * Writing the preference to user meta did NOT reliably suppress it, so this
 * closes the modal directly after load. Its overlay intercepts pointer events
 * and silently blocks every click in the editor — it presents as a click
 * timeout that looks exactly like the beforeunload prompt this spec is about,
 * which cost a debugging round.
 */
async function dismissWelcomeGuide( page ): Promise< void > {
	await page.evaluate( () => {
		try {
			window.wp.data
				.dispatch( 'core/preferences' )
				.set( 'core', 'welcomeGuide', false );
		} catch ( e ) {}
	} );

	const overlay = page.locator( '.components-modal__screen-overlay' );
	if ( await overlay.count() ) {
		await page.keyboard.press( 'Escape' );
	}
	await expect( overlay ).toHaveCount( 0 );
}

test.describe( 'UX-13 — autosave before leaving the post editor', () => {
	test.afterAll( () => setFullscreenMode( true ) );

	test( 'unsaved work is persisted before the toggle navigates', async ( {
		page,
	} ) => {
		setFullscreenMode( false );

		const title = `Unsaved draft ${ Date.now() }`;

		await page.goto( '/wp-admin/post-new.php' );
		await dismissWelcomeGuide( page );
		await expect(
			page.locator( '#wp-admin-bar-maestro-toggle' )
		).toBeVisible();

		// Dirty the post through the editor's own store.
		await page.evaluate(
			( t ) => window.wp.data.dispatch( 'core/editor' ).editPost( { title: t } ),
			title
		);
		await expect
			.poll( () =>
				page.evaluate( () =>
					window.wp.data.select( 'core/editor' ).isEditedPostDirty()
				)
			)
			.toBe( true );

		await page.locator( '#wp-admin-bar-maestro-toggle a' ).click();

		// It still goes where it was going.
		await expect( page ).toHaveURL( /maestro_edit=1/ );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();

		// And the work survived the trip.
		expect( persistedTitles() ).toContain( title );
	} );

	test( 'a clean post is not written to on the way out', async ( { page } ) => {
		setFullscreenMode( false );

		const before = persistedTitles().split( '\n' ).filter( Boolean ).length;

		await page.goto( '/wp-admin/post-new.php' );
		await dismissWelcomeGuide( page );
		await expect(
			page.locator( '#wp-admin-bar-maestro-toggle' )
		).toBeVisible();

		// Nothing edited — there is nothing to preserve, so nothing should be
		// created. Guard against "always autosave", which would litter drafts.
		await page.locator( '#wp-admin-bar-maestro-toggle a' ).click();
		await expect( page ).toHaveURL( /maestro_edit=1/ );

		expect( persistedTitles().split( '\n' ).filter( Boolean ).length ).toBe(
			before
		);
	} );
} );
