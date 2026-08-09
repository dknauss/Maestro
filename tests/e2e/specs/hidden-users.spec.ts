import { test, expect } from '../fixtures';
import { execFileSync } from 'child_process';

/**
 * ROLE-02 — per-user cosmetic hiding ("Hide this item from specific people:" /
 * "Hide its sub-items from specific people:").
 *
 * Asserted DIRECTLY against the rendered sidebar in the TARGETED user's own
 * authenticated session, not against a dump or the admin's editor view. That
 * matters: COMPAT-10 once shipped a model that passed every unit and
 * integration test while being completely inert in a real sidebar, and only a
 * direct browser assertion caught it. Per-user hiding has the same failure mode
 * available to it.
 *
 * The bystander assertions are what distinguish this feature from role hiding:
 * a second editor, same role as the target, must keep every row. A rule that
 * silently widened to the whole role would pass every "target cannot see it"
 * assertion on its own.
 */

const POST_SAVE = ( url: string ) => url.includes( '/maestro/v1/config' );

function wp( args: string[] ): void {
	try {
		execFileSync( 'npx', [ 'wp-env', 'run', 'tests-cli', 'wp', ...args ], { stdio: 'ignore' } );
	} catch ( e ) {
		// Creating a user that already exists, or deleting one that doesn't,
		// exits non-zero — both are the desired end state, so swallow it (the
		// same pattern fixtures.ts and cascade-hide.spec.ts use).
	}
}

const TARGET_LOGIN = 'maestro_target';
const TARGET_NAME  = 'Tilly Target';
const OTHER_LOGIN  = 'maestro_bystander';

/**
 * Fixture users are created here rather than assumed to exist: running the
 * PHP integration suite reinstalls the shared tests database and wipes every
 * user except admin, so a spec that depends on a pre-existing account is
 * order-dependent in a way that is painful to debug.
 */
/**
 * Create a fixture user and PROVE it exists.
 *
 * `wp user create` exits non-zero when the account already survives from an
 * interrupted run, which is a fine end state — so that error is swallowed. But
 * swallowing every error means a genuinely failed fixture surfaces later as an
 * inscrutable login timeout, which is exactly how this spec first failed in CI.
 * The explicit `user get` turns that into a named failure at the point of cause.
 */
function ensureUser( login: string, displayName: string ): void {
	wp( [ 'user', 'create', login, `${ login }@example.com`,
		'--role=editor', `--display_name=${ displayName }`, '--user_pass=password' ] );
	try {
		execFileSync( 'npx', [ 'wp-env', 'run', 'tests-cli', 'wp', 'user', 'get', login, '--field=ID' ],
			{ stdio: 'ignore' } );
	} catch ( e ) {
		throw new Error( `Fixture user "${ login }" could not be created — the spec cannot sign in as them.` );
	}
}

function createUsers(): void {
	ensureUser( TARGET_LOGIN, TARGET_NAME );
	ensureUser( OTHER_LOGIN, 'Barry Bystander' );
}

function deleteUsers(): void {
	wp( [ 'user', 'delete', TARGET_LOGIN, '--yes' ] );
	wp( [ 'user', 'delete', OTHER_LOGIN, '--yes' ] );
}

/**
 * Sign in as a fixture user in a fresh context.
 *
 * The generous navigation timeout is deliberate and matches the reasoning in
 * auth.setup.ts: a cold or loaded wp-env can exceed Playwright's default 30s
 * nav budget, and that is a slow environment rather than a broken feature.
 * Without it this spec fails in CI while passing locally every time — which it
 * did, on all three attempts, before this was added.
 */
async function signInAs( browser, login: string ) {
	const context = await browser.newContext();
	const page = await context.newPage();
	await page.goto( '/wp-login.php' );
	await page.fill( '#user_login', login );
	await page.fill( '#user_pass', 'password' );
	await Promise.all( [
		page.waitForURL( /wp-admin/, { timeout: 60000 } ),
		page.click( '#wp-submit' ),
	] );
	return { context, page };
}

/** Open the visibility popover for Posts as the admin. */
async function openPostsVisibility( page ) {
	await page.goto( '/wp-admin/index.php?maestro_edit=1' );
	const panel = page.locator( '.maestro-toolbar .maestro-panel' );
	await page.locator( '#menu-posts > a.menu-top' ).click();
	await expect( panel ).toBeVisible();
	await panel.locator( '.maestro-vis-btn' ).click();
	const picker = page.locator( '.maestro-vis-popover' );
	await expect( picker ).toBeVisible();
	return picker;
}

