import { test, expect } from '../fixtures';
import { execFileSync } from 'child_process';

/**
 * Phase 27 (ROLE-02, second half) — hiding profiles, end to end.
 *
 * Asserted in the MEMBER's own authenticated sidebar, with a same-role
 * BYSTANDER outside the profile as the control. A profile is a group by
 * construction, so a rule that widened to the whole role would pass every
 * "the member cannot see it" assertion; only the bystander catches that.
 *
 * The membership assertions are what this spec adds over hidden-users.spec.ts.
 * Which items a profile hides is compiled onto the item; WHO is in it is read
 * live at request time. So taking the member out of the profile must bring the
 * row back while the item still names the profile, and putting them back must
 * hide it again. If profiles were only a fancy way to write hidden_users, the
 * stored item axis would change instead.
 *
 * Mechanics follow hidden-users.spec.ts: fixture users created by the spec
 * (the PHP integration suite wipes every user but admin), and their sessions
 * signed in ONCE per file.
 */

const POST_SAVE = ( url: string ) => url.includes( '/maestro/v1/config' );

const MEMBER_LOGIN = 'maestro_profile_member';
const MEMBER_NAME  = 'Mona Member';
const OTHER_LOGIN  = 'maestro_profile_bystander';
const PROFILE      = 'Reduced view';

function wpRun( args: string[] ): string {
	return execFileSync( 'npx', [ 'wp-env', 'run', 'tests-cli', 'wp', ...args ], { encoding: 'utf8' } );
}

function wp( args: string[] ): void {
	try {
		execFileSync( 'npx', [ 'wp-env', 'run', 'tests-cli', 'wp', ...args ], { stdio: 'ignore' } );
	} catch ( e ) {
		// Creating a user that exists, or deleting one that doesn't, exits
		// non-zero; both are the desired end state.
	}
}

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

/** The stored option, read straight from the database. */
function storedConfig(): any {
	const out = wpRun( [ 'option', 'get', 'maestro_config', '--format=json' ] );
	return JSON.parse( out.slice( out.indexOf( '{' ) ) );
}

/** Sign in as a fixture user in a fresh context (see hidden-users.spec.ts). */
async function signInAs( browser, login: string ) {
	const context = await browser.newContext();
	const page = await context.newPage();
	await expect( async () => {
		await page.goto( '/wp-login.php', { waitUntil: 'domcontentloaded', timeout: 15_000 } );
		await expect( page.locator( '#user_login' ) ).toBeVisible( { timeout: 5_000 } );
		await page.fill( '#user_login', login );
		await page.fill( '#user_pass', 'password' );
		await Promise.all( [
			page.waitForURL( /wp-admin/, { waitUntil: 'domcontentloaded', timeout: 20_000 } ),
			page.click( '#wp-submit' ),
		] );
	} ).toPass( { timeout: 120_000 } );
	return { context, page };
}

function saved( page ) {
	return page.waitForResponse( ( r ) => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok() );
}

async function openProfiles( page ) {
	await page.locator( '.maestro-toolbar .maestro-profiles-btn' ).click();
	const dialog = page.getByRole( 'dialog', { name: 'Visibility groups' } );
	await expect( dialog ).toBeVisible();
	return dialog;
}

/** Add the member to the (only) profile through its person picker. */
async function addMember( page, dialog ) {
	const members = dialog.locator( '.maestro-profile-members' );
	await members.locator( '.maestro-user-search' ).fill( MEMBER_NAME.split( ' ' )[ 0 ] );
	const result = members.locator( '.maestro-user-result' ).filter( { hasText: MEMBER_NAME } ).first();
	await expect( result ).toBeVisible( { timeout: 15000 } );
	const resp = saved( page );
	await result.click();
	await expect( members.locator( '.maestro-user-chip' ) ).toContainText( MEMBER_NAME );
	return ( await resp ).request().postDataJSON();
}

