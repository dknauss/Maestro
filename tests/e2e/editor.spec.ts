import { test, expect } from '@playwright/test';

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

} );
