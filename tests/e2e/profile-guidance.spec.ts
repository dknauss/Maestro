import { test, expect } from '@playwright/test';

// No option reset: create/delete our own profile through the actual UI, so this
// can also run on a disposable Studio site without the wp-env fixture harness.
test( 'saved profiles keep accessible next-step guidance after reload', async ( { page } ) => {
	await page.addInitScript( () => localStorage.setItem( 'maestroFirstRunDone', '1' ) );
	await page.setViewportSize( { width: 900, height: 600 } );
	await page.goto( '/wp-admin/index.php?maestro_edit=1' );
	await page.locator( '.maestro-profiles-btn' ).click();
	const dialog = page.getByRole( 'dialog', { name: 'Hiding profiles' } );
	const profileName = `Guidance regression ${ Date.now() }`;
	await dialog.locator( '.maestro-profile-new' ).fill( profileName );
	const save = page.waitForResponse( r => r.url().includes( '/maestro/v1/config' ) && r.request().method() === 'POST' && r.ok() );
	await dialog.locator( '.maestro-profile-add-btn' ).click();
	await save;
	const profileId = await dialog.locator( '.maestro-profile' ).last().getAttribute( 'data-profile-id' );
	await page.reload();
	await page.locator( '.maestro-profiles-btn' ).click();
	const row = dialog.locator( `.maestro-profile[data-profile-id="${ profileId }"]` );
	const hint = row.locator( '.maestro-profile-guidance' );
	await expect( row.locator( '.maestro-profile-name' ) ).toHaveValue( profileName );
	await expect( hint ).toBeVisible();
	await expect( dialog.locator( '.maestro-profiles-intro' ) ).toContainText( 'does not change page access' );
	await expect( hint ).toContainText( 'Visibility' );
	await expect( hint ).toContainText( 'save automatically' );
	await expect( row.locator( '.maestro-profile-name' ) ).toHaveAttribute( 'aria-describedby', await hint.getAttribute( 'id' ) || '' );
	const name = row.locator( '.maestro-profile-name' );
	const guidanceId = await hint.getAttribute( 'id' );
	await name.fill( '' );
	await expect( name ).toHaveAttribute( 'aria-invalid', 'true' );
	await expect( name ).toHaveAttribute( 'aria-describedby', `${ guidanceId } maestro-profiles-msg` );
	await name.press( 'Tab' );
	await expect( name ).toHaveValue( profileName );
	await expect( name ).toHaveAttribute( 'aria-describedby', guidanceId || '' );
	await expect( hint ).toHaveAttribute( 'dir', 'auto' );
	page.once( 'dialog', d => d.accept() );
	const removed = page.waitForResponse( r => r.url().includes( '/maestro/v1/config' ) && r.request().method() === 'POST' && r.ok() );
	await row.locator( '.maestro-profile-delete' ).click();
	await removed;
	await expect( row ).toHaveCount( 0 );
} );

test( 'tour skips a missing Profiles anchor in both directions', async ( { page } ) => {
	await page.addInitScript( () => localStorage.setItem( 'maestroFirstRunDone', '1' ) );
	await page.goto( '/wp-admin/index.php?maestro_edit=1' );
	// Models an unavailable toolbar control without changing server permissions.
	await page.locator( '.maestro-profiles-btn' ).evaluate( el => el.remove() );
	await page.locator( '.maestro-tour-help' ).click();
	const text = page.locator( '.maestro-tour-text' );
	for ( let i = 0; i < 8; i++ ) { await page.locator( '.maestro-tour-next' ).click(); }
	await expect( text ).toContainText( 'Menu settings' );
	await page.locator( '.maestro-tour-back' ).click();
	await expect( text ).toContainText( 'edge' );
	await page.locator( '.maestro-tour-next' ).click();
	await expect( text ).toContainText( 'Menu settings' );
	await page.keyboard.press( 'Escape' );
	await expect( page.locator( '.maestro-tour' ) ).toHaveCount( 0 );
} );
