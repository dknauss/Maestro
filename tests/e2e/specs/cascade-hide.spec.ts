import { test, expect } from '../fixtures';
import { execFileSync } from 'child_process';

/**
 * COMPAT-10 (REVISED 2026-08-01): "Hide its sub-items from:" role group in
 * the visibility popover.
 *
 * The original boolean cascade_hide + "rides the parent hide" model (20-05)
 * was found INERT: WordPress core's `_wp_menu_output()` (wp-admin/menu-header.php)
 * never renders a parent's `<ul class="wp-submenu">` once the parent's own
 * `$menu` row is `unset()`, so hiding the parent already removes the whole
 * subtree cosmetically — cascading on top of that produced no observable
 * difference (verified empirically with Posts hidden for `editor`: zero
 * `#menu-posts` occurrences in the rendered HTML, cascade flag or not).
 *
 * The revised model makes child-hiding INDEPENDENT of parent visibility: a
 * per-parent `child_hidden_roles` list hides ALL of that parent's live
 * children from those roles, WITH THE PARENT LEFT VISIBLE. This is now a
 * genuinely VISIBLE effect — the parent's sidebar row stays, but its
 * dropdown loses the targeted rows — so this spec asserts it DIRECTLY against
 * the rendered sidebar as the targeted role, rather than needing the
 * wp-cli/`$submenu` dump technique the inert model required.
 *
 * Locked UI (20-CONTEXT.md): TWO independent role-checkbox groups inside the
 * existing visibility popover on a parent that has children — "Hide this
 * item from:" (existing hidden_roles) and "Hide its sub-items from:" (new
 * child_hidden_roles) — with the second group shown ONLY on a top-level
 * parent that actually has children (never on a childless item or a
 * submenu row).
 *
 * Every native top-level item in a vanilla WP install (Dashboard, Posts,
 * Media, Comments, ...) always registers at least one submenu row (see
 * wp-admin/menu.php) — there is no naturally childless item to assert the
 * "absent on a childless item" gating rule against. `maestro-e2e-childless.php`
 * (a gated mu-plugin, mapped in .wp-env.json) registers one, inert unless the
 * `maestro_e2e_childless` option is set; only this spec turns it on.
 */

const POST_SAVE = ( url: string ) => url.includes( '/maestro/v1/config' );

function wp( args: string[] ): void {
	try {
		execFileSync( 'npx', [ 'wp-env', 'run', 'tests-cli', 'wp', ...args ], { stdio: 'ignore' } );
	} catch ( e ) {
		// `option delete` on an absent option exits non-zero — that IS the
		// desired post-cleanup state, so ignore it (same pattern fixtures.ts uses).
	}
}

