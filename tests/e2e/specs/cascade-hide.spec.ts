import { test, expect } from '../fixtures';
import { execFileSync } from 'child_process';

/**
 * COMPAT-10: "also hide children" cascade checkbox in the visibility popover.
 *
 * Locked UI (20-CONTEXT.md): the checkbox lives INSIDE the existing
 * visibility popover, shown ONLY on a top-level parent that has children
 * (never on a childless item or a submenu row), and is always enabled — its
 * effect is gated at replay time (20-05), not by whether a role is currently
 * hidden.
 *
 * Every native top-level item in a vanilla WP install (Dashboard, Posts,
 * Media, Comments, ...) always registers at least one submenu row (see
 * wp-admin/menu.php) — there is no naturally childless item to assert the
 * "absent on a childless item" gating rule against. `maestro-e2e-childless.php`
 * (a gated mu-plugin, mapped in .wp-env.json) registers one, inert unless the
 * `maestro_e2e_childless` option is set; only this spec turns it on.
 *
 * Once a top-level parent's OWN row is hidden for a role (a pre-existing,
 * unrelated mechanic — Replay::replay() unset()s that row regardless of
 * cascade), WordPress core's own `_wp_menu_output()`
 * (wp-admin/menu-header.php) never renders that row's nested `<ul
 * class="wp-submenu">` at all, cascade flag or not — the sidebar HTML alone
 * cannot distinguish cascade-off from cascade-on once the parent is ALSO
 * hidden for that viewer. The actual difference cascade makes lives one level
 * down, in the `$submenu` array's OWN CONTENTS at replay time (proven by
 * ReplayTest.php's PHPUnit suite). This spec's plan text explicitly licenses
 * "assert via reloaded model / replay state" as the way to prove that
 * end-to-end, so `dumpEditPhpChildren()` below reuses the exact
 * `admin_menu` @ `PHP_INT_MAX` dump technique the R1 compat surveys
 * established (.planning/compat/SURV-01-assets/dump-menu.php) to inspect the
 * real `$submenu['edit.php']` state Replay::replay() produced for a given
 * wp-cli user, against the config the BROWSER actually saved via the REST
 * endpoint — a genuine end-to-end proof of the save-to-replay round trip, not
 * a re-assertion of the already-covered PHPUnit contract.
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

/**
 * Dump `$submenu['edit.php']`'s live child slugs for a given wp-cli user,
 * AFTER Maestro's `Replay::replay()` has applied that user's effective
 * hide/cascade rules to the config the browser actually saved. See
 * tests/e2e/fixtures/dump-cascade-submenu.php for the full technique and
 * rationale.
 */
function dumpEditPhpChildren( user: string ): string[] {
	const out = execFileSync(
		'npx',
		[
			'wp-env', 'run', 'tests-cli', 'wp',
			"--exec=define('WP_ADMIN', true);",
			'eval-file',
			'wp-content/plugins/maestro-menu-editor/tests/e2e/fixtures/dump-cascade-submenu.php',
			`--user=${ user }`,
		],
		{ encoding: 'utf8' }
	);
	return out.split( '\n' ).map( ( s ) => s.trim() ).filter( Boolean );
}

