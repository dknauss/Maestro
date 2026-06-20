import { test, expect } from '@playwright/test';

/**
 * HARD-03 — Playwright E2E regression coverage for the autosave/reset/exit
 * save races hardened in PR #36 (waitForSaveIdle, cancelQueuedAutosave,
 * doResetAll awaiting in-flight saves and checking response.ok).
 *
 * Three races are covered:
 *   (a) Slow save + Exit: onExit() defers navigation until POST settles.
 *   (b) Pending rename + Reset All: cancelQueuedAutosave() kills the queued
 *       autosave so no POST fires; DELETE wins. (Added in Task 2.)
 *   (c) In-flight save + Reset All: doResetAll() awaits the in-flight POST
 *       before issuing DELETE; only reloads on r.ok.
 *
 * All three races use page.route() to inject a 2-second POST delay BEFORE
 * navigation so the race window is real. Assertions are web-first (Playwright
 * waitForResponse / toHaveURL). No assertion sleeps.
 *
 * NOTE: Docker/sandbox cannot run in the GSD executor sandbox. This spec is
 * authored per the Phase 9 wave-boundary pattern: execute at the Wave 2
 * boundary (sandbox-disabled, Docker) alongside Plan 04's regression gate.
 * Do NOT mark HARD-03 done until the full suite green run is confirmed.
 *
 * Run: `npm run env:start` then `npm run test:e2e`
 */

const POST_SAVE = ( url: string ) => url.includes( '/maestro/v1/config' );

/**
 * Inject a 2-second delay into every POST to /maestro/v1/config so the spec
 * can interact with the page while an autosave is in flight. MUST be called
 * BEFORE page.goto() so the route is active when the page fires its first save.
 */
async function installPostDelay( page: Parameters<typeof test>[1]['page'] ) {
	await page.route( '**/maestro/v1/config*', async ( route ) => {
		if ( route.request().method() === 'POST' ) {
			await new Promise< void >( r => setTimeout( r, 2000 ) );
		}
		await route.continue();
	} );
}

