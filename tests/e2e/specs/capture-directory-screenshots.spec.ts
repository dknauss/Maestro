import { test, expect } from '@playwright/test';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * MAESTRO_CAPTURE-gated capture spec for the WordPress.org directory screenshots.
 *
 * Captures the v1.2 editor UI against the final post-Phase-11.2 icon-only toolbar:
 *   1. Editor active — toolbar + selected-item controls (full context)
 *   2. Icon picker open (full context)
 *   3. Per-role visibility selector — cropped to the bottom (menu + popover + toolbar)
 *   4. Renamed item + "Saved" state — cropped to the left half (menu + toolbar)
 *   5. Reordering a top-level menu GROUP — zoomed mid-drag (live sortable helper)
 *   6. Reordering a sub-ITEM in a submenu — zoomed mid-drag
 *
 * GUARD: skipped unless MAESTRO_CAPTURE is set (via `npm run screenshots`), so a normal
 * `test:e2e` / CI run never regenerates the committed PNGs. Gate is at the describe level.
 *
 * Auth: inherits the shared storageState admin session from playwright.config.ts.
 * Each screenshot is written to both a durable review dir and the wp.org publish target.
 */

const CAPTURE = Boolean( process.env.MAESTRO_CAPTURE );

// Durable review location — NOT an archived phase dir (writing under
// .planning/phases/ resurrected already-archived milestone dirs on capture).
const SCREENSHOTS_DIR = path.join(
	process.cwd(),
	'tests',
	'e2e',
	'screenshots',
	'directory'
);
const WP_ORG_DIR = path.join( process.cwd(), '.wordpress-org' );

// ROLE-02: a fixture person for the screenshot-3 picker. Deliberately fictional
// — a directory screenshot must never expose a real site's user list.
const SHOT_USER_LOGIN = 'maestro_shot_user';
const SHOT_USER_NAME = 'Robin Example';

function wp( args: string[] ): void {
	try {
		execFileSync( 'npx', [ 'wp-env', 'run', 'tests-cli', 'wp', ...args ], { stdio: 'ignore' } );
	} catch ( e ) {
		// Creating a user that already survives an interrupted run, or deleting
		// one that is already gone, exits non-zero — both are the desired state.
	}
}

async function dualShot(
	page: import( '@playwright/test' ).Page,
	n: number,
	opts?: import( '@playwright/test' ).PageScreenshotOptions
) {
	const filename = `screenshot-${ n }.png`;
	await page.screenshot( { ...opts, path: path.join( SCREENSHOTS_DIR, filename ) } );
	await page.screenshot( { ...opts, path: path.join( WP_ORG_DIR, filename ) } );
}

async function enterEditorAndSelect( page: import( '@playwright/test' ).Page ) {
	await page.setViewportSize( { width: 1440, height: 980 } );
	await page.goto( '/wp-admin/index.php?maestro_edit=1' );
	await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
	// Click the top-level row's OWN anchor, not the <li>. On the Dashboard the
	// current item's submenu is expanded *inside* its <li>, so a plain
	// `li.maestro-item` click lands on the centre of that box — a submenu child —
	// and selects a sub-item (which correctly has no icon picker). Targeting the
	// anchor pins the selection to the top-level item these captures are meant
	// to show.
	const firstItem = page.locator( '#adminmenu > li.menu-top.maestro-item' ).first();
	await expect( firstItem ).toBeVisible();
	await firstItem.locator( '> a' ).first().click();
	await expect( page.locator( '.maestro-panel' ) ).toBeVisible();
	// Guard the intent: a top-level selection must expose the icon picker.
	await expect( page.locator( '.maestro-icon-btn' ) ).toBeVisible();
}

