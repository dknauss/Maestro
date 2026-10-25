import { test, expect } from './fixtures';

for ( const viewport of [ { width: 375, height: 812 }, { width: 844, height: 390 }, { width: 1280, height: 900 } ] ) {
	test.describe( `dialog standard ${ viewport.width }`, () => {
		test.use( { viewport, hasTouch: true } );
		for ( const kind of ( viewport.width >= 961 ? [ 'icon', 'vis', 'profiles', 'preview', 'settings', 'tour' ] : [ 'icon', 'vis', 'profiles', 'preview' ] ) ) {
			test( `${ kind } shares button geometry and switches focus indicators with input`, async ( { page } ) => {
				await page.goto( '/wp-admin/index.php?maestro_edit=1' );
				await page.locator( '#menu-posts > a.menu-top' ).tap();
				const trigger = kind === 'preview' ? '.maestro-preview-toggle' : kind === 'tour' ? '.maestro-tour-help' : `.maestro-${ kind }-btn`;
				await page.locator( trigger ).tap();
				const dialog = page.locator( '.maestro-popover, .maestro-tour' );
				await expect( dialog ).toBeVisible();
				const buttons = dialog.locator( 'button:visible, input[type="text"]:visible, input[type="search"]:visible, input[type="number"]:visible, select:visible' );
				for ( const button of await buttons.all() ) {
					await expect( button ).toHaveCSS( 'border-top-left-radius', '3px' );
				}
				// The focused close control/container stays focused without a pointer ring.
				expect( await dialog.evaluate( d => d.contains( document.activeElement ) || d === document.activeElement ) ).toBe( true );
				await expect( page.locator( ':focus' ) ).toHaveCSS( 'outline-style', 'none' );
				await page.keyboard.press( 'Tab' );
				const focused = page.locator( ':focus' );
				expect( await dialog.evaluate( d => d.contains( document.activeElement ) ) ).toBe( true );
				await expect( focused ).toHaveCSS( 'outline-style', 'solid' );
				await expect( focused ).toHaveCSS( 'outline-width', '2px' );
				await expect( focused ).toHaveCSS( 'box-shadow', 'none' );
			} );
		}
	} );
}

for ( const viewport of [ { width: 375, height: 812 }, { width: 844, height: 390 }, { width: 1280, height: 900 } ] ) {
	test.describe( `tool switching ${ viewport.width }`, () => {
		test.use( { viewport, hasTouch: true } );
		test( 'switching tools replaces the dialog and preserves icon colours', async ( { page } ) => {
			await page.goto( '/wp-admin/index.php?maestro_edit=1' );
			await page.locator( '#menu-posts > a.menu-top' ).tap();
			await expect( page.locator( '.maestro-preview-toggle .dashicons' ) ).toHaveClass( /dashicons-welcome-view-site/ );
			await expect( page.locator( '.maestro-vis-btn .dashicons' ) ).toHaveClass( /dashicons-visibility/ );
			const tools = [ '.maestro-preview-toggle', '.maestro-profiles-btn', '.maestro-icon-btn', '.maestro-vis-btn', ...( viewport.width >= 961 ? [ '.maestro-tour-help' ] : [] ), '.maestro-preview-toggle' ];
			const classes = [ 'maestro-preview-popover', 'maestro-profiles-popover', 'maestro-icon-popover', 'maestro-vis-popover', ...( viewport.width >= 961 ? [ 'maestro-tour' ] : [] ), 'maestro-preview-popover' ];
			for ( let i = 0; i < tools.length; i++ ) {
				const trigger = page.locator( tools[i] );
				const colour = await trigger.locator( '.dashicons' ).evaluate( el => getComputedStyle( el ).color );
				await trigger.tap();
				await expect( page.locator( '.maestro-popover, .maestro-tour' ) ).toHaveCount( 1 );
				await expect( page.locator( '.' + classes[i] ) ).toBeVisible();
				await expect( trigger ).toHaveAttribute( 'aria-expanded', 'true' );
				await expect( page.locator( '.maestro-toolbar [aria-expanded="true"]' ) ).toHaveCount( 1 );
				await expect( trigger.locator( '.dashicons' ) ).toHaveCSS( 'color', colour );
				await expect( trigger ).not.toHaveCSS( 'background-color', 'rgba(0, 0, 0, 0)' );
			}
			await page.getByRole( 'button', { name: 'Close dialog', exact: true } ).tap();
			await expect( page.locator( '.maestro-toolbar [aria-expanded="true"]' ) ).toHaveCount( 0 );
		} );
	} );
}

for ( const viewport of [ { width: 320, height: 568 }, { width: 375, height: 812 }, { width: 667, height: 375 }, { width: 844, height: 390 } ] ) {
	test.describe( `bounded toolbar ${ viewport.width }`, () => {
		test.use( { viewport, hasTouch: true } );
		test( 'keeps editing space and touch targets while every remaining tool stays reachable', async ( { page } ) => {
			await page.goto( '/wp-admin/index.php?maestro_edit=1' );
			await page.locator( '#menu-posts > a.menu-top' ).tap();
			const toolbar = page.locator( '.maestro-toolbar' );
			expect( ( await toolbar.boundingBox() )!.height ).toBeLessThanOrEqual( viewport.width > viewport.height ? 70 : 120 );
			await expect( toolbar.locator( '.maestro-tour-help' ) ).toBeHidden();
			for ( const selector of [ '.maestro-icon-btn', '.maestro-vis-btn', '.maestro-profiles-btn', '.maestro-preview-toggle' ] ) {
				const button = toolbar.locator( selector );
				await button.scrollIntoViewIfNeeded();
				const box = ( await button.boundingBox() )!;
				expect( box.width ).toBeGreaterThanOrEqual( 44 );
				expect( box.height ).toBeGreaterThanOrEqual( 44 );
				await button.tap();
				const dialog = page.locator( '.maestro-mobile-sheet' );
				await expect( dialog ).toBeVisible();
				const sheet = ( await dialog.boundingBox() )!;
				expect( sheet.y + sheet.height ).toBeLessThanOrEqual( ( await toolbar.boundingBox() )!.y );
				await dialog.getByRole( 'button', { name: 'Close dialog', exact: true } ).tap();
			}
		} );
	} );
}

test.describe( 'group deletion copy', () => {
	test.use( { viewport: { width: 375, height: 812 }, hasTouch: true } );
	test( 'empty groups have a concise count-only confirmation', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await page.locator( '.maestro-profiles-btn' ).tap();
		await expect( page.locator( '.maestro-profiles-intro' ) ).toContainText( 'Visibility settings' );
		await page.getByRole( 'textbox', { name: 'New group name' } ).fill( 'Empty group' );
		await page.getByRole( 'button', { name: 'Add group', exact: true } ).tap();
		let message = '';
		page.once( 'dialog', async dialog => { message = dialog.message(); await dialog.dismiss(); } );
		await page.getByRole( 'button', { name: 'Delete Empty group', exact: true } ).tap();
		expect( message ).toBe( 'Delete “Empty group”? It hides 0 items from 0 people.' );
	} );
} );
