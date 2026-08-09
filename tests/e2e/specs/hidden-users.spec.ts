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
 * The navigation budget comes from `navigationTimeout` in playwright.config.ts
 * rather than being set here — a wp-env login can exceed Playwright's 30s
 * default on a loaded machine, and that ceiling now protects every secondary
 * login in the suite instead of just this one. This spec originally failed in
 * CI on all three attempts for exactly that reason while passing locally every
 * time.
 */
async function signInAs( browser, login: string ) {
	const context = await browser.newContext();
	const page = await context.newPage();
	await page.goto( '/wp-login.php' );
	await page.fill( '#user_login', login );
	await page.fill( '#user_pass', 'password' );
	await Promise.all( [
		page.waitForURL( /wp-admin/ ),
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

	// Fixture users AND their authenticated sessions are created ONCE for the
	// file. The users are read-only and the sessions are only ever used to read
	// a rendered sidebar after a fresh goto(), so sharing them is safe — and it
	// matters: signing in per test added roughly seven full logins to a suite
	// that previously did two, which was enough extra load to start flaking
	// UNRELATED specs on a busy machine. Config isolation, which genuinely is
	// needed per test, still comes from the maestroCleanConfig auto-fixture.
	let target: { context: any; page: any };
	let other: { context: any; page: any };

	test.beforeAll( async ( { browser } ) => {
		createUsers();
		target = await signInAs( browser, TARGET_LOGIN );
		other = await signInAs( browser, OTHER_LOGIN );
	} );

	test.afterAll( async () => {
		await target?.context.close();
		await other?.context.close();
		deleteUsers();
	} );

	// Each test signs in as up to two additional users on top of the admin
	// session; on a loaded CI runner that is comfortably more than the default
	// per-test budget allows.
	test.slow();

	test( 'hiding an item from one person removes it for them only, leaves a same-role bystander untouched, and keeps the page reachable by URL', async ( { page } ) => {
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
		await target.page.goto( '/wp-admin/index.php' );
		await expect( target.page.locator( '#menu-posts' ) ).toHaveCount( 0 );

		// --- Cosmetic-only: the page still loads by direct URL for them. ---
		await target.page.goto( '/wp-admin/edit.php' );
		await expect( target.page ).toHaveURL( /edit\.php/ );
		await expect( target.page.locator( 'body' ) ).not.toContainText( 'Sorry, you are not allowed' );

		// --- A bystander with the SAME ROLE keeps the row. This is the
		// assertion that proves the rule is per-user and did not widen to the
		// whole role — every other assertion here would pass if it had. ---
		await other.page.goto( '/wp-admin/index.php' );
		await expect( other.page.locator( '#menu-posts' ) ).toBeVisible();
	} );

	test( 'hiding sub-items from one person leaves the parent visible and their children gone, and removing the rule restores them', async ( { page } ) => {
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
		await target.page.goto( '/wp-admin/index.php' );
		await expect( target.page.locator( '#menu-posts' ) ).toBeVisible();
		await expect( target.page.locator( '#menu-posts .wp-submenu a[href*="post-new.php"]' ) ).toHaveCount( 0 );
		await expect( target.page.locator( '#menu-posts .wp-submenu a[href="edit.php"]' ) ).toHaveCount( 0 );

		// Hidden child page still loads by direct URL.
		await target.page.goto( '/wp-admin/post-new.php' );
		await expect( target.page ).toHaveURL( /post-new\.php/ );
		await expect( target.page.locator( 'body' ) ).not.toContainText( 'Sorry, you are not allowed' );

		// A same-role bystander keeps every child.
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

		// Normal browsing: the self-hide applies, and the admin-bar toggle —
		// Maestro's ONLY entry point, and what the §11 rail protects — survives.
		await page.goto( '/wp-admin/index.php' );
		await expect( page.locator( '#menu-posts' ) ).toHaveCount( 0 );
		await expect( page.locator( '#wp-admin-bar-maestro-toggle' ) ).toBeVisible();

		// AND THE RULE IS ACTUALLY UNDOABLE (Codex P2, 2026-08-09). Re-entering
		// edit mode is not enough on its own: if replay dropped the row before
		// get_menu_model() ran, there would be no row to click and "warn but
		// allow" would strand the admin on Reset All. The row must come BACK in
		// edit mode, still carrying its chip, and removing the chip must restore
		// it everywhere. My original test asserted only that edit mode opened —
		// which would have passed against the broken behaviour.
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
		await expect( page.locator( '#menu-posts' ) ).toBeVisible();

		const reopened = await openPostsVisibility( page );
		const chip = reopened.locator( '.maestro-vis-own-users .maestro-user-chip' );
		await expect( chip ).toContainText( 'admin' );

		const saveResp = page.waitForResponse(
			( r ) => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok()
		);
		await reopened.locator( '.maestro-vis-own-users .maestro-user-chip-remove' ).first().click();
		await saveResp;
		await page.keyboard.press( 'Escape' );

		// Undone: the row is back during normal browsing too.
		await page.goto( '/wp-admin/index.php' );
		await expect( page.locator( '#menu-posts' ) ).toBeVisible();
	} );

	test( 'the person picker is hidden entirely when the editor lacks list_users', async ( { page } ) => {
		// `maestro_capability` can hand Maestro to a role without `list_users`.
		// Core's users collection would then return only published authors, so a
		// picker would offer a quietly incomplete set of people. The person axes
		// are withheld rather than shown broken — and the ROLE axes must keep
		// working, since that is the whole fallback. (Codex P2, 2026-08-09.)
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		const canPick = await page.evaluate( () => window.maestroData.canPickUsers );
		expect( canPick, 'an administrator holds list_users, so the picker should be offered' ).toBeTruthy();

		const picker = await openPostsVisibility( page );
		await expect( picker.locator( '.maestro-vis-own-users' ) ).toHaveCount( 1 );

		// Simulate the capability-less editor by rebuilding the popover with the
		// flag off — the gate is a pure read of localized data, so this exercises
		// the real branch without needing a second custom role in the fixture.
		// NB: the popover must be reopened WITHOUT navigating; a reload would
		// re-localize maestroData from the server and silently restore the flag.
		await page.keyboard.press( 'Escape' );
		await page.evaluate( () => { window.maestroData.canPickUsers = false; } );
		await page.locator( '.maestro-toolbar .maestro-panel .maestro-vis-btn' ).click();
		const gated = page.locator( '.maestro-vis-popover' );
		await expect( gated ).toBeVisible();
		await expect( gated.locator( '.maestro-vis-own-users' ) ).toHaveCount( 0 );
		await expect( gated.locator( '.maestro-vis-children-users' ) ).toHaveCount( 0 );
		// The role groups survive — hiding by role still works without list_users.
		await expect( gated.locator( '.maestro-vis-own' ) ).toHaveCount( 1 );
		await expect( gated.locator( '.maestro-vis-children' ) ).toHaveCount( 1 );
	} );
} );
