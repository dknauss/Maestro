import { test, expect, EDITOR_STATE } from '../fixtures';
import { execFileSync } from 'child_process';

/**
 * Phase 30 (ROLE-03, #215): read-only role preview.
 *
 * An administrator picks a role in the editor toolbar and presses Preview. The
 * Dashboard then shows the menu that role would get, with Maestro's rules for
 * the role applied, under a "read-only" banner with the picker and Exit
 * preview. Nothing is saved while previewing.
 *
 * Parity is the point of the feature, and it can only be checked here: core's
 * menu include runs once per PHP process, so each preview and each real user's
 * menu needs its own request. For every core role below Administrator the
 * preview's menu must match what a real user of that role sees.
 */

const POST_SAVE = ( url: string ) => url.includes( '/maestro/v1/config' );

function wp( args: string[] ): void {
	try {
		execFileSync( 'npx', [ 'wp-env', 'run', 'tests-cli', 'wp', ...args ], { stdio: 'ignore' } );
	} catch ( e ) {
		// Creating a user that exists, or deleting one that doesn't, exits
		// non-zero; both are the desired end state.
	}
}

const ROLE_USERS: Record< string, string > = {
	author: 'maestro_prev_author',
	contributor: 'maestro_prev_contrib',
	subscriber: 'maestro_prev_sub',
};