test.describe( 'COMPAT-10 — independent child_hidden_roles ("Hide its sub-items from:")', () => {

	test.beforeEach( () => {
		wp( [ 'option', 'update', 'maestro_e2e_childless', '1' ] );
	} );

	test.afterEach( () => {
		wp( [ 'option', 'delete', 'maestro_e2e_childless' ] );
	} );

	test( 'sub-items group is gated to parents with children; hiding children leaves the parent visible and is role-mirrored; hidden child page still loads directly', async ( { page, browser } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		const panel = page.locator( '.maestro-toolbar .maestro-panel' );

		// --- Gating 1: absent on a genuinely childless top-level item. ---
		const childlessLi = page.locator( 'li.maestro-item[data-maestro-slug="maestro-e2e-childless"]' );
		await expect( childlessLi ).toBeVisible();
		await childlessLi.locator( '> a.menu-top' ).click();
		await expect( panel ).toBeVisible();
		await panel.locator( '.maestro-vis-btn' ).click();
		let picker = page.locator( '.maestro-vis-popover' );
		await expect( picker ).toBeVisible();
		await expect( picker.locator( '.maestro-vis-own' ) ).toHaveCount( 1 ); // the item's own hide group is always shown.
		await expect( picker.locator( '.maestro-vis-children' ) ).toHaveCount( 0 );
		await page.keyboard.press( 'Escape' );

		// --- Gating 2: absent on a submenu row (Posts > Add New). ---
		const postsLi = page.locator( '#menu-posts' );
		await postsLi.locator( '> a.menu-top' ).click();
		await expect( panel ).toBeVisible();
		// Select via href, not label text ("Add New"/"Add Post" varies by WP version).
		const addNewLi = postsLi.locator( '.wp-submenu li.maestro-subitem' ).filter( { has: page.locator( 'a[href="post-new.php"]' ) } ).first();
		await addNewLi.locator( 'a' ).click();
		await expect( panel ).toBeVisible();
		await panel.locator( '.maestro-vis-btn' ).click();
		picker = page.locator( '.maestro-vis-popover' );
		await expect( picker ).toBeVisible();
		await expect( picker.locator( '.maestro-vis-children' ) ).toHaveCount( 0 );
		await page.keyboard.press( 'Escape' );

		// --- Gating 3: present, unchecked, independent of the "own" group on a
		// parent WITH children (Posts). ---
		await postsLi.locator( '> a.menu-top' ).click();
		await expect( panel ).toBeVisible();
		await panel.locator( '.maestro-vis-btn' ).click();
		picker = page.locator( '.maestro-vis-popover' );
		await expect( picker ).toBeVisible();
		await expect( picker.locator( '.maestro-vis-head' ) ).toHaveText( [ 'Hide this item from:', 'Hide its sub-items from:' ] );
		const childrenGroup = picker.locator( '.maestro-vis-children' );
		await expect( childrenGroup ).toBeVisible();

		// --- WCAG 1.3.1 (A): each role group must expose a PROGRAMMATIC
		// accessible name so an AT user can tell which axis a checkbox controls
		// (both groups list the same role names). Assert role="group" and that
		// aria-labelledby resolves to the group's own heading text. ---
		const ownGroup = picker.locator( '.maestro-vis-own' );
		for ( const [ group, expectedName ] of [
			[ ownGroup, 'Hide this item from:' ],
			[ childrenGroup, 'Hide its sub-items from:' ],
		] as const ) {
			await expect( group ).toHaveAttribute( 'role', 'group' );
			const labelledBy = await group.getAttribute( 'aria-labelledby' );
			expect( labelledBy ).toBeTruthy();
			await expect( page.locator( `#${ labelledBy }` ) ).toHaveText( expectedName );
		}
		// The two heading ids must be distinct (unique per group instance).
		expect( await ownGroup.getAttribute( 'aria-labelledby' ) )
			.not.toBe( await childrenGroup.getAttribute( 'aria-labelledby' ) );

		const editorInChildren = childrenGroup.getByLabel( 'Editor' );
		await expect( editorInChildren ).not.toBeChecked();
		const editorInOwn = picker.locator( '.maestro-vis-own' ).getByLabel( 'Editor' );
		await expect( editorInOwn ).not.toBeChecked();

		// --- Hide Posts' SUB-ITEMS from the editor role — WITHOUT hiding Posts
		// itself (the "own" group is left untouched). ---
		const saveResp = page.waitForResponse(
			( r ) => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
		);
		await editorInChildren.check();
		const payload = ( await saveResp ).request().postDataJSON();
		expect( payload?.config?.items?.[ 'edit.php' ]?.child_hidden_roles ).toContain( 'editor' );
		expect( payload?.config?.items?.[ 'edit.php' ]?.hidden_roles ).toBeFalsy();
		await page.keyboard.press( 'Escape' );

		// Parent's OWN group is untouched — Posts is not hidden for anybody,
		// including the admin viewing right now.
		await expect( postsLi ).toBeVisible();

		// --- View as the targeted role: parent VISIBLE, its children GONE. ---
		const editorContext = await browser.newContext();
		const editorPage = await editorContext.newPage();
		await editorPage.goto( '/wp-login.php' );
		await editorPage.fill( '#user_login', 'maestro_editor' );
		await editorPage.fill( '#user_pass', 'password' );
		await editorPage.click( '#wp-submit' );
		await editorPage.waitForURL( /wp-admin/ );
		await editorPage.goto( '/wp-admin/index.php' );

		await expect( editorPage.locator( '#menu-posts' ) ).toBeVisible();
		// child_hidden_roles must remove EVERY live child row for the targeted role.
		await expect( editorPage.locator( '#menu-posts .wp-submenu a[href*="post-new.php"]' ) ).toHaveCount( 0 );
		await expect( editorPage.locator( '#menu-posts .wp-submenu a[href="edit.php"]' ) ).toHaveCount( 0 );

		// Role-mirror: an administrator (not in child_hidden_roles) must still
		// see every child.
		await page.goto( '/wp-admin/index.php' );
		await expect( page.locator( '#menu-posts .wp-submenu a[href*="post-new.php"]' ) ).toBeVisible();

		// --- Cosmetic-only guardrail: the hidden child page still loads by
		// direct URL for a capable user — the sidebar row is gone, but the
		// capability that gates the page itself is untouched. ---
		await editorPage.goto( '/wp-admin/post-new.php' );
		await expect( editorPage ).toHaveURL( /post-new\.php/ );
		await expect( editorPage.locator( 'body' ) ).not.toContainText( 'Sorry, you are not allowed' );
		await editorContext.close();

		// Clean up: reset all so a rerun starts clean.
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		page.once( 'dialog', ( d ) => d.accept() );
		await page.locator( '.maestro-reset-all' ).click();
		await expect( page.locator( '#menu-posts .wp-submenu a[href*="post-new.php"]' ) ).toBeVisible();
	} );

	test( 'a role hidden in "Hide this item from:" locks (checked+disabled) the same role in "Hide its sub-items from:", live, WITHOUT ever persisting it into child_hidden_roles', async ( { page, browser } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		const panel = page.locator( '.maestro-toolbar .maestro-panel' );
		const postsLi = page.locator( '#menu-posts' );
		await postsLi.locator( '> a.menu-top' ).click();
		await expect( panel ).toBeVisible();
		await panel.locator( '.maestro-vis-btn' ).click();

		const picker = page.locator( '.maestro-vis-popover' );
		await expect( picker ).toBeVisible();
		const ownGroup = picker.locator( '.maestro-vis-own' );
		const childrenGroup = picker.locator( '.maestro-vis-children' );
		const editorInOwn = ownGroup.getByLabel( 'Editor' );
		const editorInChildren = childrenGroup.getByLabel( 'Editor' );

		// --- Baseline: nothing locked. ---
		await expect( editorInChildren ).not.toBeChecked();
		await expect( editorInChildren ).toBeEnabled();

		// --- Hide Posts itself from Editor (Group 1). ---
		const saveHide = page.waitForResponse(
			( r ) => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
		);
		await editorInOwn.check();
		const hidePayload = ( await saveHide ).request().postDataJSON();
		expect( hidePayload?.config?.items?.[ 'edit.php' ]?.hidden_roles ).toContain( 'editor' );
		// PAYLOAD PURITY: hiding the parent must NEVER, by itself, write
		// 'editor' into child_hidden_roles.
		expect( hidePayload?.config?.items?.[ 'edit.php' ]?.child_hidden_roles ).toBeFalsy();

		// --- Live reactivity: Editor's row in Group 2 is now checked+disabled,
		// with a title tooltip and an AT-only reason, WITHOUT closing/reopening
		// the popover. ---
		await expect( editorInChildren ).toBeChecked();
		await expect( editorInChildren ).toBeDisabled();
		await expect( editorInChildren ).toHaveAttribute( 'aria-disabled', 'true' );
		// The enclosing <label> row, found via ancestor traversal from the
		// checkbox itself (robust — no dependency on `.filter({ has })`, which
		// this Playwright version doesn't resolve reliably against a locator
		// built from a chained-scope ancestor).
		const lockedRow = editorInChildren.locator( 'xpath=ancestor::label[1]' );
		await expect( lockedRow ).toHaveClass( /maestro-vis-locked/ );
		await expect( lockedRow ).toHaveAttribute( 'title', /Editor/ );
		await expect( lockedRow.locator( '.maestro-vis-locked-hint' ) ).toContainText( 'Editor' );

		// A DIFFERENT role's checkbox in Group 2 is unaffected — still a real,
		// interactive, unchecked control.
		const authorInChildren = childrenGroup.getByLabel( 'Author' );
		await expect( authorInChildren ).not.toBeChecked();
		await expect( authorInChildren ).toBeEnabled();

		// --- Un-hide Posts from Editor (Group 1 toggled back off). ---
		const saveUnhide = page.waitForResponse(
			( r ) => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
		);
		await editorInOwn.uncheck();
		const unhidePayload = ( await saveUnhide ).request().postDataJSON();
		expect( unhidePayload?.config?.items?.[ 'edit.php' ]?.hidden_roles ).toBeFalsy();
		// ROUND-TRIP PROOF: 'editor' was never actually written to
		// child_hidden_roles by the lock, so unhiding restores an unchecked,
		// enabled checkbox — not a stale "still hidden" state.
		expect( unhidePayload?.config?.items?.[ 'edit.php' ]?.child_hidden_roles ).toBeFalsy();
		await expect( editorInChildren ).not.toBeChecked();
		await expect( editorInChildren ).toBeEnabled();
		await page.keyboard.press( 'Escape' );

		// --- Prove the round-trip end-to-end in the live menu: after
		// hide-then-unhide, the editor role sees Posts AND its children again
		// — nothing was left silently hidden by the lock. ---
		const editorContext = await browser.newContext();
		const editorPage = await editorContext.newPage();
		await editorPage.goto( '/wp-login.php' );
		await editorPage.fill( '#user_login', 'maestro_editor' );
		await editorPage.fill( '#user_pass', 'password' );
		await editorPage.click( '#wp-submit' );
		await editorPage.waitForURL( /wp-admin/ );
		await editorPage.goto( '/wp-admin/index.php' );
		await expect( editorPage.locator( '#menu-posts' ) ).toBeVisible();
		await expect( editorPage.locator( '#menu-posts .wp-submenu a[href*="post-new.php"]' ) ).toBeVisible();
		await editorContext.close();

		// Clean up.
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		page.once( 'dialog', ( d ) => d.accept() );
		await page.locator( '.maestro-reset-all' ).click();
	} );

} );
