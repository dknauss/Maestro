import { test, expect } from './fixtures';
import { execFileSync } from 'child_process';

const file = ( items: object = { 'edit.php': { title: 'Imported articles' } } ) => JSON.stringify( {
	format: 'maestro-menu-config', schema_version: 1,
	config: { schema_version: 2, items, top_order: [ 'edit.php', 'index.php' ], sub_order: {}, menu_width: 240 },
} );

async function openSettings( page ) {
	await page.goto( '/wp-admin/index.php?maestro_edit=1' );
	await page.locator( '.maestro-settings-btn' ).click();
	await expect( page.getByRole( 'dialog', { name: 'Settings', exact: true } ) ).toBeVisible();
}

test( 'export downloads a versioned portable file after autosave', async ( { page } ) => {
	await openSettings( page );
	const download = page.waitForEvent( 'download' );
	await page.getByRole( 'button', { name: 'Export configuration', exact: true } ).click();
	const d = await download;
	const stream = await d.createReadStream();
	const chunks: Buffer[] = [];
	for await ( const chunk of stream! ) { chunks.push( Buffer.from( chunk ) ); }
	const json = JSON.parse( Buffer.concat( chunks ).toString() );
	expect( json.format ).toBe( 'maestro-menu-config' );
	expect( json.schema_version ).toBe( 1 );
	expect( json.config.schema_version ).toBe( 2 );
	expect( json.config.profiles ).toBeUndefined();
} );

test( 'review reports absent menus and applies only after explicit import, then persists', async ( { page } ) => {
	await openSettings( page );
	await page.locator( '.maestro-transfer-file' ).setInputFiles( { name: 'menu.json', mimeType: 'application/json', buffer: Buffer.from( file( { 'edit.php': { title: 'Imported articles' }, 'missing-source.php': { title: 'Missing' } } ) ) } );
	await expect( page.getByRole( 'button', { name: 'Import configuration', exact: true } ) ).toBeHidden();
	await page.getByRole( 'button', { name: 'Review file', exact: true } ).click();
	await expect( page.locator( '.maestro-transfer-result' ) ).toContainText( 'missing-source.php' );
	await expect( page.locator( '#menu-posts .wp-menu-name' ) ).toHaveText( 'Posts' );
	await page.getByRole( 'button', { name: 'Import configuration', exact: true } ).click();
	await expect( page.locator( '#menu-posts .wp-menu-name' ) ).toContainText( 'Imported articles' );
	await expect( page.locator( '.maestro-transfer-notice' ) ).toContainText( 'Configuration imported' );
	await page.reload();
	await expect( page.locator( '#menu-posts .wp-menu-name' ) ).toContainText( 'Imported articles' );
} );

test( 'malformed files cannot reset configuration', async ( { page } ) => {
	await openSettings( page );
	await page.locator( '.maestro-transfer-file' ).setInputFiles( { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from( '{}' ) } );
	await page.getByRole( 'button', { name: 'Review file', exact: true } ).click();
	await expect( page.locator( '.maestro-transfer-result' ) ).toContainText( 'unsupported schema' );
	await expect( page.getByRole( 'button', { name: 'Import configuration', exact: true } ) ).toBeHidden();
} );

test( 'failed autosave blocks export and review', async ( { page } ) => {
	await page.goto( '/wp-admin/index.php?maestro_edit=1' );
	await page.route( '**/maestro/v1/config', route => route.fulfill( { status: 500, body: '{}' } ) );
	await page.locator( '#menu-posts > a.menu-top' ).click();
	await page.locator( '.maestro-rename-input' ).fill( 'Unsaved articles' );
	await page.locator( '.maestro-rename-input' ).press( 'Enter' );
	await page.locator( '.maestro-settings-btn' ).click();
	await page.route( '**/maestro/v1/config', route => route.fulfill( { status: 500, body: '{}' } ) );
	await page.getByRole( 'button', { name: 'Export configuration', exact: true } ).click();
	await expect( page.locator( '.maestro-transfer-result' ) ).toContainText( 'Save failed' );
} );