/** Every menu link, top level and submenu, as a sorted list of wp-admin paths. */
async function menuLinks( page ): Promise< string[] > {
	const hrefs: string[] = await page.locator( '#adminmenu a' ).evaluateAll(
		( links: HTMLAnchorElement[] ) => links.map( ( a ) => a.getAttribute( 'href' ) || '' )
	);
	return Array.from( new Set( hrefs.map( ( h ) => h.replace( /^.*\/wp-admin\//, '' ) ).filter( Boolean ) ) ).sort();
}

/** Start a preview through the editor's own picker. */
async function previewFromEditor( page, role: string ) {
	await page.goto( '/wp-admin/index.php?maestro_edit=1' );
	await page.locator( '.maestro-preview-toggle' ).click();
	const select = page.getByRole( 'combobox', { name: 'Preview as' } );
	await expect( select ).toBeVisible();
	await select.selectOption( role );
	await Promise.all( [
		page.waitForURL( /maestro_preview=/ ),
		page.locator( '.maestro-preview-btn' ).click(),
	] );
	await expect( page.locator( '.maestro-preview-banner' ) ).toBeVisible();
}

/**
 * Parity again with Maestro rules for the role: Profile hidden at the top
 * level and the Dashboard's sub-items hidden. Every core role has both, so
 * the rules change each role's menu.
 */
async function compareWithRule( page, real, role: string ) {
	wp( [ 'option', 'update', 'maestro_config', '--format=json', JSON.stringify( {
		items: {
			'profile.php': { hidden_roles: [ role ] },
			'users.php': { hidden_roles: [ role ] },
			'index.php': { child_hidden_roles: [ role ] },
		},
	} ) ] );
	await real.goto( '/wp-admin/index.php' );
	const expected = await menuLinks( real );
	expect( expected ).not.toContain( 'profile.php' );
	expect( expected ).toContain( 'index.php' );
	await previewFromEditor( page, role );
	expect( await menuLinks( page ) ).toEqual( expected );
}

async function signInAs( browser, login: string ) {
	const context = await browser.newContext();
	const page = await context.newPage();
	// Same retrying login as hidden-users.spec.ts: a cold wp-env can blow a
	// single navigation's budget, so short attempts are retried.
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

test.describe( 'role preview', () => {

	test( 'preview notice follows Screen Options and Help with either panel open', async ( { page } ) => {
		await previewFromEditor( page, 'administrator' );
		const banner = page.locator( '.maestro-preview-banner' );
		for ( const [ toggle, panel ] of [ [ '#show-settings-link', '#screen-options-wrap' ], [ '#contextual-help-link', '#contextual-help-wrap' ] ] ) {
			await page.locator( toggle ).click();
			await expect( page.locator( panel ) ).toBeVisible();
			await expect.poll( async () => {
				const bounds = await page.locator( panel ).boundingBox();
				const notice = await banner.boundingBox();
				return bounds!.y + bounds!.height <= notice!.y;
			} ).toBe( true );
			await page.locator( toggle ).click();
			await expect( page.locator( panel ) ).toBeHidden();
		}
		expect( await banner.evaluate( node => !! ( document.querySelector( '#screen-meta' )!.compareDocumentPosition( node ) & Node.DOCUMENT_POSITION_FOLLOWING ) ) ).toBe( true );
	} );
	test( 'the banner says read-only, explains the approximation, and offers the picker and exit', async ( { page } ) => {
		await previewFromEditor( page, 'editor' );
		const banner = page.locator( '.maestro-preview-banner' );
		await expect( banner ).toContainText( 'Previewing menu as Editor — read-only' );
		await expect( banner ).toContainText( 'approximation' );
		await expect( banner.getByLabel( 'Preview as' ) ).toHaveValue( 'editor' );
		await expect( banner.getByRole( 'link', { name: 'Exit preview' } ) ).toBeVisible();

		// The editor does not load, and the admin bar's toggle is the way out.
		await expect( page.locator( '.maestro-toolbar' ) ).toHaveCount( 0 );
		await expect( page.locator( '#wp-admin-bar-maestro-toggle' ) ).toContainText( 'Exit preview' );

		await page.locator( '#wp-admin-bar-maestro-toggle > a' ).click();
		await expect( page ).toHaveURL( /maestro_edit=1/ );
		await expect( page.locator( '.maestro-preview-banner' ) ).toHaveCount( 0 );
		await expect( page.locator( '#menu-settings' ) ).toBeVisible();
	} );

	test( 'switching role from the banner keeps previewing', async ( { page } ) => {
		await previewFromEditor( page, 'editor' );
		const banner = page.locator( '.maestro-preview-banner' );
		await banner.getByLabel( 'Preview as' ).selectOption( 'subscriber' );
		await banner.getByRole( 'button', { name: 'Preview' } ).click();
		await expect( banner ).toContainText( 'Previewing menu as Subscriber' );
		await expect( page.locator( '#menu-posts' ) ).toHaveCount( 0 );
	} );

	test( 'a request without a valid nonce is refused and shows the real menu', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_preview=editor&maestro_preview_nonce=nope' );
		await expect( page.locator( '.maestro-preview-banner' ) ).toHaveCount( 0 );
		await expect( page.locator( '.maestro-preview-refused' ) ).toContainText( 'expired' );
		await expect( page.locator( '#menu-settings' ) ).toBeVisible();
	} );

	test( 'someone without Maestro access gets no preview and no message', async ( { browser } ) => {
		const context = await browser.newContext( { storageState: EDITOR_STATE } );
		const page = await context.newPage();
		try {
			await page.goto( '/wp-admin/index.php?maestro_preview=subscriber&maestro_preview_nonce=nope' );
			await expect( page.locator( '.maestro-preview-banner' ) ).toHaveCount( 0 );
			await expect( page.locator( '.maestro-preview-refused' ) ).toHaveCount( 0 );
			await expect( page.locator( '#menu-posts' ) ).toBeVisible();
		} finally {
			await context.close();
		}
	} );

	test( 'a Maestro rule for the role applies, and previewing saves nothing', async ( { page } ) => {
		// Hide Posts from Editors through the stored config.
		wp( [ 'option', 'update', 'maestro_config', '--format=json',
			JSON.stringify( { version: 1, items: { 'edit.php': { hidden_roles: [ 'editor' ] } } } ) ] );

		const writes: string[] = [];
		page.on( 'request', ( r ) => {
			if ( POST_SAVE( r.url() ) && r.method() !== 'GET' ) { writes.push( r.method() ); }
		} );

		await previewFromEditor( page, 'editor' );
		await expect( page.locator( '#menu-posts' ) ).toHaveCount( 0 );
		await expect( page.locator( '#menu-pages' ) ).toBeVisible();
		// The rule is for Editors, not for the admin who is previewing.
		await page.goto( '/wp-admin/index.php' );
		await expect( page.locator( '#menu-posts' ) ).toBeVisible();
		expect( writes ).toEqual( [] );
	} );

	test( 'a pending rename is saved before the preview opens', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await page.locator( '#menu-posts > a.menu-top' ).click();
		const panel = page.locator( '.maestro-toolbar .maestro-panel' );
		await panel.locator( '.maestro-rename-input' ).fill( 'Articles' );

		const save = page.waitForResponse( ( r ) => POST_SAVE( r.url() ) && r.request().method() === 'POST' );
		await page.locator( '.maestro-preview-toggle' ).click();
		await page.getByRole( 'combobox', { name: 'Preview as' } ).selectOption( 'editor' );
		await page.locator( '.maestro-preview-btn' ).click();
		expect( ( await save ).ok() ).toBe( true );
		await page.waitForURL( /maestro_preview=editor/ );
		await expect( page.locator( '#menu-posts .wp-menu-name' ) ).toHaveText( 'Articles' );
	} );

	test( 'a failed save keeps the editor open instead of previewing', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await page.route( '**/maestro/v1/config**', ( route ) => {
			if ( route.request().method() === 'POST' ) {
				return route.fulfill( { status: 500, body: '{}' } );
			}
			return route.continue();
		} );
		await page.locator( '#menu-posts > a.menu-top' ).click();
		await page.locator( '.maestro-toolbar .maestro-panel .maestro-rename-input' ).fill( 'Broken' );
		await page.locator( '.maestro-preview-toggle' ).click();
		await page.getByRole( 'combobox', { name: 'Preview as' } ).selectOption( 'editor' );
		await page.locator( '.maestro-preview-btn' ).click();
		await expect( page.locator( '.maestro-status-error' ) ).toBeVisible();
		await expect( page.locator( '.maestro-preview-btn' ) ).toBeEnabled();
		expect( page.url() ).not.toContain( 'maestro_preview' );
	} );
} );

test.describe( 'role preview parity with real users', () => {
	test.describe.configure( { mode: 'serial' } );

	test.beforeAll( () => {
		for ( const [ role, login ] of Object.entries( ROLE_USERS ) ) {
			wp( [ 'user', 'create', login, `${ login }@example.com`, `--role=${ role }`, '--user_pass=password' ] );
			wp( [ 'user', 'update', login, '--user_pass=password' ] );
		}
	} );

	test.afterAll( () => {
		for ( const login of Object.values( ROLE_USERS ) ) {
			wp( [ 'user', 'delete', login, '--yes' ] );
		}
	} );

	test( 'Editor', async ( { page, browser } ) => {
		const context = await browser.newContext( { storageState: EDITOR_STATE } );
		const real = await context.newPage();
		try {
			await real.goto( '/wp-admin/index.php' );
			const expected = await menuLinks( real );
			expect( expected ).toContain( 'index.php' );
			expect( expected ).toContain( 'profile.php' );
			await previewFromEditor( page, 'editor' );
			expect( await menuLinks( page ) ).toEqual( expected );
			await compareWithRule( page, real, 'editor' );
		} finally {
			await context.close();
		}
	} );

	for ( const [ role, login ] of Object.entries( ROLE_USERS ) ) {
		test( role, async ( { page, browser } ) => {
			const { context, page: real } = await signInAs( browser, login );
			try {
				await real.goto( '/wp-admin/index.php' );
				const expected = await menuLinks( real );
			expect( expected ).toContain( 'index.php' );
			expect( expected ).toContain( 'profile.php' );
				await previewFromEditor( page, role );
				expect( await menuLinks( page ) ).toEqual( expected );
				await compareWithRule( page, real, role );
			} finally {
				await context.close();
			}
		} );
	}
} );

/**
 * The picker on a phone. The toolbar keeps #252's row budget, so the picker is
 * one toolbar button there; it opens the labelled select and the Preview button
 * in the phone sheet. Every one of them is a 44px target, stays on screen, and
 * the page never scrolls sideways.
 */
for ( const viewport of [ { width: 320, height: 640 }, { width: 375, height: 667 }, { width: 667, height: 375 } ] ) {
	test.describe( `role preview picker at ${ viewport.width }x${ viewport.height }`, () => {
		test.use( { viewport } );

		test( 'the toggle, select and button are 44px targets and nothing overflows', async ( { page } ) => {
			await page.goto( '/wp-admin/index.php?maestro_edit=1' );
			await page.locator( '#menu-posts > a.menu-top' ).click();
			await expect( page.locator( '.maestro-panel' ) ).toBeVisible();
			const toggle = page.getByRole( 'button', { name: 'Preview as' } );
			await expect( toggle ).toBeVisible();
			await toggle.click();
			const sheet = page.getByRole( 'dialog', { name: 'Preview as' } );
			await expect( sheet ).toBeVisible();
			await expect( sheet.getByRole( 'combobox', { name: 'Preview as' } ) ).toBeFocused();

			const m = await page.evaluate( () => {
				const box = ( sel: string ) => {
					const r = document.querySelector( sel )!.getBoundingClientRect();
					return { left: r.left, right: r.right, width: r.width, height: r.height };
				};
				return {
					toggle: box( '.maestro-preview-toggle' ),
					select: box( '.maestro-preview-popover .maestro-preview-select' ),
					button: box( '.maestro-preview-popover .maestro-preview-btn' ),
					clientWidth: document.documentElement.clientWidth,
					scrollWidth: document.documentElement.scrollWidth,
				};
			} );
			for ( const target of [ m.toggle, m.select, m.button ] ) {
				expect( target.height ).toBeGreaterThanOrEqual( 44 );
				expect( target.width ).toBeGreaterThanOrEqual( 44 );
				expect( target.left ).toBeGreaterThanOrEqual( 0 );
				expect( target.right ).toBeLessThanOrEqual( m.clientWidth );
			}
			expect( m.scrollWidth ).toBeLessThanOrEqual( m.clientWidth );

			// It works from the sheet too.
			await sheet.getByRole( 'combobox', { name: 'Preview as' } ).selectOption( 'author' );
			await Promise.all( [
				page.waitForURL( /maestro_preview=author/ ),
				sheet.getByRole( 'button', { name: 'Preview', exact: true } ).click(),
			] );
			await expect( page.locator( '.maestro-preview-banner' ) ).toContainText( 'Author' );
		} );
	} );
}
