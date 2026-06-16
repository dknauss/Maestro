import { test, expect } from '@playwright/test';
import * as fs from 'fs';

/**
 * End-to-end coverage of the in-place editor against a live WordPress.
 * Run with: `npm run env:start` then `npm run test:e2e`.
 *
 * The editor uses a click-to-select model with debounced autosave: there is
 * no manual Save button. Every spec that mutates server state ends with a
 * Reset all so the next spec starts from a stable baseline.
 */

const POST_SAVE = ( url: string ) =>
	url.includes( '/maestro/v1/config' );

test.describe( 'Admin Menu Maestro — editor', () => {

	test( 'edit mode is off by default and the admin-bar toggle is present', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php' );

		// No toolbar without the flag.
		await expect( page.locator( '.maestro-toolbar' ) ).toHaveCount( 0 );

		// The toggle lives on the admin bar, not the menu it edits.
		await expect( page.locator( '#wp-admin-bar-maestro-toggle' ) ).toBeVisible();
	} );

	test( 'entering edit mode shows the toolbar and decorates the menu', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
		await expect( page.locator( '#adminmenu li.maestro-item' ).first() ).toBeVisible();
		await expect( page.locator( '#menu-posts.maestro-item' ) ).toBeVisible();

		// No edit chrome until selection — the shared panel is hidden, and no
		// per-item button clusters exist on the menu.
		await expect( page.locator( '.maestro-toolbar .maestro-panel' ) ).toBeHidden();
		await expect( page.locator( '#adminmenu .maestro-controls' ) ).toHaveCount( 0 );
	} );

	test( 'folded mode is neutralized — editor stays expanded and selectable', async ( { page } ) => {
		// Between 783px and 960px WordPress auto-folds the menu to icons and
		// common.js adds body.folded. The editor must force it back open.
		await page.setViewportSize( { width: 900, height: 800 } );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		const body = page.locator( 'body' );
		await expect( body ).toHaveClass( /maestro-editing/ );
		// forceUnfold() + the MutationObserver strip these even if common.js
		// reapplies them; the web-first assertion retries through that.
		await expect( body ).not.toHaveClass( /\bfolded\b/ );

		// The menu is at expanded width, and selection still works from a width
		// that would otherwise be showing icon-only flyouts.
		await expect( page.locator( '#adminmenu' ) ).toHaveCSS( 'width', '160px' );
		await page.locator( '#menu-posts > a.menu-top' ).click();
		await expect( page.locator( '.maestro-toolbar .maestro-panel' ) ).toBeVisible();
		await expect( page.locator( '.maestro-toolbar .maestro-panel .maestro-icon-btn' ) ).toBeVisible();
	} );

	test( 'rename persists across reload, then reset restores the default', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		// Click the top-level Posts link specifically. The submenu is force-
		// expanded while editing, so #menu-posts is a tall <li>; clicking its
		// geometric center would land on a submenu child. Target the menu-top
		// anchor to select the top-level item unambiguously.
		await page.locator( '#menu-posts > a.menu-top' ).click();
		const panel = page.locator( '.maestro-toolbar .maestro-panel' );
		await expect( panel ).toBeVisible();

		const rename = panel.locator( '.maestro-rename-input' );
		await expect( rename ).toBeVisible();
		await rename.fill( 'Articles' );

		// Pressing Enter blurs the input, which commits and schedules autosave.
		const savePosted = page.waitForResponse(
			r => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
		);
		await rename.press( 'Enter' );
		await savePosted;

		// Hard reload: the change is only authoritative if the server stored it.
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '#menu-posts .wp-menu-name' ) ).toContainText( 'Articles' );

		// Reset everything so the next test starts clean.
		page.once( 'dialog', d => d.accept() );
		await page.locator( '.maestro-reset-all' ).click();
		await expect( page.locator( '#menu-posts .wp-menu-name' ) ).toContainText( 'Posts' );
		await expect( page.locator( '#menu-posts .wp-menu-name' ) ).not.toContainText( 'Articles' );
	} );

	test( 'reset this item clears a single item override without resetting everything', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		await page.locator( '#menu-posts > a.menu-top' ).click();
		const panel = page.locator( '.maestro-toolbar .maestro-panel' );
		await expect( panel ).toBeVisible();

		const rename = panel.locator( '.maestro-rename-input' );
		const renamePosted = page.waitForResponse(
			r => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
		);
		await rename.fill( 'Articles' );
		await rename.press( 'Enter' );
		await renamePosted;
		await expect( page.locator( '#menu-posts .wp-menu-name' ) ).toContainText( 'Articles' );

		const resetPosted = page.waitForResponse(
			r => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
		);
		await panel.locator( '.maestro-reset-item' ).click();
		const payload = ( await resetPosted ).request().postDataJSON();
		expect( payload?.config?.items?.[ 'edit.php' ] ).toBeUndefined();

		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '#menu-posts .wp-menu-name' ) ).toContainText( 'Posts' );
		await expect( page.locator( '#menu-posts .wp-menu-name' ) ).not.toContainText( 'Articles' );
	} );

	test( 'icon pick persists across reload and the autosave carries it', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		// Select the top-level Posts item (see note in the rename test about why
		// the menu-top anchor is targeted rather than the whole <li>).
		await page.locator( '#menu-posts > a.menu-top' ).click();
		const panel = page.locator( '.maestro-toolbar .maestro-panel' );
		await expect( panel ).toBeVisible();
		// The icon picker is top-level only, so it must be visible here.
		await panel.locator( '.maestro-icon-btn' ).click();

		const picker = page.locator( '.maestro-icon-popover' );
		await expect( picker ).toBeVisible();

		// Wait for the save to COMPLETE (not just fire) so the reload below sees
		// the stored icon — and assert the icon is in the payload. The confirmed
		// miss before this work was the icon not being persisted at all.
		const saveResp = page.waitForResponse(
			r => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
		);
		await picker.locator( '.maestro-icon-cell.dashicons-book' ).click();
		const payload = ( await saveResp ).request().postDataJSON();
		expect( payload?.config?.items?.[ 'edit.php' ]?.icon ).toBe( 'dashicons-book' );

		// Preview updated synchronously.
		await expect( page.locator( '#menu-posts .wp-menu-image' ) ).toHaveClass( /dashicons-book/ );

		// Persistence across reload — server-rendered class survives.
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '#menu-posts .wp-menu-image' ) ).toHaveClass( /dashicons-book/ );

		// Clean up.
		page.once( 'dialog', d => d.accept() );
		await page.locator( '.maestro-reset-all' ).click();
		await expect( page.locator( '#menu-posts .wp-menu-image' ) ).not.toHaveClass( /dashicons-book/ );
	} );

	test( 'a bundled Bootstrap (data-URI) icon persists across reload', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		await page.locator( '#menu-posts > a.menu-top' ).click();
		const panel = page.locator( '.maestro-toolbar .maestro-panel' );
		await expect( panel ).toBeVisible();
		await panel.locator( '.maestro-icon-btn' ).click();

		const picker = page.locator( '.maestro-icon-popover' );
		await expect( picker ).toBeVisible();

		// Switch to the Bootstrap tab: its panel shows, the Dashicons panel hides.
		await picker.getByRole( 'tab', { name: 'Bootstrap' } ).click();
		await expect( picker.locator( '#maestro-panel-dashicons' ) ).toBeHidden();
		const btPanel = picker.locator( '#maestro-panel-bootstrap' );
		await expect( btPanel ).toBeVisible();

		// The search filter narrows the visible cells (regression guard: a CSS
		// display rule once outranked [hidden] and the filter silently no-op'd).
		const allCells = await btPanel.locator( '.maestro-icon-cell:visible' ).count();
		await picker.locator( '.maestro-icon-search' ).fill( 'gear' );
		await expect
			.poll( () => btPanel.locator( '.maestro-icon-cell:visible' ).count() )
			.toBeLessThan( allCells );
		await picker.locator( '.maestro-icon-search' ).fill( '' );

		// Pick a known icon by its accessible name.
		// Wait for completion so the reload sees the stored value (not just fired).
		const saveResp = page.waitForResponse(
			r => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
		);
		await picker.getByRole( 'button', { name: 'Gear', exact: true } ).click();

		// The payload carries a base64 SVG data-URI, not a dashicon class.
		const payload = ( await saveResp ).request().postDataJSON();
		const icon = payload?.config?.items?.[ 'edit.php' ]?.icon as string;
		expect( icon ).toMatch( /^data:image\/svg\+xml;base64,/ );

		// Preview repaints via background-image + core's .svg sizing class.
		await expect( page.locator( '#menu-posts .wp-menu-image' ) ).toHaveClass( /\bsvg\b/ );

		// Regression: the icon must actually PAINT, not merely carry the class.
		// Core's `menu-icon-* div.wp-menu-image { background-image:none !important }`
		// used to win over the inline data-URI, leaving the icon invisible. The fix
		// strips the menu-icon-* class; assert the computed background resolves and
		// the class is gone — both live and after reload.
		await expect
			.poll( () => page.locator( '#menu-posts .wp-menu-image' ).evaluate( el => getComputedStyle( el ).backgroundImage ) )
			.toMatch( /^url\("?data:image\/svg\+xml;base64,/ );
		await expect( page.locator( '#menu-posts' ) ).not.toHaveClass( /menu-icon-/ );

		// Persistence: core re-renders the data-URI icon after reload.
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		const img = page.locator( '#menu-posts .wp-menu-image' );
		await expect( img ).toHaveClass( /\bsvg\b/ );
		await expect( img ).toHaveAttribute( 'style', /data:image\/svg\+xml;base64,/ );
		await expect
			.poll( () => img.evaluate( el => getComputedStyle( el ).backgroundImage ) )
			.toMatch( /^url\("?data:image\/svg\+xml;base64,/ );
		await expect( page.locator( '#menu-posts' ) ).not.toHaveClass( /menu-icon-/ );

		// Clean up.
		page.once( 'dialog', d => d.accept() );
		await page.locator( '.maestro-reset-all' ).click();
		await expect( page.locator( '#menu-posts .wp-menu-image' ) ).not.toHaveClass( /\bsvg\b/ );
	} );

	test( 'per-role visibility hides an item from that role only', async ( { page, browser } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		await page.locator( '#menu-media > a.menu-top' ).click();
		const panel = page.locator( '.maestro-toolbar .maestro-panel' );
		await expect( panel ).toBeVisible();
		await panel.locator( '.maestro-vis-btn' ).click();

		const picker = page.locator( '.maestro-vis-popover' );
		await expect( picker ).toBeVisible();

		const saveResp = page.waitForResponse(
			r => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
		);
		await picker.getByLabel( 'Editor' ).check();
		const payload = ( await saveResp ).request().postDataJSON();
		expect( payload?.config?.items?.[ 'upload.php' ]?.hidden_roles ).toContain( 'editor' );

		const editorContext = await browser.newContext();
		const editorPage = await editorContext.newPage();
		await editorPage.goto( '/wp-login.php' );
		await editorPage.fill( '#user_login', 'maestro_editor' );
		await editorPage.fill( '#user_pass', 'password' );
		await editorPage.click( '#wp-submit' );
		await editorPage.waitForURL( /wp-admin/ );
		await editorPage.goto( '/wp-admin/index.php' );

		await expect( editorPage.locator( '#menu-media' ) ).toHaveCount( 0 );
		await expect( editorPage.locator( '#menu-posts' ) ).toBeVisible();
		await editorContext.close();

		page.once( 'dialog', d => d.accept() );
		await page.locator( '.maestro-reset-all' ).click();
		await expect( page.locator( '#menu-media' ) ).toBeVisible();
	} );

	test( 'dragging a top-level item by the row reorders it and persists', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();

		const order = () =>
			page.$$eval( '#adminmenu > li.menu-top.maestro-item', els => els.map( e => ( e as HTMLElement ).dataset.maestroSlug ) );
		const before = await order();
		const fromIdx = before.indexOf( 'edit.php' );

		// No handle — grab the row itself and drag Posts down past Media. The
		// distance threshold means we must move beyond a few pixels to start.
		const posts = await page.locator( '#menu-posts > a.menu-top' ).boundingBox();
		const media = await page.locator( '#menu-media > a.menu-top' ).boundingBox();
		const saveResp = page.waitForResponse(
			r => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
		);
		await page.mouse.move( posts!.x + 40, posts!.y + 10 );
		await page.mouse.down();
		const dy = ( media!.y - posts!.y ) + 30;
		for ( let i = 1; i <= 8; i++ ) {
			await page.mouse.move( posts!.x + 40, posts!.y + 10 + ( dy * i ) / 8 );
		}
		await page.mouse.up();
		await saveResp;

		const after = await order();
		expect( after ).not.toEqual( before );
		expect( after.indexOf( 'edit.php' ) ).toBeGreaterThan( fromIdx );

		// The new order survives a reload (server replays top_order).
		await page.reload();
		await expect.poll( order ).toEqual( after );

		// Reset back to the natural order.
		page.once( 'dialog', d => d.accept() );
		await page.locator( '.maestro-reset-all' ).click();
		await expect.poll( order ).toEqual( before );
	} );

	test( 'modified indicator appears on change and clears on per-item keyboard reset', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		// Select the Posts top-level item.
		await page.locator( '#menu-posts > a.menu-top' ).click();
		const panel = page.locator( '.maestro-toolbar .maestro-panel' );
		await expect( panel ).toBeVisible();

		// 1. Initially, #menu-posts must NOT have the modified class.
		await expect( page.locator( '#menu-posts' ) ).not.toHaveClass( /maestro-modified/ );

		// 2. Rename to 'Articles' and commit (Enter).
		const rename = panel.locator( '.maestro-rename-input' );
		const savePosted = page.waitForResponse(
			r => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
		);
		await rename.fill( 'Articles' );
		await rename.press( 'Enter' );
		await savePosted;

		// 3. After the change, the indicator must be present.
		await expect( page.locator( '#menu-posts' ) ).toHaveClass( /maestro-modified/ );
		// The non-color badge glyph must be in the row.
		await expect( page.locator( '#menu-posts .maestro-modified-badge' ) ).toBeVisible();
		// The screen-reader-text "(modified)" node must exist inside the row.
		await expect( page.locator( '#menu-posts .maestro-modified-sr' ) ).toBeAttached();

		// 4. Discoverable reset: the panel's .maestro-reset-item must be visible and
		//    keyboard-reachable. Focus it and activate it via keyboard (Enter), NOT mouse.
		const resetBtn = panel.locator( '.maestro-reset-item' );
		await expect( resetBtn ).toBeVisible();
		// Confirm it has the is-modified emphasis class.
		await expect( resetBtn ).toHaveClass( /is-modified/ );

		const resetPosted = page.waitForResponse(
			r => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
		);
		// Keyboard-activate: focus → press Enter (proves keyboard-reachability).
		await resetBtn.focus();
		await page.keyboard.press( 'Enter' );
		// Payload must no longer carry a delta for edit.php.
		const payload = ( await resetPosted ).request().postDataJSON();
		expect( payload?.config?.items?.[ 'edit.php' ] ).toBeUndefined();

		// 5. After reset, the indicator must be gone.
		await expect( page.locator( '#menu-posts' ) ).not.toHaveClass( /maestro-modified/ );
		await expect( page.locator( '#menu-posts .maestro-modified-badge' ) ).not.toBeAttached();

		// 6. Reload and verify the title is back to 'Posts'.
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '#menu-posts .wp-menu-name' ) ).toContainText( 'Posts' );
		await expect( page.locator( '#menu-posts .wp-menu-name' ) ).not.toContainText( 'Articles' );
	} );

	test( 'keyboard-only reorder moves a top-level item and persists', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();

		// Capture the baseline order so we can assert the delta and clean up.
		const order = () =>
			page.$$eval( '#adminmenu > li.menu-top.maestro-item', els => els.map( e => ( e as HTMLElement ).dataset.maestroSlug ) );
		const baseline = await order();
		const fromIdx = baseline.indexOf( 'edit.php' );

		// Select Posts via keyboard: focus the anchor then press Enter.
		// selectItem() is called, which populates the panel and moves focus to
		// the rename input. We then re-focus the anchor to position the first
		// Alt+Arrow keypress on the menu row.
		await page.locator( '#menu-posts > a.menu-top' ).focus();
		await page.locator( '#menu-posts > a.menu-top' ).press( 'Enter' );
		await expect( page.locator( '.maestro-toolbar .maestro-panel' ) ).toBeVisible();

		// Bring focus back to the menu row anchor for the first keyboard move.
		await page.locator( '#menu-posts > a.menu-top' ).focus();

		// First Alt+ArrowDown move — await the debounced autosave.
		const save1 = page.waitForResponse(
			r => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
		);
		await page.keyboard.press( 'Alt+ArrowDown' );
		await save1;

		// CHAINED MOVE: the JS handler restores focus to the moved item's anchor
		// after re-appending the DOM node. Without any re-focus here, the second
		// press fires on the same item and moves it again — proving focus retention.
		const save2 = page.waitForResponse(
			r => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
		);
		await page.keyboard.press( 'Alt+ArrowDown' );
		await save2;

		// Posts should have advanced by two positions (boundary permitting).
		const afterMove = await order();
		expect( afterMove ).not.toEqual( baseline );
		const newIdx = afterMove.indexOf( 'edit.php' );
		expect( newIdx ).toBeGreaterThan( fromIdx );
		// Two chained moves: index increased by exactly 2 (or clamped at the boundary).
		const expectedIdx = Math.min( fromIdx + 2, baseline.length - 1 );
		expect( newIdx ).toBe( expectedIdx );

		// Persistence: reload and assert the server replayed the two-step order.
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect.poll( order ).toEqual( afterMove );

		// Clean up: reset all to restore baseline. Wait for the reload triggered
		// by doResetAll to complete before polling order, so $$eval does not race
		// against the navigation destroying the execution context.
		const resetNav = page.waitForNavigation();
		page.once( 'dialog', d => d.accept() );
		await page.locator( '.maestro-reset-all' ).click();
		await resetNav;
		await expect.poll( order ).toEqual( baseline );
	} );

} );