test.describe( 'Directory screenshots — v1.2 editor UI (MAESTRO_CAPTURE-gated)', () => {
	test.skip(
		! CAPTURE,
		'Set MAESTRO_CAPTURE=1 (npm run screenshots) to regenerate the directory screenshots.'
	);

	test.beforeAll( () => {
		fs.mkdirSync( SCREENSHOTS_DIR, { recursive: true } );
	} );

	// Suppress the first-run guided tour so its (aria-modal, focus-trapping)
	// coachmark doesn't overlay or block the captured editor screenshots. The
	// seen-flag must be set before the editor script runs, so use addInitScript.
	test.beforeEach( async ( { page } ) => {
		await page.addInitScript( () => {
			try {
				window.localStorage.setItem( 'maestroFirstRunDone', '1' );
			} catch ( e ) {
				// Storage blocked — capture may show the tour; not fatal.
			}
		} );
	} );

	// 1 — Editor active, top-level item selected (full context).
	test( 'screenshot 1 — editor toolbar + selected item controls', async ( { page } ) => {
		await enterEditorAndSelect( page );
		await expect( page.locator( '.maestro-rename-input' ) ).toBeVisible();
		await dualShot( page, 1 );
	} );

	// 2 — Icon picker open (full context).
	test( 'screenshot 2 — icon picker open', async ( { page } ) => {
		await enterEditorAndSelect( page );
		await expect( page.locator( '.maestro-icon-btn' ) ).toBeVisible();
		await page.locator( '.maestro-icon-btn' ).click();
		await expect( page.locator( '.maestro-icon-popover' ) ).toBeVisible();
		await dualShot( page, 2 );
	} );

	// 3 — Visibility selector, cropped to the bottom area (menu + popover + toolbar).
	test( 'screenshot 3 — visibility: role AND person groups (cropped to menu + selector)', async ( { page } ) => {
		// ROLE-02: the popover now carries FOUR groups — hide-by-role and
		// hide-by-person, each in an "this item" and "its sub-items" variant.
		// The person groups are captured POPULATED: an empty search box
		// photographs as a text field, whereas a chip photographs as a feature.
		// The fixture name is obviously fictional so the listing never shows a
		// real site's user list.
		wp( [ 'user', 'create', SHOT_USER_LOGIN, `${ SHOT_USER_LOGIN }@example.com`,
			'--role=editor', `--display_name=${ SHOT_USER_NAME }`, '--user_pass=password' ] );

		try {
			await enterEditorAndSelect( page );
			await expect( page.locator( '.maestro-vis-btn' ) ).toBeVisible();
			await page.locator( '.maestro-vis-btn' ).click();
			const pop = page.locator( '.maestro-vis-popover' );
			await expect( pop ).toBeVisible();

			// Populate the item-level person group so a chip renders.
			const ownUsers = pop.locator( '.maestro-vis-own-users' );
			await ownUsers.locator( '.maestro-user-search' ).fill( SHOT_USER_NAME.split( ' ' )[ 0 ] );
			const hit = ownUsers.locator( '.maestro-user-result' )
				.filter( { hasText: SHOT_USER_NAME } ).first();
			await expect( hit ).toBeVisible( { timeout: 15000 } );
			await hit.click();
			await expect( ownUsers.locator( '.maestro-user-chip' ) ).toContainText( SHOT_USER_NAME );

			// Let the search field settle back to its placeholder so the capture
			// shows the resting state rather than a half-typed query.
			await expect( ownUsers.locator( '.maestro-user-results' ) ).toBeHidden();

			const tb = ( await page.locator( '.maestro-toolbar' ).boundingBox() )!;
			const pb = ( await pop.boundingBox() )!;
			const top = Math.max( 0, Math.min( pb.y, tb.y ) - 30 );
			const right = Math.min( 1440, Math.max( pb.x + pb.width + 30, 1000 ) );
			await dualShot( page, 3, {
				clip: { x: 0, y: top, width: right, height: 980 - top },
			} );
		} finally {
			// Always clean up, even if the capture throws — a leftover fixture
			// user would otherwise surface in an unrelated spec's picker.
			wp( [ 'user', 'delete', SHOT_USER_LOGIN, '--yes' ] );
		}
	} );

	// 4 — Renamed item + "Saved", cropped to the left half (menu + toolbar).
	test( 'screenshot 4 — renamed item, "Saved" (cropped to menu + toolbar)', async ( { page } ) => {
		await enterEditorAndSelect( page );
		const renameInput = page.locator( '.maestro-rename-input' );
		await expect( renameInput ).toBeVisible();
		// Always pick a name different from the current value so the rename actually
		// commits + autosaves (otherwise the "Saved" tile never fires). Alternates so
		// repeated capture runs each produce a real change.
		const current = ( await renameInput.inputValue() ).trim();
		const target = current === 'My Content Hub' ? 'My Media Library' : 'My Content Hub';
		await renameInput.fill( target );
		await renameInput.blur();
		await expect(
			page.locator( '.maestro-status.maestro-status-saved' )
		).toBeVisible( { timeout: 10000 } );
		await dualShot( page, 4, { clip: { x: 0, y: 0, width: 720, height: 980 } } );
	} );

	// 5 — Reordering a top-level menu GROUP: zoomed mid-drag (live sortable helper).
	test( 'screenshot 5 — reorder a top-level menu group (zoomed mid-drag)', async ( { page } ) => {
		await page.setViewportSize( { width: 1440, height: 980 } );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();

		const item = page.locator( '#adminmenu > li.menu-top.maestro-item' ).nth( 3 );
		await expect( item ).toBeVisible();
		const b = ( await item.boundingBox() )!;

		await page.mouse.move( b.x + b.width / 2, b.y + b.height / 2 );
		await page.mouse.down();
		// Drag well past the sortable tolerance so the lifted helper clearly separates
		// from its origin placeholder (reads obviously as drag-to-reorder).
		await page.mouse.move( b.x + b.width / 2, b.y + b.height / 2 + 128, { steps: 18 } );
		await expect( page.locator( '.ui-sortable-helper' ) ).toBeVisible( { timeout: 4000 } );

		await dualShot( page, 5, {
			clip: { x: 0, y: Math.max( 0, b.y - 70 ), width: 440, height: 360 },
		} );
		await page.mouse.up();
	} );

	// 6 — Reordering a sub-ITEM with the ▲/▼ move controls (button-based, OS-independent —
	// the alternative to drag, and the accessible/keyboard path).
	test( 'screenshot 6 — reorder a submenu item with the move controls', async ( { page } ) => {
		await page.setViewportSize( { width: 1440, height: 980 } );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();

		// Select a clear submenu item (Posts → Categories). Selecting a sub-item shows the
		// panel with the ▲/▼ move controls (the icon button is top-level-only and hidden here).
		const sub = page.locator( '#menu-posts .wp-submenu > li.maestro-subitem' ).nth( 2 );
		await expect( sub ).toBeVisible();
		await sub.click();
		await expect( page.locator( '.maestro-panel' ) ).toBeVisible();

		// Highlight the ▼ move control (hover state) so the reorder affordance reads clearly.
		const moveDown = page.locator( '.maestro-toolbar .maestro-move-down' );
		await expect( moveDown ).toBeVisible();
		await moveDown.hover();

		// Left half: the selected sub-item (highlighted, top) + the toolbar ▲/▼ controls (bottom).
		await dualShot( page, 6, { clip: { x: 0, y: 0, width: 720, height: 980 } } );
	} );
} );
