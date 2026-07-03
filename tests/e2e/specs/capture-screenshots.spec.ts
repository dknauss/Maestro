import { test, expect } from '@playwright/test';
import * as path from 'path';

/**
 * Deterministic artifact generator for the UX-08a mobile editor-entry toggle.
 *
 * This is NOT a gate — the authoritative icon-only / visibility assertions live in the
 * UX-08a e2e guard in `tests/e2e/editor.spec.ts` (owned by 11-01/11-02). This spec only
 * captures committed PNGs of the FIXED icon-only state at 782px and 600px so the phase
 * gate has a regenerable visual artifact (replacing the old manual browser handoff).
 *
 * GUARD: skipped unless MAESTRO_CAPTURE is set (via `npm run screenshots`), so the normal
 * `test:e2e` / CI run never regenerates or overwrites the committed PNGs.
 *
 * Auth: inherits the shared storageState admin session from playwright.config.ts
 * (global-setup logs in once) — same path every other spec uses. No bespoke auth.
 */

const CAPTURE = Boolean( process.env.MAESTRO_CAPTURE );

// Durable capture location — NOT an archived phase dir. Writing under
// .planning/phases/ resurrected already-archived milestone dirs on every
// `npm run screenshots`; keep generated PNGs beside the spec instead.
const SCREENSHOT_DIR = path.join(
	process.cwd(),
	'tests',
	'e2e',
	'screenshots',
	'mobile-entry'
);

test.describe( 'UX-08a — mobile editor-entry toggle capture (artifact only)', () => {
	test.skip(
		! CAPTURE,
		'Set MAESTRO_CAPTURE=1 (npm run screenshots) to regenerate the committed UX-08a PNGs.'
	);

	for ( const width of [ 782, 600 ] ) {
		test( `capture icon-only toggle at ${ width }px`, async ( { page } ) => {
			await page.setViewportSize( { width, height: 800 } );
			await page.goto( '/wp-admin/index.php?maestro_edit=1' );

			// Wait on the SAME Maestro-specific anchor the UX-08a guard asserts, so a wrong
			// or error page cannot satisfy the wait and capture a misleading screenshot.
			const toggle = page.locator( '#wp-admin-bar-maestro-toggle' );
			await expect( toggle ).toBeVisible();

			// Cheap re-assert that we are capturing the icon-only state (authoritative
			// assertions live in editor.spec.ts UX-08a).
			await expect(
				page.locator( '#wp-admin-bar-maestro-toggle .ab-icon' )
			).toBeVisible();
			const box = await toggle.boundingBox();
			expect( box, `toggle must be in the DOM at ${ width }px` ).not.toBeNull();
			expect(
				box!.width,
				`toggle must be icon-only (narrow) at ${ width }px`
			).toBeLessThanOrEqual( 60 );

			await page.screenshot( {
				path: path.join( SCREENSHOT_DIR, `ux-08a-${ width }.png` ),
			} );
		} );
	}
} );

test.describe( 'UX-08a — mobile editor-ENTER toggle capture (artifact only)', () => {
	test.skip(
		! CAPTURE,
		'Set MAESTRO_CAPTURE=1 (npm run screenshots) to regenerate the committed UX-08a enter-state PNGs.'
	);

	// ENTER state: the user is NOT yet editing (no maestro_edit param) — the exact
	// scenario UAT 2026-06-21 found broken on mobile. 11-06 made the toggle reachable
	// here by enqueuing maestro-admin-bar.css before the is_edit_mode() early return.
	for ( const width of [ 782, 600 ] ) {
		test( `capture icon-only ENTER toggle at ${ width }px`, async ( { page } ) => {
			await page.setViewportSize( { width, height: 800 } );
			// NO maestro_edit param — the enter (non-edit) state.
			await page.goto( '/wp-admin/index.php' );

			// Same Maestro-specific anchor the UX-08a enter-state guard asserts, so a wrong
			// or error page cannot satisfy the wait and capture a misleading screenshot.
			const toggle = page.locator( '#wp-admin-bar-maestro-toggle' );
			await expect( toggle ).toBeVisible();

			await expect(
				page.locator( '#wp-admin-bar-maestro-toggle .ab-icon' )
			).toBeVisible();
			const box = await toggle.boundingBox();
			expect( box, `enter toggle must be in the DOM at ${ width }px` ).not.toBeNull();
			expect(
				box!.width,
				`enter toggle must be icon-only (narrow) at ${ width }px`
			).toBeLessThanOrEqual( 60 );

			await page.screenshot( {
				path: path.join( SCREENSHOT_DIR, `ux-08a-enter-${ width }.png` ),
			} );
		} );
	}
} );