async function removeMember( page, dialog ) {
	const resp = saved( page );
	await dialog.locator( '.maestro-profile-members .maestro-user-chip-remove' ).first().click();
	await expect( dialog.locator( '.maestro-profile-members .maestro-user-chip' ) ).toHaveCount( 0 );
	return ( await resp ).request().postDataJSON();
}

test.describe( 'ROLE-02 — hiding profiles', () => {
	let member: { context: any; page: any };
	let other: { context: any; page: any };

	test.beforeAll( async ( { browser } ) => {
		// Two logins, each with its own 120s retry budget (see hidden-users).
		test.setTimeout( 300000 );
		ensureUser( MEMBER_LOGIN, MEMBER_NAME );
		ensureUser( OTHER_LOGIN, 'Olly Outsider' );
		member = await signInAs( browser, MEMBER_LOGIN );
		other = await signInAs( browser, OTHER_LOGIN );
	} );

	test.afterAll( async () => {
		await member?.context.close();
		await other?.context.close();
		wp( [ 'user', 'delete', MEMBER_LOGIN, '--yes' ] );
		wp( [ 'user', 'delete', OTHER_LOGIN, '--yes' ] );
	} );

	test.slow();

	test( 'a profile hides an item for its members only, membership is live both ways, and deleting it restores the row', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		// --- Create the profile and put the member in it. ---
		let dialog = await openProfiles( page );
		await dialog.getByLabel( 'New group name' ).fill( PROFILE );
		let resp = saved( page );
		await dialog.getByRole( 'button', { name: 'Add group' } ).click();
		await expect( dialog.locator( '.maestro-profile-name' ) ).toHaveValue( PROFILE );
		const created = ( await resp ).request().postDataJSON();
		const profileId = Object.keys( created?.config?.profiles ?? {} )[ 0 ];
		expect( profileId ).toMatch( /^p_[1-9]/ );

		const withMember = await addMember( page, dialog );
		expect( withMember?.config?.profiles?.[ profileId ]?.users ).toHaveLength( 1 );
		await page.keyboard.press( 'Escape' );
		await expect( dialog ).toHaveCount( 0 );

		// --- Assign it to Posts in the item's Visibility. ---
		await page.locator( '#menu-posts > a.menu-top' ).click();
		await page.locator( '.maestro-toolbar .maestro-panel .maestro-vis-btn' ).click();
		const picker = page.locator( '.maestro-vis-popover' );
		const group = picker.getByRole( 'group', { name: 'Hide this item for visibility groups:' } );
		await expect( group ).toBeVisible();
		resp = saved( page );
		await group.getByLabel( PROFILE ).check();
		const assigned = ( await resp ).request().postDataJSON();
		expect( assigned?.config?.profiles?.[ profileId ]?.hides ).toEqual( [ 'edit.php' ] );
		// The profile axis never rides on the item; the map is its only source.
		expect( assigned?.config?.items?.[ 'edit.php' ]?.hidden_profiles ).toBeFalsy();
		await expect( page.locator( '#menu-posts' ) ).toHaveClass( /maestro-has-hidden/ );
		await page.keyboard.press( 'Escape' );

		// The server compiled it onto the item.
		expect( storedConfig().items?.[ 'edit.php' ]?.hidden_profiles ).toEqual( [ profileId ] );

		// The admin authoring the rule still sees Posts.
		await expect( page.locator( '#menu-posts' ) ).toBeVisible();

		// --- The member: the row is GONE from their own sidebar. ---
		await member.page.goto( '/wp-admin/index.php' );
		await expect( member.page.locator( '#menu-posts' ) ).toHaveCount( 0 );

		// --- Cosmetic only: the page still loads by direct URL. ---
		await member.page.goto( '/wp-admin/edit.php' );
		await expect( member.page ).toHaveURL( /edit\.php/ );
		await expect( member.page.locator( 'body' ) ).not.toContainText( 'Sorry, you are not allowed' );

		// --- The bystander, same role, not in the profile, keeps the row.
		// Every assertion above would also pass had the rule widened to the
		// whole role; this one would not. ---
		await other.page.goto( '/wp-admin/index.php' );
		await expect( other.page.locator( '#menu-posts' ) ).toBeVisible();

		// --- Live membership, out: take the member out of the profile. The
		// item still names the profile, so the row returning proves WHO is
		// resolved at request time, not compiled. ---
		dialog = await openProfiles( page );
		const withoutMember = await removeMember( page, dialog );
		expect( withoutMember?.config?.profiles?.[ profileId ]?.users ).toBeFalsy();
		expect( withoutMember?.config?.profiles?.[ profileId ]?.hides ).toEqual( [ 'edit.php' ] );
		expect( storedConfig().items?.[ 'edit.php' ]?.hidden_profiles ).toEqual( [ profileId ] );

		await member.page.goto( '/wp-admin/index.php' );
		await expect( member.page.locator( '#menu-posts' ) ).toBeVisible();

		// --- Live membership, in: put them back, and the row goes again. ---
		await addMember( page, dialog );
		await member.page.goto( '/wp-admin/index.php' );
		await expect( member.page.locator( '#menu-posts' ) ).toHaveCount( 0 );

		// --- Deleting the profile restores the row and leaves nothing behind. ---
		page.once( 'dialog', ( d ) => d.accept() );
		resp = saved( page );
		await dialog.getByRole( 'button', { name: `Delete ${ PROFILE }` } ).click();
		await expect( dialog.locator( '.maestro-profile' ) ).toHaveCount( 0 );
		const deleted = ( await resp ).request().postDataJSON();
		expect( JSON.stringify( deleted?.config?.profiles ) ).toBe( '{}' );
		await page.keyboard.press( 'Escape' );
		await expect( page.locator( '#menu-posts' ) ).not.toHaveClass( /maestro-has-hidden/ );

		const after = storedConfig();
		expect( after.profiles ).toBeFalsy();
		expect( after.items?.[ 'edit.php' ]?.hidden_profiles ).toBeFalsy();

		await member.page.goto( '/wp-admin/index.php' );
		await expect( member.page.locator( '#menu-posts' ) ).toBeVisible();
	} );

	test( 'a sub-items profile leaves the parent visible for its members and the children gone', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		const dialog = await openProfiles( page );
		await dialog.getByLabel( 'New group name' ).fill( PROFILE );
		await dialog.getByRole( 'button', { name: 'Add group' } ).click();
		await addMember( page, dialog );
		await page.keyboard.press( 'Escape' );

		await page.locator( '#menu-posts > a.menu-top' ).click();
		await page.locator( '.maestro-toolbar .maestro-panel .maestro-vis-btn' ).click();
		const group = page.locator( '.maestro-vis-popover' )
			.getByRole( 'group', { name: 'Hide its sub-items for visibility groups:' } );
		const resp = saved( page );
		await group.getByLabel( PROFILE ).check();
		const payload = ( await resp ).request().postDataJSON();
		const id = Object.keys( payload?.config?.profiles ?? {} )[ 0 ];
		expect( payload?.config?.profiles?.[ id ]?.child_hides ).toEqual( [ 'edit.php' ] );
		expect( payload?.config?.profiles?.[ id ]?.hides ).toBeFalsy();
		await page.keyboard.press( 'Escape' );

		// Parent visible, children gone, for the member.
		await member.page.goto( '/wp-admin/index.php' );
		await expect( member.page.locator( '#menu-posts' ) ).toBeVisible();
		await expect( member.page.locator( '#menu-posts .wp-submenu a[href*="post-new.php"]' ) ).toHaveCount( 0 );

		// A hidden child still loads by URL.
		await member.page.goto( '/wp-admin/post-new.php' );
		await expect( member.page ).toHaveURL( /post-new\.php/ );
		await expect( member.page.locator( 'body' ) ).not.toContainText( 'Sorry, you are not allowed' );

		// The bystander keeps every child.
		await other.page.goto( '/wp-admin/index.php' );
		await expect( other.page.locator( '#menu-posts .wp-submenu a[href*="post-new.php"]' ) ).toBeVisible();
	} );
} );
