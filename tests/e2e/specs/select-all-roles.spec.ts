import { test, expect, EDITOR_STATE } from '../fixtures';
import { execFileSync } from 'child_process';

/**
 * Phase 29 (UX-14, #214): "All other roles", the tri-state checkbox at the top
 * of each role group in the Visibility popover.
 *
 * One activation ticks every role the editing user does not hold, in a single
 * save; a second clears them. The admin keeps the item; a user of another role
 * loses it. In "Hide its sub-items from:", rows locked by the parent's own hide
 * are not targets: they stay derived, checked and aria-disabled, and are never
 * written into child_hidden_roles.
 */

const POST_SAVE = ( url: string ) => url.includes( '/maestro/v1/config' );

function saved( page ) {
	return page.waitForResponse( ( r ) => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok() );
}

async function recordSpeech( page ) {
	await page.evaluate( () => {
		const w = window as any;
		w.__spoken = [];
		// wp.a11y is a module namespace whose exports cannot be reassigned, so
		// replace the object rather than its speak property.
		const a11y = w.wp.a11y;
		w.wp.a11y = { ...a11y, speak: ( m: string, p?: string ) => { w.__spoken.push( m ); return a11y.speak( m, p ); } };
	} );
}

function spoken( page ): Promise< string[] > {
	return page.evaluate( () => ( window as any ).__spoken );
}

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

// Start and end each test from an empty config. Deleting the option is the
// same state a fresh install has; `option delete` on an absent option exits
// non-zero, which is also fine.
function resetConfig(): void {
	try {
		execFileSync( 'npx', [ 'wp-env', 'run', 'tests-cli', 'wp', 'option', 'delete', 'maestro_config' ], { stdio: 'ignore' } );
	} catch ( e ) {
		// Already absent.
	}
}