test.describe( 'COMPAT-10 — cascade-hide-to-children (default-off vs on)', () => {

	test.beforeEach( () => {
		wp( [ 'option', 'update', 'maestro_e2e_childless', '1' ] );
	} );

	test.afterEach( () => {
		wp( [ 'option', 'delete', 'maestro_e2e_childless' ] );
	} );

	test( 'checkbox is gated to parents with children; cascade default-off leaves children visible; cascade-on hides them role-mirrored', async ( { page } ) => {
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
		await expect( picker.locator( '.maestro-vis-cascade' ) ).toHaveCount( 0 );
		await page.keyboard.press( 'Escape' );

		// --- Gating 2: absent on a submenu row (Posts > All Posts). ---
		const postsLi = page.locator( '#menu-posts' );
		await postsLi.locator( '> a.menu-top' ).click();
		await expect( panel ).toBeVisible();
		const subLi = postsLi.locator( '.wp-submenu > li.maestro-subitem' ).first();
		await subLi.locator( 'a' ).click();
		await expect( panel ).toBeVisible();
		await panel.locator( '.maestro-vis-btn' ).click();
		picker = page.locator( '.maestro-vis-popover' );
		await expect( picker ).toBeVisible();
		await expect( picker.locator( '.maestro-vis-cascade' ) ).toHaveCount( 0 );
		await page.keyboard.press( 'Escape' );

		// --- Gating 3: present, unchecked, enabled on a parent WITH children (Posts). ---
		await postsLi.locator( '> a.menu-top' ).click();
		await expect( panel ).toBeVisible();
		await panel.locator( '.maestro-vis-btn' ).click();
		picker = page.locator( '.maestro-vis-popover' );
		await expect( picker ).toBeVisible();
		const cascadeCb = picker.locator( '.maestro-vis-cascade input[type="checkbox"]' );
		await expect( cascadeCb ).toHaveCount( 1 );
		await expect( cascadeCb ).toBeEnabled();
		await expect( cascadeCb ).not.toBeChecked();

		// --- 1. Hide Posts for the editor role WITHOUT cascade. ---
		const saveResp1 = page.waitForResponse(
			( r ) => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
		);
		await picker.getByLabel( 'Editor' ).check();
		const payload1 = ( await saveResp1 ).request().postDataJSON();
		expect( payload1?.config?.items?.[ 'edit.php' ]?.hidden_roles ).toContain( 'editor' );
		expect( payload1?.config?.items?.[ 'edit.php' ]?.cascade_hide ).toBeFalsy();

		// Cascade OFF (default): the editor's effective $submenu['edit.php'] still
		// has every live child — Posts' own top-level row is hidden (a
		// pre-existing, unrelated mechanic that removes the WHOLE rendered
		// dropdown regardless of cascade — see the file header), but cascade
		// contributes nothing to the CHILDREN's own effective hidden_roles.
		expect( dumpEditPhpChildren( 'maestro_editor' ) ).toEqual(
			expect.arrayContaining( [ 'post-new.php' ] )
		);

		// --- 2. Enable cascade (same popover instance, still open). ---
		const saveResp2 = page.waitForResponse(
			( r ) => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
		);
		await cascadeCb.check();
		const payload2 = ( await saveResp2 ).request().postDataJSON();
		expect( payload2?.config?.items?.[ 'edit.php' ]?.cascade_hide ).toBe( true );

		// --- 3. Cascade ON + parent hidden for editor: every live child gone. ---
		expect( dumpEditPhpChildren( 'maestro_editor' ) ).toEqual( [] );

		// Role-mirror: an administrator (the parent is NOT hidden from) still
		// sees every child — cascade never broadens beyond the exact roles the
		// parent is hidden from.
		expect( dumpEditPhpChildren( 'admin' ) ).toEqual(
			expect.arrayContaining( [ 'post-new.php' ] )
		);

		await page.keyboard.press( 'Escape' );

		// --- 4. Cosmetic-only guardrail: a cascade-hidden child page still
		// loads by direct URL for a capable user — the sidebar row is gone,
		// but the capability that gates the page itself is untouched. ---
		const editorContext = await page.context().browser()!.newContext();
		const editorPage = await editorContext.newPage();
		await editorPage.goto( '/wp-login.php' );
		await editorPage.fill( '#user_login', 'maestro_editor' );
		await editorPage.fill( '#user_pass', 'password' );
		await editorPage.click( '#wp-submit' );
		await editorPage.waitForURL( /wp-admin/ );

		await editorPage.goto( '/wp-admin/post-new.php' );
		await expect( editorPage ).toHaveURL( /post-new\.php/ );
		await expect( editorPage.locator( 'body' ) ).not.toContainText( 'Sorry, you are not allowed' );
		await editorContext.close();

		// Clean up: reset all so a rerun starts clean.
		page.once( 'dialog', ( d ) => d.accept() );
		await page.locator( '.maestro-reset-all' ).click();
		await expect( page.locator( '#menu-posts' ) ).toBeVisible();
	} );

} );