/**
 * Phase 7 — Visual Polish & Icons regression suite
 *
 * Three areas covered:
 *   1. ICON-01: solid (Bootstrap -fill) grid scanability + side-by-side screenshots
 *   2. UX-02: no text-overlap, no control-resize at 1200px and 700px breakpoints
 *   3. First-run cue: shown once per session, suppressed after dismissal
 *
 * Screenshots are written to .planning/phases/07-visual-polish-icons/screenshots/
 * as deliverable PNGs for human review (not pixel-diff baselines).
 */

const SCREENSHOTS_DIR = '.planning/phases/07-visual-polish-icons/screenshots';

test.describe( 'Phase 7 — ICON-01 solid grid scanability and side-by-side screenshots', () => {

	test.beforeAll( () => {
		fs.mkdirSync( SCREENSHOTS_DIR, { recursive: true } );
	} );

	test( 'Bootstrap tab renders >50 visible cells each with a 20px img, search narrows them', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		// Select Posts to reveal the panel with the icon button.
		await page.locator( '#menu-posts > a.menu-top' ).click();
		const panel = page.locator( '.maestro-toolbar .maestro-panel' );
		await expect( panel ).toBeVisible();
		await panel.locator( '.maestro-icon-btn' ).click();

		const picker = page.locator( '.maestro-icon-popover' );
		await expect( picker ).toBeVisible();

		// The default tab is Dashicons (index 0). Switch to Bootstrap (index 1).
		await picker.getByRole( 'tab', { name: 'Bootstrap' } ).click();
		await expect( picker.locator( '#maestro-panel-dashicons' ) ).toBeHidden();
		const btPanel = picker.locator( '#maestro-panel-bootstrap' );
		await expect( btPanel ).toBeVisible();

		// Assert: > 50 visible cells (87-icon solid bundle).
		const visibleCells = await btPanel.locator( '.maestro-icon-cell:visible' ).count();
		expect( visibleCells ).toBeGreaterThan( 50 );

		// Assert: each cell's img has natural dimensions — the src (base64 data-URI)
		// is set correctly. Spot-check the first img.
		const firstImg = btPanel.locator( '.maestro-icon-cell img' ).first();
		await expect( firstImg ).toBeVisible();
		const imgSrc = await firstImg.getAttribute( 'src' );
		expect( imgSrc ).toMatch( /^data:image\/svg\+xml;base64,/ );

		// Search regression: 'gear' must narrow the visible set (same guard as the
		// Phase 6 filter regression that caught CSS display overriding [hidden]).
		const countBefore = await btPanel.locator( '.maestro-icon-cell:visible' ).count();
		await picker.locator( '.maestro-icon-search' ).fill( 'gear' );
		await expect
			.poll( () => btPanel.locator( '.maestro-icon-cell:visible' ).count() )
			.toBeLessThan( countBefore );

		// Clear the filter.
		await picker.locator( '.maestro-icon-search' ).fill( '' );
		await expect
			.poll( () => btPanel.locator( '.maestro-icon-cell:visible' ).count() )
			.toBeGreaterThan( 50 );

		// Screenshot the Bootstrap (solid) tab as an ICON-01 deliverable.
		await page.screenshot( {
			path: `${ SCREENSHOTS_DIR }/icons-bootstrap-tab.png`,
		} );

		// Switch to Dashicons for the comparison screenshot.
		await picker.getByRole( 'tab', { name: 'Dashicons' } ).click();
		await expect( picker.locator( '#maestro-panel-bootstrap' ) ).toBeHidden();
		await expect( picker.locator( '#maestro-panel-dashicons' ) ).toBeVisible();

		await page.screenshot( {
			path: `${ SCREENSHOTS_DIR }/icons-dashicons-tab.png`,
		} );

		// Capture the picker open with Bootstrap tab active as the "side-by-side"
		// deliverable (shows tab strip and solid grid side by side the tab list).
		await picker.getByRole( 'tab', { name: 'Bootstrap' } ).click();
		await expect( picker.locator( '#maestro-panel-bootstrap' ) ).toBeVisible();
		await page.screenshot( {
			path: `${ SCREENSHOTS_DIR }/icons-side-by-side.png`,
		} );

		// Clean up by pressing Escape to close the picker.
		await page.keyboard.press( 'Escape' );
	} );

} );

