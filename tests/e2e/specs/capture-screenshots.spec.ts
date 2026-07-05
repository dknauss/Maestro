import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { execFileSync } from 'child_process';

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

/**
 * Phase 23 plan 05 — per-surface before/after captures across the UAT admin
 * colour-scheme set: Default ('fresh') + Modern + Midnight. Light is
 * deliberately NOT in the set (CONTEXT §UAT/verification).
 *
 * Colour scheme is set via `wp user meta update` against the running wp-env
 * tests-cli container (same container global-setup.ts provisions the admin
 * user against) — there is no in-browser UI path to switch schemes faster
 * than a page reload, and the profile-screen toggle would add an unrelated
 * navigation to every capture. Requires Docker/wp-env; MAESTRO_CAPTURE-gated
 * like every other capture in this spec, so normal `test:e2e` never touches it.
 */
const ADMIN_COLOR_SCHEMES = [ 'fresh', 'modern', 'midnight' ] as const;

function setAdminColorScheme( scheme: string ): void {
	execFileSync(
		'npx',
		[ 'wp-env', 'run', 'tests-cli', '--', 'wp', 'user', 'meta', 'update', 'admin', 'admin_color', scheme ],
		{ stdio: 'ignore' }
	);
}

function getAdminColorScheme(): string {
	const out = execFileSync(
		'npx',
		[ 'wp-env', 'run', 'tests-cli', '--', 'wp', 'user', 'meta', 'get', 'admin', 'admin_color' ],
		{ encoding: 'utf8' }
	).trim();
	// Empty user meta → WordPress renders the 'fresh' default scheme.
	return out || 'fresh';
}

const SURFACES_DIR = path.join( process.cwd(), 'tests', 'e2e', 'screenshots', 'surfaces' );

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

/**
 * Phase 23 plan 05 — per-surface before/after captures on Default ('fresh') +
 * Modern + Midnight admin colour schemes.
 *
 * "Before" state is not separately reconstructable (the phase's restyle is
 * already merged on this branch) — per-surface artifacts here are the "after"
 * deliverable; the before/after comparison lives in each plan's own SUMMARY.md
 * screenshots taken during live verification. This spec's job is the phase's
 * final spot-check: every converted surface reads as native wp-admin on all
 * three schemes named in CONTEXT §UAT/verification.
 *
 * Surfaces captured (no menu-column mode-zone — scrapped 2026-07-05):
 *   1. Bottom toolbar (incl. Reset All + no bottom Exit)
 *   2. The WP Toolbar "Exit Menu Editor" admin-bar toggle
 *   3. Shared panel (rename input + icon/visibility/reorder/reset-item controls)
 *   4. Icon popover (Dashicons tab)
 *   5. Visibility popover
 *   6. Coachmark (first-run tour, step 1 — proves BUG-08 + wp-pointer look)
 *   7. In-menu selection + centered modified dot
 */