test.describe( 'phone transfer', () => {
	test.use( { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true } );
	// Export/import is a desk task; the phone toolbar keeps #252's row budget.
	test( 'Settings, and with it transfer, stays off the phone toolbar', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
		await expect( page.locator( '.maestro-settings-btn' ) ).toBeHidden();
		await expect( page.locator( '.maestro-transfer' ) ).toHaveCount( 0 );
	} );
} );

test( 'cookie-auth transfer routes require a real REST nonce', async ( { page } ) => {
	await page.goto( '/wp-admin/index.php?maestro_edit=1' );
	const statuses = await page.evaluate( async () => {
		const d = ( window as any ).maestroData;
		const missing = await fetch( d.restUrl + '/export', { credentials: 'same-origin' } );
		const invalid = await fetch( d.restUrl + '/import', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': 'invalid' }, body: '{}' } );
		return [ missing.status, invalid.status ];
	} );
	expect( statuses ).toEqual( [ 401, 403 ] );
} );

test( 'a concurrent editor change survives an attempted stale import', async ( { page } ) => {
	await openSettings( page );
	await page.locator( '.maestro-transfer-file' ).setInputFiles( { name: 'menu.json', mimeType: 'application/json', buffer: Buffer.from( file() ) } );
	await page.getByRole( 'button', { name: 'Review file', exact: true } ).click();
	await expect( page.getByRole( 'button', { name: 'Import configuration', exact: true } ) ).toBeVisible();
	await page.evaluate( async () => {
		const d = ( window as any ).maestroData;
		const r = await fetch( d.restUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': d.nonce }, body: JSON.stringify( { config: { items: { 'edit.php': { title: 'Concurrent edit' } }, menu_width: 300 } } ) } );
		if ( ! r.ok ) { throw new Error( 'Fixture save failed' ); }
	} );
	await page.getByRole( 'button', { name: 'Import configuration', exact: true } ).click();
	await expect( page.locator( '.maestro-transfer-result' ) ).toContainText( 'changed' );
	await page.reload();
	await expect( page.locator( '#menu-posts .wp-menu-name' ) ).toContainText( 'Concurrent edit' );
} );

test( 'a file exported from a different real site adapts to the destination', async ( { page, browser } ) => {
	test.setTimeout( 90000 );
	const wp = ( args: string[] ) => execFileSync( 'npx', [ 'wp-env', 'run', 'cli', 'wp', ...args ], { stdio: 'pipe' } );
	wp( [ 'plugin', 'activate', 'maestro-menu-editor' ] );
	wp( [ 'user', 'update', 'admin', '--user_pass=password' ] );
	wp( [ 'eval-file', '/var/www/html/wp-content/plugins/maestro-menu-editor/tests/e2e/fixtures/transfer-source.php' ] );
	const source = await browser.newContext();
	try {
		const src = await source.newPage();
		const base = `http://localhost:${ process.env.WP_ENV_PORT || '8888' }`;
		await src.goto( base + '/wp-login.php' );
		await src.locator( '#user_login' ).fill( 'admin' );
		await src.locator( '#user_pass' ).fill( 'password' );
		await Promise.all( [ src.waitForURL( /wp-admin/ ), src.locator( '#wp-submit' ).click() ] );
		await src.goto( base + '/wp-admin/index.php?maestro_edit=1' );
		await expect( src.locator( '#adminmenu' ) ).toContainText( 'Source settings' );
		const exported = await src.evaluate( async () => {
			const d = ( window as any ).maestroData;
			const r = await fetch( d.restUrl + '/export', { headers: { 'X-WP-Nonce': d.nonce } } );
			if ( ! r.ok ) { throw new Error( 'Source export failed' ); }
			return r.text();
		} );
		await openSettings( page );
		await page.locator( '.maestro-transfer-file' ).setInputFiles( { name: 'client.json', mimeType: 'application/json', buffer: Buffer.from( exported ) } );
		await page.getByRole( 'button', { name: 'Review file', exact: true } ).click();
		await expect( page.locator( '.maestro-transfer-result' ) ).toContainText( 'source-only-tools' );
		await expect( page.locator( '.maestro-transfer-result' ) ).toContainText( 'source_client' );
		await page.getByRole( 'button', { name: 'Import configuration', exact: true } ).click();
		await expect( page.locator( '#menu-posts .wp-menu-name' ) ).toContainText( 'Client articles' );
		const stored = await page.evaluate( async () => {
			const d = ( window as any ).maestroData;
			return ( await ( await fetch( d.restUrl, { headers: { 'X-WP-Nonce': d.nonce } } ) ).json() ).config;
		} );
		expect( stored.menu_width ).toBe( 256 );
		expect( stored.items[ 'edit.php' ].hidden_roles ).toEqual( [ 'editor' ] );
		expect( stored.items[ 'source-only-tools' ] ).toBeUndefined();
		expect( stored.top_order ).not.toContain( 'source-only-tools' );
	} finally {
		await source.close();
		execFileSync( 'npx', [ 'wp-env', 'run', 'cli', 'env', 'MAESTRO_TRANSFER_CLEANUP=1', 'wp', 'eval-file', '/var/www/html/wp-content/plugins/maestro-menu-editor/tests/e2e/fixtures/transfer-source.php' ], { stdio: 'pipe' } );
	}
} );

test( 'a canceled reload leaves a safe recovery link instead of resuming stale autosave', async ( { page } ) => {
	await openSettings( page );
	await page.locator( '.maestro-transfer-file' ).setInputFiles( { name: 'menu.json', mimeType: 'application/json', buffer: Buffer.from( file() ) } );
	await page.getByRole( 'button', { name: 'Review file', exact: true } ).click();
	await expect( page.getByRole( 'button', { name: 'Import configuration', exact: true } ) ).toBeVisible();
	const staleSaves: string[] = [];
	page.on( 'request', request => {
		if ( request.method() === 'POST' && new URL( request.url() ).pathname.endsWith( '/maestro/v1/config' ) ) { staleSaves.push( request.url() ); }
	} );
	await page.evaluate( () => window.addEventListener( 'beforeunload', e => { e.preventDefault(); e.returnValue = ''; } ) );
	page.once( 'dialog', d => d.dismiss() );
	await page.getByRole( 'button', { name: 'Import configuration', exact: true } ).click();
	await expect( page.getByRole( 'link', { name: 'Reload editor', exact: true } ) ).toBeVisible();
	expect( await page.locator( '#adminmenu' ).evaluate( node => ( node as HTMLElement ).inert ) ).toBe( true );
	const reload = page.getByRole( 'link', { name: 'Reload editor', exact: true } );
	await expect( reload ).toBeFocused();
	await page.keyboard.press( 'Escape' );
	await page.locator( '#wpbody-content' ).click( { position: { x: 500, y: 20 } } );
	await expect( reload ).toBeVisible();
	await reload.focus();
	await page.keyboard.press( 'Tab' );
	await expect( reload ).toBeFocused();
	page.once( 'dialog', d => d.accept() );
	await reload.click();
	await expect( page.locator( '#menu-posts .wp-menu-name' ) ).toContainText( 'Imported articles' );
	await expect( page.locator( '.maestro-transfer-notice' ) ).toBeVisible();
	expect( staleSaves ).toEqual( [] );
} );

test( 'large drop reports can be downloaded in full', async ( { page } ) => {
	await openSettings( page );
	const missing = Object.fromEntries( Array.from( { length: 60 }, ( _, n ) => [ `source-only-${ n }`, { title: 'Missing' } ] ) );
	await page.locator( '.maestro-transfer-file' ).setInputFiles( { name: 'many.json', mimeType: 'application/json', buffer: Buffer.from( file( missing ) ) } );
	await page.getByRole( 'button', { name: 'Review file', exact: true } ).click();
	const pending = page.waitForEvent( 'download' );
	await page.getByRole( 'button', { name: 'Download full report', exact: true } ).click();
	const download = await pending;
	expect( download.suggestedFilename() ).toBe( 'maestro-import-report.json' );
	const stream = await download.createReadStream();
	const chunks: Buffer[] = [];
	for await ( const chunk of stream! ) { chunks.push( Buffer.from( chunk ) ); }
	const report = JSON.parse( Buffer.concat( chunks ).toString() );
	expect( report ).toHaveLength( 60 );
	expect( report.map( row => row.reference ) ).toEqual( Object.keys( missing ) );
	expect( report.every( row => typeof row.code === 'string' ) ).toBe( true );
	await expect( page.locator( '.maestro-transfer-result li' ) ).toHaveCount( 50 );
} );