test.describe( 'Phase 7 — UX-02 no-overlap / no-resize at 1200px and 700px', () => {

	for ( const viewport of [
		{ width: 1200, height: 800, label: '1200' },
		{ width: 700,  height: 800, label: '700'  },
	] ) {
		test( `toolbar has no overflow and rename input fits its container at ${ viewport.width }px`, async ( { page } ) => {
			await page.setViewportSize( { width: viewport.width, height: viewport.height } );
			await page.goto( '/wp-admin/index.php?maestro_edit=1' );

			// Select Posts to show the panel and rename input.
			await page.locator( '#menu-posts > a.menu-top' ).click();
			const panel = page.locator( '.maestro-toolbar .maestro-panel' );
			await expect( panel ).toBeVisible();

			// The toolbar and status element must be visible.
			const toolbar = page.locator( '.maestro-toolbar' );
			const statusEl = toolbar.locator( '.maestro-status' );
			await expect( toolbar ).toBeVisible();
			await expect( statusEl ).toBeVisible();

			// No horizontal overflow: toolbar width must fit within the viewport.
			const toolbarBox = await toolbar.boundingBox();
			expect( toolbarBox ).not.toBeNull();
			expect( toolbarBox!.width ).toBeLessThanOrEqual( viewport.width );
			// Right edge must not exceed viewport width (1px tolerance for subpixel rounding).
			expect( toolbarBox!.x + toolbarBox!.width ).toBeLessThanOrEqual( viewport.width + 1 );

			// Rename input must not exceed the panel container width.
			const renameInput = panel.locator( '.maestro-rename-input' );
			await expect( renameInput ).toBeVisible();
			const renameBox = await renameInput.boundingBox();
			const panelBox  = await panel.boundingBox();
			expect( renameBox ).not.toBeNull();
			expect( panelBox ).not.toBeNull();
			// The input right edge must not exceed the panel right edge (2px tolerance).
			expect( renameBox!.x + renameBox!.width ).toBeLessThanOrEqual( panelBox!.x + panelBox!.width + 2 );

			// Capture the toolbar deliverable screenshot.
			await page.screenshot( {
				path: `${ SCREENSHOTS_DIR }/toolbar-${ viewport.label }.png`,
			} );
		} );
	}

} );

