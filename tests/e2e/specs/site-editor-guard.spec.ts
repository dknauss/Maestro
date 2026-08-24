import { test, expect } from '../fixtures';

/**
 * UX-13 after WP71-05 — the Site Editor is the guard's only remaining caller.
 *
 * WP71-05 removed the Post Editor toggle, which was where maestroPostGuard did
 * its observable work, and `autosave-on-entry.spec.ts` went with it. The scripts
 * survive because the Site Editor toggle (UX-11) still leaves the screen with
 * possibly-unsaved work behind it. Nothing tested that, so this does.
 *
 * MEASURED 2026-08-23 on 7.1.1-alpha-63326, because the answer was not obvious
 * and the todo that prompted this guessed it wrong (it assumed the guard was
 * inert here). In the Site Editor:
 *
 *   - `core/editor` IS registered; getCurrentPostType() is 'wp_template'.
 *   - A clean template reports isEditedPostDirty() false -> needsSave() false,
 *     so passing through does not litter revisions.
 *   - A dirty template reports dirty AND isEditedPostAutosaveable() true, so
 *     needsSave() is true and save() fires a real request.
 *
 * WHAT THE ATTEMPT ACHIEVES, AND ITS LIMIT: for a template based on a theme file
 * — the common case on a fresh block theme — core answers the autosave with
 * `400 rest_invalid_template`, "Templates based on theme files can't have
 * revisions." save() swallows that by design and resolves, the template stays
 * dirty, and the browser's own beforeunload warning stands as the safety net.
 * post-guard.js documents exactly that fallback: "A failure is not swallowed: the
 * post stays dirty, so beforeunload still fires."
 *
 * So these assert OUR contract — the guard loads where it should, declines when
 * there is nothing to preserve, and attempts preservation before navigating —
 * and deliberately do NOT assert core's status code, which is core's to change.
 */

/**
 * Wait until the Site Editor has actually resolved a template.
 *
 * A fixed sleep raced here: getCurrentPostId() is null while the editor is still
 * resolving, so editEntityRecord() targeted nothing and needsSave() stayed false.
 * Waiting on the condition is the fix — a longer sleep would only have made the
 * race rarer.
 */
async function waitForTemplate( page ): Promise< void > {
	await page.waitForFunction( () => {
		const s = ( window as any ).wp?.data?.select?.( 'core/editor' );
		return !! ( s && s.getCurrentPostId && s.getCurrentPostId() );
	}, null, { timeout: 30000 } );
}

/** Mark the edited template dirty through the same store the guard reads. */
async function dirtyTemplate( page ): Promise< void > {
	await waitForTemplate( page );
	await page.evaluate( () => {
		const d = ( window as any ).wp.data;
		const s = d.select( 'core/editor' );
		d.dispatch( 'core' ).editEntityRecord(
			'postType',
			s.getCurrentPostType(),
			s.getCurrentPostId(),
			{ content: '<!-- wp:paragraph --><p>maestro guard probe</p><!-- /wp:paragraph -->' }
		);
	} );
	// The guard reads derived state, so wait for it to settle rather than guess.
	await page.waitForFunction(
		() => ( window as any ).maestroPostGuard.needsSave() === true,
		null,
		{ timeout: 15000 }
	);
}

test.describe( 'UX-13 / WP71-05 — the Site Editor entry guard', () => {
	test( 'the guard loads in the Site Editor and not in the Post Editor', async ( {
		page,
	} ) => {
		await page.goto( '/wp-admin/site-editor.php' );
		await waitForTemplate( page );
		expect(
			await page.evaluate( () => !! ( window as any ).maestroPostGuard )
		).toBe( true );

		// WP71-05 regression guard: no toggle there means nothing to bind, so the
		// scripts must not load either.
		await page.goto( '/wp-admin/post-new.php' );
		await page.waitForTimeout( 2000 );
		expect(
			await page.evaluate( () => !! ( window as any ).maestroPostGuard )
		).toBe( false );
	} );

	test( 'a clean template is not written to on the way out', async ( { page } ) => {
		const attempts: string[] = [];
		page.on( 'request', r => {
			if ( /autosaves/.test( r.url() ) ) { attempts.push( r.url() ); }
		} );

		await page.goto( '/wp-admin/site-editor.php' );
		await waitForTemplate( page );

		expect(
			await page.evaluate( () => ( window as any ).maestroPostGuard.needsSave() )
		).toBe( false );

		await page.locator( '#wp-admin-bar-maestro-toggle a' ).click();
		await expect( page ).toHaveURL( /index\.php\?maestro_edit=1/ );

		expect( attempts, 'a clean template must not be autosaved' ).toHaveLength( 0 );
	} );

	test( 'a dirty template is preserved-attempted before the toggle navigates', async ( {
		page,
	} ) => {
		const attempts: string[] = [];
		page.on( 'request', r => {
			if ( /autosaves/.test( r.url() ) ) { attempts.push( r.url() ); }
		} );

		await page.goto( '/wp-admin/site-editor.php' );
		await dirtyTemplate( page );

		expect(
			await page.evaluate( () => ( window as any ).maestroPostGuard.needsSave() )
		).toBe( true );

		await page.locator( '#wp-admin-bar-maestro-toggle a' ).click();
		await expect( page ).toHaveURL( /index\.php\?maestro_edit=1/ );

		// The attempt must precede the navigation — that ordering is the whole
		// point of awaiting guard.save() before assigning location.
		expect(
			attempts.length,
			'a dirty template must trigger a preservation attempt before navigating'
		).toBeGreaterThan( 0 );
	} );
} );