test.describe( 'HARD-03 — save-race regression coverage', () => {

	/**
	 * Race (a): slow save + Exit
	 *
	 * State: saveTimer fired / inFlight set (POST in flight, delayed by route).
	 *
	 * Expected: onExit() calls e.preventDefault() + waitForSaveIdle(), so clicking Exit
	 * while a POST is in flight does NOT immediately navigate. After the POST settles,
	 * waitForSaveIdle().then(…) fires and navigates to D.exitUrl.
	 *
	 * Assertions:
	 *   - While POST is in flight: URL still contains 'maestro_edit=1' (page did not leave).
	 *   - After POST response: URL does NOT contain 'maestro_edit=1' (navigation happened).
	 */
	test( 'race (a): Exit defers navigation until in-flight POST settles', async ( { page } ) => {
		// Install the POST delay BEFORE navigation so it intercepts the save triggered by the rename.
		await installPostDelay( page );

		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();

		// Select Posts and type a rename to queue an autosave (saveTimer) and trigger a POST.
		await page.locator( '#menu-posts > a.menu-top' ).click();
		const panel = page.locator( '.maestro-toolbar .maestro-panel' );
		await expect( panel ).toBeVisible();

		const rename = panel.locator( '.maestro-rename-input' );
		await expect( rename ).toBeVisible();

		// Fill and press Enter: blurs the input, commits, schedules autosave -> POST fires.
		await rename.fill( 'ArticlesRaceA' );

		// Start watching for the POST response BEFORE pressing Enter so we don't miss it.
		const postResponse = page.waitForResponse(
			r => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
		);

		await rename.press( 'Enter' );

		// Click Exit immediately — the POST is now in flight (delayed 2s by route).
		await page.locator( '.maestro-exit' ).click();

		// While the slow POST is in flight, the URL must still contain maestro_edit=1.
		// onExit() called e.preventDefault() and is waiting for waitForSaveIdle().
		await expect( page ).toHaveURL( /maestro_edit=1/ );

		// Wait for the delayed POST to settle (up to 6s: 2s delay + WP round-trip).
		await postResponse;

		// After the POST settles, waitForSaveIdle().then() fires -> window.location.href = D.exitUrl.
		// The exit URL does NOT contain maestro_edit=1.
		await expect( page ).not.toHaveURL( /maestro_edit=1/, { timeout: 6000 } );
	} );

	/**
	 * Race (c): in-flight save + Reset All
	 *
	 * State: inFlight set (POST in flight), saveTimer null.
	 *
	 * Expected: doResetAll() calls cancelQueuedAutosave() (no-op here, saveTimer null)
	 * then awaits (inFlight || resolve()), issues DELETE only after POST settles,
	 * and reloads on r.ok.
	 *
	 * Assertions:
	 *   - The POST response is observed BEFORE the DELETE response (captured in order array).
	 *   - The DELETE response is ok.
	 *   - The page reloads (navigation happens after successful DELETE).
	 */
	test( 'race (c): Reset All waits for in-flight POST before issuing DELETE', async ( { page } ) => {
		await installPostDelay( page );

		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();

		// Select Posts, type a rename, press Enter to fire an autosave POST.
		await page.locator( '#menu-posts > a.menu-top' ).click();
		const panel = page.locator( '.maestro-toolbar .maestro-panel' );
		await expect( panel ).toBeVisible();

		const rename = panel.locator( '.maestro-rename-input' );
		await expect( rename ).toBeVisible();
		await rename.fill( 'ArticlesRaceC' );

		// Capture response order: observe both the POST and the DELETE.
		const responses: string[] = [];

		// Register listeners for the POST and DELETE before triggering them.
		const postDone = page.waitForResponse( r => {
			if ( POST_SAVE( r.url() ) && r.request().method() === 'POST' ) {
				responses.push( 'POST' );
				return true;
			}
			return false;
		} );
		const deleteDone = page.waitForResponse( r => {
			if ( POST_SAVE( r.url() ) && r.request().method() === 'DELETE' ) {
				responses.push( 'DELETE' );
				return true;
			}
			return false;
		} );

		// Trigger the POST (rename commits + autosave fires).
		await rename.press( 'Enter' );

		// Immediately accept the Reset All confirm and click the button while POST is in flight.
		page.once( 'dialog', d => d.accept() );
		await page.locator( '.maestro-reset-all' ).click();

		// Await both responses.
		const deleteResp = await deleteDone;
		await postDone;

		// The POST must have been observed before the DELETE (doResetAll awaits inFlight).
		expect( responses[ 0 ] ).toBe( 'POST' );
		expect( responses[ 1 ] ).toBe( 'DELETE' );

		// The DELETE must be ok (doResetAll only reloads on r.ok).
		expect( deleteResp.ok() ).toBe( true );

		// doResetAll calls window.location.reload() on success — page reloads.
		// After reload the toolbar must be present (confirming successful navigation).
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible( { timeout: 8000 } );
	} );

	/**
	 * Race (b): pending rename + Reset All (no POST fires)
	 *
	 * State: saveTimer set (debounce queued, 500ms), inFlight null.
	 *
	 * Expected: cancelQueuedAutosave() kills the saveTimer before the debounce
	 * elapses, so NO POST fires. The DELETE fires immediately (inFlight null ->
	 * (inFlight || Promise.resolve()) resolves immediately), and the page reloads.
	 * After reload the rename did NOT persist (reset state).
	 *
	 * Assertions:
	 *   - Zero POST requests to /maestro/v1/config observed between the rename
	 *     and the DELETE (counted via page.on('request') — deterministic, no timeout).
	 *   - DELETE response is ok.
	 *   - After reload, the menu item shows its default title, not the typed rename.
	 */
	test( 'race (b): Reset All cancels queued autosave — no POST fires, DELETE wins', async ( { page } ) => {
		// No POST delay needed for this race (saveTimer is killed before it fires).
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();

		// Count any POST requests to the config endpoint fired between rename and DELETE.
		let postCount = 0;
		page.on( 'request', req => {
			if ( POST_SAVE( req.url() ) && req.method() === 'POST' ) {
				postCount++;
			}
		} );

		// Select Posts and type into the rename input but do NOT commit (no Enter/blur).
		// scheduleAutosave() sets saveTimer but does NOT fire a POST yet (500ms debounce).
		await page.locator( '#menu-posts > a.menu-top' ).click();
		const panel = page.locator( '.maestro-toolbar .maestro-panel' );
		await expect( panel ).toBeVisible();

		const rename = panel.locator( '.maestro-rename-input' );
		await expect( rename ).toBeVisible();

		// Type character-by-character to trigger scheduleAutosave without committing.
		// page.keyboard.type fires input events on each character, resetting the 500ms timer.
		await rename.click();
		await rename.fill( '' );
		await page.keyboard.type( 'ArticlesRaceB' );

		// Immediately click Reset All BEFORE the 500ms debounce fires.
		const deleteDone = page.waitForResponse(
			r => POST_SAVE( r.url() ) && r.request().method() === 'DELETE' && r.ok()
		);
		page.once( 'dialog', d => d.accept() );
		await page.locator( '.maestro-reset-all' ).click();

		// Wait for the DELETE (should arrive quickly — no queued POST to await).
		await deleteDone;

		// Assert: zero POST requests fired between the rename and the DELETE.
		// cancelQueuedAutosave() must have cleared the saveTimer.
		expect( postCount, 'cancelQueuedAutosave() should have prevented any POST' ).toBe( 0 );

		// doResetAll reloads the page on success — wait for the toolbar to confirm reload.
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible( { timeout: 6000 } );

		// After reload, the rename must NOT have persisted — the menu item shows its
		// default title ("Posts"), not the typed value ("ArticlesRaceB").
		await expect( page.locator( '#menu-posts .wp-menu-name' ) ).toContainText( 'Posts' );
		await expect( page.locator( '#menu-posts .wp-menu-name' ) ).not.toContainText( 'ArticlesRaceB' );
	} );

} );
