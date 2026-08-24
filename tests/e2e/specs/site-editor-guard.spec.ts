import { test, expect } from '../fixtures';
import { execFileSync } from 'child_process';

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
 * A preservation attempt, as opposed to any traffic whose URL says "autosaves".
 *
 * The Site Editor reads an existing autosave during bootstrap, and that GET's URL
 * also contains `autosaves`. Matching the bare word let the clean-template test
 * report a write the guard never made and — worse — let the dirty test pass on
 * that same read while proving nothing. Codex caught this on #178.
 */
function isAutosaveWrite( request ): boolean {
	if ( request.method() !== 'POST' ) {
		return false;
	}
	// Two URL shapes reach the same route: /wp-json/wp/v2/... with pretty
	// permalinks, and index.php?rest_route=%2Fwp%2Fv2%2F... with plain ones,
	// which is what wp-env uses. Decoding first matches both without a second
	// pattern.
	return /\/wp\/v2\/templates\/.+\/autosaves/.test(
		decodeURIComponent( request.url() )
	);
}

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
	/*
	 * Assert a block theme rather than inherit one.
	 *
	 * CI runs integration and e2e in the same job, integration first, and
	 * phpunit's bootstrap reinstalls WordPress into the same database — which
	 * clears `stylesheet` along with `active_plugins`. `pretest:e2e` restores the
	 * plugin but not the theme, so by the time these tests run there may be no
	 * active theme at all, and the Site Editor never resolves a template. That
	 * presented as three identical `waitForTemplate` timeouts, which look like a
	 * slow-CI problem and are not.
	 *
	 * Kept spec-local rather than folded into `pretest:e2e`: a failure here breaks
	 * one spec, whereas a bad theme slug in the shared hook would block the whole
	 * e2e run on any WordPress that ships a different default.
	 */
	test.beforeAll( () => {
		execFileSync(
			'npx',
			[ 'wp-env', 'run', 'tests-cli', 'wp', 'theme', 'activate', 'twentytwentyfive' ],
			{ stdio: 'ignore' }
		);
	} );

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
			if ( isAutosaveWrite( r ) ) { attempts.push( r.url() ); }
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

	test( 'a dirty template triggers a preservation WRITE before the toggle navigates', async ( {
		page,
	} ) => {
		const attempts: string[] = [];
		page.on( 'request', r => {
			if ( isAutosaveWrite( r ) ) { attempts.push( r.url() ); }
		} );

		await page.goto( '/wp-admin/site-editor.php' );
		await dirtyTemplate( page );

		expect(
			await page.evaluate( () => ( window as any ).maestroPostGuard.needsSave() )
		).toBe( true );

		await page.locator( '#wp-admin-bar-maestro-toggle a' ).click();
		await expect( page ).toHaveURL( /index\.php\?maestro_edit=1/ );

		expect(
			attempts.length,
			'a dirty template must trigger a preservation attempt'
		).toBeGreaterThan( 0 );
	} );

	/**
	 * The contract Codex asked for on #178 — and it was already met.
	 *
	 * I reported the opposite on #180, from a bad measurement: `save()` appearing
	 * to resolve in 28ms against a 4000ms hold, which would have meant
	 * `wp.data`'s `dispatch( 'core/editor' ).autosave()` settling on dispatch
	 * rather than on the response, and `entry.js` navigating with the autosave in
	 * flight. Re-measured with the interception counted, holding 4000ms, the
	 * shipped code resolves in **4102ms** with exactly one POST intercepted. It
	 * waits. #180 is closed as not reproducible.
	 *
	 * This test stays because the contract is worth pinning even though it already
	 * holds: a `save()` rewritten to fire-and-forget would resolve immediately and
	 * fail here.
	 *
	 * ASSERTED ON save(), NOT ON NAVIGATION, and that distinction cost three wrong
	 * turns worth recording:
	 *
	 *   1. hold the response, wait, assert page.url() has not changed — url() does
	 *      not update until the new document commits, hiding a navigation that has
	 *      already started;
	 *   2. assert total elapsed time to the new URL — loading the Dashboard takes
	 *      longer than the delay under test, so page-load time met the floor on
	 *      its own;
	 *   3. assert when the navigation REQUEST is issued — measured at ~3.1s
	 *      against a 3s hold for BOTH a correct and a deliberately-broken build.
	 *      Holding a route delays the page's navigation whatever the JS does, so
	 *      no navigation-level assertion can separate them.
	 */
	test( 'save() does not resolve until the autosave request lands', async ( {
		page,
	} ) => {
		const DELAY_MS = 3000;
		// Far above the milliseconds a fire-and-forget save() would take, and far
		// below DELAY_MS so scheduling jitter cannot trip it.
		const FLOOR_MS = 2000;

		await page.goto( '/wp-admin/site-editor.php' );
		await dirtyTemplate( page );

		let intercepted = 0;
		await page.route( '**/autosaves**', async route => {
			if ( route.request().method() !== 'POST' ) {
				await route.continue();
				return;
			}
			intercepted++;
			await new Promise( r => setTimeout( r, DELAY_MS ) );
			await route.continue();
		} );

		const elapsed = await page.evaluate( async () => {
			const t0 = performance.now();
			await ( window as any ).maestroPostGuard.save();
			return Math.round( performance.now() - t0 );
		} );

		// Without this the timing above proves nothing: a save() that never sent a
		// request would also "wait", and that is how the original 28ms reading
		// misled me.
		expect(
			intercepted,
			'the delay must have applied to a real autosave POST'
		).toBe( 1 );

		expect(
			elapsed,
			`save() resolved in ${ elapsed }ms against a ${ DELAY_MS }ms autosave; it must wait for the attempt to finish`
		).toBeGreaterThan( FLOOR_MS );
	} );

} );