test.describe( 'Phase 29 — "All other roles" select-all', () => {

	test.beforeEach( resetConfig );
	test.afterEach( resetConfig );

	test( 'one activation hides the item from every other role in one save; the admin keeps it; a second clears it', async ( { page, browser } ) => {
		test.slow();

		const picker = await openPostsVisibility( page );
		const others = await page.evaluate( () => {
			const d = ( window as any ).maestroData;
			return Object.keys( d.roles ).filter( ( r ) => d.userRoles.indexOf( r ) === -1 );
		} );
		expect( others ).not.toContain( 'administrator' );
		expect( others ).toContain( 'editor' );

		const own = picker.locator( '.maestro-vis-own' );
		const all = own.getByRole( 'checkbox', { name: 'Hide this item from: All other roles' } );
		await expect( all ).toBeVisible();
		await expect( all ).not.toBeChecked();
		// It names the role it leaves alone, as its description.
		await expect( all ).toHaveAccessibleDescription( '(not Administrator)' );
		// The control comes before the first role in the tab order.
		await expect( own.locator( 'input[type="checkbox"]' ).first() ).toHaveClass( /maestro-vis-all-cb/ );

		// Record announcements: the "Saved" status speaks into the same live
		// region straight after, so reading the region would only see that.
		await recordSpeech( page );

		// --- Tick: exactly one save carrying every other role. ---
		let posts = 0;
		page.on( 'request', ( r ) => {
			if ( POST_SAVE( r.url() ) && r.method() === 'POST' ) { posts++; }
		} );
		const firstSave = saved( page );
		await all.check();
		const payload = ( await firstSave ).request().postDataJSON();
		const stored = payload?.config?.items?.[ 'edit.php' ]?.hidden_roles ?? [];
		expect( [ ...stored ].sort() ).toEqual( [ ...others ].sort() );
		expect( stored ).not.toContain( 'administrator' );
		expect( posts ).toBe( 1 );
		await expect( own.getByLabel( 'Editor', { exact: true } ) ).toBeChecked();
		await expect( own.getByLabel( 'Administrator', { exact: true } ) ).not.toBeChecked();
		expect( await spoken( page ) ).toContain( 'Hide this item from: every other role is now ticked.' );

		// --- Mixed: untick one role and the control shows "some". ---
		const partial = saved( page );
		await own.getByLabel( 'Editor', { exact: true } ).uncheck();
		await partial;
		expect( await all.evaluate( ( n: HTMLInputElement ) => n.indeterminate ) ).toBe( true );
		await expect( all ).not.toBeChecked();
		// From mixed, one activation ticks them all again.
		const refill = saved( page );
		await all.click();
		await refill;
		expect( await all.evaluate( ( n: HTMLInputElement ) => n.indeterminate ) ).toBe( false );
		await expect( all ).toBeChecked();
		await page.keyboard.press( 'Escape' );

		// --- The admin still sees Posts after a reload; an editor does not. ---
		await page.goto( '/wp-admin/index.php' );
		await expect( page.locator( '#menu-posts' ) ).toBeVisible();
		const editorContext = await browser.newContext( { storageState: EDITOR_STATE } );
		const editorPage = await editorContext.newPage();
		await editorPage.goto( '/wp-admin/index.php' );
		await expect( editorPage.locator( '#menu-posts' ) ).toHaveCount( 0 );

		// --- A second activation clears them, in one save. ---
		const picker2 = await openPostsVisibility( page );
		const all2 = picker2.locator( '.maestro-vis-own' ).getByRole( 'checkbox', { name: 'Hide this item from: All other roles' } );
		await expect( all2 ).toBeChecked();
		await recordSpeech( page );
		const clearSave = saved( page );
		await all2.uncheck();
		const cleared = ( await clearSave ).request().postDataJSON();
		expect( cleared?.config?.items?.[ 'edit.php' ]?.hidden_roles ?? [] ).toEqual( [] );
		expect( await spoken( page ) ).toContain( 'Hide this item from: every other role is now cleared.' );

		await editorPage.goto( '/wp-admin/index.php' );
		await expect( editorPage.locator( '#menu-posts' ) ).toBeVisible();
		await editorContext.close();
	} );

	test( 'in "Hide its sub-items from:" locked rows stay derived and are never written', async ( { page } ) => {
		test.slow();

		const picker = await openPostsVisibility( page );
		const own = picker.locator( '.maestro-vis-own' );
		const children = picker.locator( '.maestro-vis-children' );

		// Hide Posts itself from Editor: Editor is now locked in the sub-items group.
		const lockSave = saved( page );
		await own.getByLabel( 'Editor', { exact: true } ).check();
		await lockSave;
		// Not exact: a locked row's label also holds its screen-reader reason.
		const lockedEditor = children.getByLabel( 'Editor' );
		await expect( lockedEditor ).toBeChecked();
		await expect( lockedEditor ).toHaveAttribute( 'aria-disabled', 'true' );

		const all = children.getByRole( 'checkbox', { name: 'Hide its sub-items from: All other roles' } );
		await expect( all ).toBeVisible();
		const save = saved( page );
		await all.check();
		const payload = ( await save ).request().postDataJSON();
		const childRoles = payload?.config?.items?.[ 'edit.php' ]?.child_hidden_roles ?? [];
		expect( childRoles ).not.toContain( 'editor' );
		expect( childRoles ).not.toContain( 'administrator' );
		expect( childRoles ).toContain( 'author' );
		// The parent's own hide was not touched by the sub-items control.
		expect( payload?.config?.items?.[ 'edit.php' ]?.hidden_roles ).toEqual( [ 'editor' ] );
		await expect( lockedEditor ).toBeChecked();
		await expect( lockedEditor ).toHaveAttribute( 'aria-disabled', 'true' );
		await expect( all ).toBeChecked();

		// Clearing leaves the locked row exactly as it was.
		const clear = saved( page );
		await all.uncheck();
		const after = ( await clear ).request().postDataJSON();
		expect( after?.config?.items?.[ 'edit.php' ]?.child_hidden_roles ?? [] ).toEqual( [] );
		await expect( lockedEditor ).toBeChecked();
		await expect( lockedEditor ).toHaveAttribute( 'aria-disabled', 'true' );
	} );

	test( 'the per-person groups have no select-all', async ( { page } ) => {
		const picker = await openPostsVisibility( page );
		await expect( picker.locator( '.maestro-vis-all' ) ).toHaveCount( 2 );
		await expect( picker.locator( '.maestro-vis-own-users .maestro-vis-all, .maestro-vis-children-users .maestro-vis-all' ) ).toHaveCount( 0 );
	} );
} );