test.describe( 'Phase 7 — first-run cue appears once only (localStorage-gated)', () => {

	test( 'first-run cue is visible fresh, hidden after dismiss, and absent after reload', async ( { page } ) => {
		// Pre-clear the localStorage flag on the test origin so the first navigation
		// sees a truly fresh session. We navigate to any wp-admin page first, then
		// use page.evaluate() to clear the flag — this runs once, not on every load.
		await page.goto( '/wp-admin/index.php' );
		await page.evaluate( () => {
			try {
				localStorage.removeItem( 'maestroFirstRunDone' );
			} catch ( e ) {
				// Private browsing — ignore.
			}
		} );

		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		// 1. First-run cue must be visible on a fresh session.
		const cue = page.locator( '.maestro-firstrun' );
		await expect( cue ).toBeVisible();

		// 2. Dismiss the cue via the "Got it" button.
		const dismissBtn = page.locator( '.maestro-firstrun-dismiss' );
		await expect( dismissBtn ).toBeVisible();
		await dismissBtn.click();

		// 3. After dismissal the cue must be gone from the DOM immediately.
		await expect( cue ).toHaveCount( 0 );

		// 4. After a full page reload the cue must NOT reappear (localStorage gate).
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-firstrun' ) ).toHaveCount( 0 );
	} );

} );