test.describe( 'Phase 23 plan 05 — per-surface captures on Default/Modern/Midnight', () => {
	test.skip(
		! CAPTURE,
		'Set MAESTRO_CAPTURE=1 (npm run screenshots) to regenerate the committed Phase 23 surface PNGs.'
	);

	// Captured in beforeAll so afterAll restores the admin account's REAL
	// pre-existing scheme rather than assuming 'modern' — this spec mutates the
	// shared wp-env admin account and must leave it exactly as it found it.
	let originalAdminColor = 'fresh';

	test.beforeAll( () => {
		fs.mkdirSync( SURFACES_DIR, { recursive: true } );
		originalAdminColor = getAdminColorScheme();
	} );

	// Restore the admin account's original scheme once every scheme has run, so
	// this spec never leaves the shared wp-env admin account on a scheme other
	// specs did not opt into.
	test.afterAll( () => {
		setAdminColorScheme( originalAdminColor );
	} );

	for ( const scheme of ADMIN_COLOR_SCHEMES ) {
		test.describe( `admin colour scheme: ${ scheme }`, () => {
			test.beforeAll( () => {
				setAdminColorScheme( scheme );
			} );

			test( `toolbar (incl. Reset All, no bottom Exit) + admin-bar "Exit Menu Editor" toggle — ${ scheme }`, async ( { page } ) => {
				await page.goto( '/wp-admin/index.php?maestro_edit=1' );

				const toolbar = page.locator( '.maestro-toolbar' );
				await expect( toolbar ).toBeVisible();

				// The bottom toolbar carries Reset All but NOT an Exit control —
				// confirm absence before capturing (regression guard, not just artifact).
				await expect( toolbar.locator( '.maestro-exit' ) ).toHaveCount( 0 );
				await expect( toolbar.locator( '.maestro-reset-all' ) ).toBeVisible();

				await toolbar.screenshot( {
					path: path.join( SURFACES_DIR, `toolbar-${ scheme }.png` ),
				} );

				// The single entry/exit + mode indicator lives on the WP Toolbar.
				const toggle = page.locator( '#wp-admin-bar-maestro-toggle' );
				await expect( toggle ).toContainText( 'Exit Menu Editor' );
				await toggle.screenshot( {
					path: path.join( SURFACES_DIR, `admin-bar-toggle-${ scheme }.png` ),
				} );
			} );

			test( `shared panel — ${ scheme }`, async ( { page } ) => {
				await page.goto( '/wp-admin/index.php?maestro_edit=1' );
				await page.locator( '#menu-posts > a.menu-top' ).click();

				const panel = page.locator( '.maestro-toolbar .maestro-panel' );
				await expect( panel ).toBeVisible();
				await panel.screenshot( {
					path: path.join( SURFACES_DIR, `panel-${ scheme }.png` ),
				} );
			} );

			test( `icon popover — ${ scheme }`, async ( { page } ) => {
				await page.goto( '/wp-admin/index.php?maestro_edit=1' );
				await page.locator( '#menu-posts > a.menu-top' ).click();
				const panel = page.locator( '.maestro-toolbar .maestro-panel' );
				await expect( panel ).toBeVisible();
				await panel.locator( '.maestro-icon-btn' ).click();

				const popover = page.locator( '.maestro-icon-popover' );
				await expect( popover ).toBeVisible();
				await popover.screenshot( {
					path: path.join( SURFACES_DIR, `icon-popover-${ scheme }.png` ),
				} );
				await page.keyboard.press( 'Escape' );
			} );

			test( `visibility popover — ${ scheme }`, async ( { page } ) => {
				await page.goto( '/wp-admin/index.php?maestro_edit=1' );
				await page.locator( '#menu-media > a.menu-top' ).click();
				const panel = page.locator( '.maestro-toolbar .maestro-panel' );
				await expect( panel ).toBeVisible();
				await panel.locator( '.maestro-vis-btn' ).click();

				const popover = page.locator( '.maestro-vis-popover' );
				await expect( popover ).toBeVisible();
				await popover.screenshot( {
					path: path.join( SURFACES_DIR, `visibility-popover-${ scheme }.png` ),
				} );
				await page.keyboard.press( 'Escape' );
			} );

			test( `coachmark (first-run tour, step 1) — ${ scheme }`, async ( { page } ) => {
				await page.goto( '/wp-admin/index.php?maestro_edit=1' );
				await page.evaluate( () => window.localStorage.removeItem( 'maestroFirstRunDone' ) );
				await page.reload();
				await page.waitForSelector( '#adminmenu li.maestro-item' );

				const tour = page.locator( '.maestro-tour' );
				await expect( tour ).toBeVisible();
				await tour.screenshot( {
					path: path.join( SURFACES_DIR, `coachmark-${ scheme }.png` ),
				} );

				// Dismiss so the next test in this file starts from a clean slate.
				await page.keyboard.press( 'Escape' );
				await expect( tour ).toHaveCount( 0 );
			} );

			test( `in-menu selection + centered modified dot — ${ scheme }`, async ( { page } ) => {
				await page.goto( '/wp-admin/index.php?maestro_edit=1' );
				await page.locator( '#menu-posts > a.menu-top' ).click();
				const panel = page.locator( '.maestro-toolbar .maestro-panel' );
				await expect( panel ).toBeVisible();

				// Produce the modified dot so the capture shows both selection tint
				// and the non-colour dot marker together.
				const rename = panel.locator( '.maestro-rename-input' );
				const savePosted = page.waitForResponse(
					( r ) => r.url().includes( '/maestro/v1/config' ) && r.request().method() === 'POST' && r.ok()
				);
				await rename.fill( 'Articles' );
				await rename.press( 'Enter' );
				await savePosted;
				await expect( page.locator( '#menu-posts' ) ).toHaveClass( /maestro-modified/ );

				await page.locator( '#menu-posts' ).screenshot( {
					path: path.join( SURFACES_DIR, `in-menu-selection-dot-${ scheme }.png` ),
				} );

				// Clean up so the next scheme/test starts from a stable baseline.
				page.once( 'dialog', ( d ) => d.accept() );
				await page.locator( '.maestro-reset-all' ).click();
				await expect( page.locator( '#menu-posts .wp-menu-name' ) ).toContainText( 'Posts' );
			} );
		} );
	}
} );
