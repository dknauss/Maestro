import { test, expect } from './fixtures';

test.use( { hasTouch: true, viewport: { width: 375, height: 812 } } );

test( 'touch selects parents and children without focusing a text input; renaming is explicit', async ( { page } ) => {
	await page.goto( '/wp-admin/index.php?maestro_edit=1' );
	const posts = page.locator( '#menu-posts > a.menu-top' );
	await posts.tap();
	await expect( posts ).toBeFocused();
	const rename = page.locator( '.maestro-rename-input' );
	await expect( rename ).not.toBeFocused();
	await rename.tap();
	await expect( rename ).toBeFocused();
	await rename.fill( 'Articles mobile' );
	const child = page.locator( '#menu-posts .wp-submenu a' ).first();
	await child.tap();
	await expect( child ).toBeFocused();
	await expect( rename ).not.toBeFocused();
	// Keyboard users retain direct access to the rename control.
	await child.press( 'Enter' );
	await expect( rename ).toBeFocused();
} );

for ( const kind of [ 'preview', 'profiles', 'vis', 'icon' ] ) {
	test( `mobile ${ kind } dialog has an accessible fixed close header and no Done footer`, async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await page.locator( '#menu-posts > a.menu-top' ).tap();
		const trigger = page.locator( kind === 'preview' ? '.maestro-preview-toggle' : `.maestro-${ kind }-btn` );
		await trigger.tap();
		const dialog = page.locator( '.maestro-mobile-sheet' );
		const close = dialog.getByRole( 'button', { name: 'Close dialog', exact: true } );
		await expect( close ).toBeFocused();
		await expect( dialog.getByRole( 'button', { name: 'Done', exact: true } ) ).toHaveCount( 0 );
		if ( kind === 'preview' || kind === 'profiles' ) {
			expect( ( await dialog.boundingBox() )!.height ).toBeLessThan( kind === 'preview' ? 220 : 420 );
		}
		const before = ( await close.boundingBox() )!.y;
		await dialog.locator( '.maestro-mobile-body' ).evaluate( node => { node.scrollTop = node.scrollHeight; } );
		expect( ( await close.boundingBox() )!.y ).toBe( before );
		await close.tap();
		await expect( dialog ).toHaveCount( 0 );
		await expect( trigger ).toBeFocused();
	} );
}
