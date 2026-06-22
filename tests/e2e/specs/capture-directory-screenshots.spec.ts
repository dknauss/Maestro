import { test, expect } from '@playwright/test';
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
 * Each screenshot is written to both the planning review dir and the wp.org publish target.
 */

const CAPTURE = Boolean( process.env.MAESTRO_CAPTURE );

const SCREENSHOTS_DIR = path.join(
	process.cwd(),
	'.planning',
	'phases',
	'12-release-assets-refresh',
	'screenshots'
);
const WP_ORG_DIR = path.join( process.cwd(), '.wordpress-org' );

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
	const firstItem = page.locator( 'li.maestro-item' ).first();
	await expect( firstItem ).toBeVisible();
	await firstItem.click();
	await expect( page.locator( '.maestro-panel' ) ).toBeVisible();
}

test.describe( 'Directory screenshots — v1.2 editor UI (MAESTRO_CAPTURE-gated)', () => {
	test.skip(
		! CAPTURE,
		'Set MAESTRO_CAPTURE=1 (npm run screenshots) to regenerate the directory screenshots.'
	);

	test.beforeAll( () => {
		fs.mkdirSync( SCREENSHOTS_DIR, { recursive: true } );
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
	test( 'screenshot 3 — per-role visibility (cropped to menu + selector)', async ( { page } ) => {
		await enterEditorAndSelect( page );
		await expect( page.locator( '.maestro-vis-btn' ) ).toBeVisible();
		await page.locator( '.maestro-vis-btn' ).click();
		const pop = page.locator( '.maestro-vis-popover' );
		await expect( pop ).toBeVisible();

		const tb = ( await page.locator( '.maestro-toolbar' ).boundingBox() )!;
		const pb = ( await pop.boundingBox() )!;
		const top = Math.max( 0, Math.min( pb.y, tb.y ) - 30 );
		const right = Math.min( 1440, Math.max( pb.x + pb.width + 30, 1000 ) );
		await dualShot( page, 3, {
			clip: { x: 0, y: top, width: right, height: 980 - top },
		} );
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