/** Type into a group's search box and pick the named person. */
async function pickPerson( page, groupSelector: string, name: string ) {
	const group = page.locator( `.maestro-vis-popover ${ groupSelector }` );
	await group.locator( '.maestro-user-search' ).fill( name.split( ' ' )[ 0 ] );
	const result = group.locator( '.maestro-user-result' ).filter( { hasText: name } ).first();
	await expect( result ).toBeVisible( { timeout: 15000 } );

	const saveResp = page.waitForResponse(
		( r ) => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
	);
	await result.click();
	await expect( group.locator( '.maestro-user-chip' ) ).toContainText( name );
	return ( await saveResp ).request().postDataJSON();
}

test.describe( 'ROLE-02 — per-user cosmetic hiding', () => {

	// Created ONCE for the file, not per test. The fixture users are read-only —
	// no test mutates them — so per-test create/delete only added six wp-cli
	// round trips and a window for them to race the browser contexts. Config
	// isolation, which genuinely IS needed per test, comes from the
	// maestroCleanConfig auto-fixture in ../fixtures.
	test.beforeAll( () => { createUsers(); } );
	test.afterAll( () => { deleteUsers(); } );

	// Each test signs in as up to two additional users on top of the admin
	// session; on a loaded CI runner that is comfortably more than the default
	// per-test budget allows.
	test.slow();

	test( 'hiding an item from one person removes it for them only, leaves a same-role bystander untouched, and keeps the page reachable by URL', async ( { page, browser } ) => {
		const picker = await openPostsVisibility( page );

		// All four target groups are present on a parent with children.
		await expect( picker.locator( '.maestro-vis-head' ) ).toHaveText( [
			'Hide this item from:',
			'Hide its sub-items from:',
			'Hide this item from specific people:',
			'Hide its sub-items from specific people:',
		] );

		// WCAG 1.3.1 (A): the per-user groups need programmatic names for the
		// same reason the role groups do — all four look alike to an AT user.
		const ownUsers = picker.locator( '.maestro-vis-own-users' );
		const childUsers = picker.locator( '.maestro-vis-children-users' );
		for ( const [ group, expectedName ] of [
			[ ownUsers, 'Hide this item from specific people:' ],
			[ childUsers, 'Hide its sub-items from specific people:' ],
		] as const ) {
			await expect( group ).toHaveAttribute( 'role', 'group' );
			const labelledBy = await group.getAttribute( 'aria-labelledby' );
			expect( labelledBy ).toBeTruthy();
			await expect( page.locator( `#${ labelledBy }` ) ).toHaveText( expectedName );
		}
		expect( await ownUsers.getAttribute( 'aria-labelledby' ) )
			.not.toBe( await childUsers.getAttribute( 'aria-labelledby' ) );

		// Hide Posts from the target person only.
		const payload = await pickPerson( page, '.maestro-vis-own-users', TARGET_NAME );
		const stored = payload?.config?.items?.[ 'edit.php' ];
		expect( Array.isArray( stored?.hidden_users ) ).toBe( true );
		expect( stored?.hidden_users ).toHaveLength( 1 );
		// The role axis must stay untouched — this is a per-USER rule.
		expect( stored?.hidden_roles ).toBeFalsy();
		await page.keyboard.press( 'Escape' );

		// The admin authoring the rule still sees Posts.
		await expect( page.locator( '#menu-posts' ) ).toBeVisible();

		// --- The targeted person: the row is GONE from their real sidebar. ---
		const target = await signInAs( browser, TARGET_LOGIN );
		await target.page.goto( '/wp-admin/index.php' );
		await expect( target.page.locator( '#menu-posts' ) ).toHaveCount( 0 );

		// --- Cosmetic-only: the page still loads by direct URL for them. ---
		await target.page.goto( '/wp-admin/edit.php' );
		await expect( target.page ).toHaveURL( /edit\.php/ );
		await expect( target.page.locator( 'body' ) ).not.toContainText( 'Sorry, you are not allowed' );

		// --- A bystander with the SAME ROLE keeps the row. This is the
		// assertion that proves the rule is per-user and did not widen to the
		// whole role — every other assertion here would pass if it had. ---
		const other = await signInAs( browser, OTHER_LOGIN );
		await other.page.goto( '/wp-admin/index.php' );
		await expect( other.page.locator( '#menu-posts' ) ).toBeVisible();

		await target.context.close();
		await other.context.close();
	} );

	test( 'hiding sub-items from one person leaves the parent visible and their children gone, and removing the rule restores them', async ( { page, browser } ) => {
		const picker = await openPostsVisibility( page );

		const payload = await pickPerson( page, '.maestro-vis-children-users', TARGET_NAME );
		const stored = payload?.config?.items?.[ 'edit.php' ];
		expect( stored?.child_hidden_users ).toHaveLength( 1 );
		// The parent's OWN axes are untouched — the parent must stay visible.
		expect( stored?.hidden_users ).toBeFalsy();
		expect( stored?.child_hidden_roles ).toBeFalsy();
		await page.keyboard.press( 'Escape' );

		// --- Parent VISIBLE, children GONE. An inert implementation would
		// either drop the parent too or change nothing at all; this is the
		// assertion that distinguishes a real cascade from both. ---
		const target = await signInAs( browser, TARGET_LOGIN );
		await target.page.goto( '/wp-admin/index.php' );
		await expect( target.page.locator( '#menu-posts' ) ).toBeVisible();
		await expect( target.page.locator( '#menu-posts .wp-submenu a[href*="post-new.php"]' ) ).toHaveCount( 0 );
		await expect( target.page.locator( '#menu-posts .wp-submenu a[href="edit.php"]' ) ).toHaveCount( 0 );

		// Hidden child page still loads by direct URL.
		await target.page.goto( '/wp-admin/post-new.php' );
		await expect( target.page ).toHaveURL( /post-new\.php/ );
		await expect( target.page.locator( 'body' ) ).not.toContainText( 'Sorry, you are not allowed' );

		// A same-role bystander keeps every child.
		const other = await signInAs( browser, OTHER_LOGIN );
		await other.page.goto( '/wp-admin/index.php' );
		await expect( other.page.locator( '#menu-posts .wp-submenu a[href*="post-new.php"]' ) ).toBeVisible();

		// --- Remove the rule via the chip; the children come back. ---
		const reopened = await openPostsVisibility( page );
		const chipRemove = reopened.locator( '.maestro-vis-children-users .maestro-user-chip-remove' ).first();
		const saveResp = page.waitForResponse(
			( r ) => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
		);
		await chipRemove.click();
		// Removing the last target must clear the axis entirely (sparse contract).
		const afterPayload = ( await saveResp ).request().postDataJSON();
		expect( afterPayload?.config?.items?.[ 'edit.php' ]?.child_hidden_users ).toBeFalsy();
		await page.keyboard.press( 'Escape' );

		await target.page.goto( '/wp-admin/index.php' );
		await expect( target.page.locator( '#menu-posts .wp-submenu a[href*="post-new.php"]' ) ).toBeVisible();

		await target.context.close();
		await other.context.close();
	} );

	test( 'targeting your own account warns inline but is permitted, and never removes the editor entry point', async ( { page } ) => {
		const picker = await openPostsVisibility( page );
		const ownUsers = picker.locator( '.maestro-vis-own-users' );

		// No caution before a self-target exists.
		await expect( ownUsers.locator( '.maestro-user-selfwarn' ) ).toBeHidden();

		// Target the acting admin themselves.
		await pickPerson( page, '.maestro-vis-own-users', 'admin' );

		// Warned, but the rule was still accepted (the chip is there).
		await expect( ownUsers.locator( '.maestro-user-selfwarn' ) ).toBeVisible();
		await expect( ownUsers.locator( '.maestro-user-chip' ) ).toContainText( 'admin' );
		await page.keyboard.press( 'Escape' );

		// The admin-bar toggle — Maestro's ONLY entry point, and the thing the
		// §11 anti-lockout rail protects — survives a self-hide. Re-entering
		// edit mode still works, so the admin can undo what they just did.
		await page.goto( '/wp-admin/index.php' );
		await expect( page.locator( '#menu-posts' ) ).toHaveCount( 0 );
		await expect( page.locator( '#wp-admin-bar-maestro-toggle' ) ).toBeVisible();

		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
	} );
} );
