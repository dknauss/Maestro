import { test, expect } from './fixtures';

for ( const rtl of [ false, true ] ) {
	test( `close icons are centered and clear dialog content (${ rtl ? 'RTL' : 'LTR' })`, async ( { page } ) => {
		await page.setViewportSize( { width: 1280, height: 900 } );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		if ( rtl ) {
			await page.evaluate( () => { document.documentElement.dir = 'rtl'; document.body.classList.add( 'rtl' ); } );
		}
		for ( const trigger of [ '.maestro-tour-help', '.maestro-settings-btn', '.maestro-profiles-btn', '.maestro-preview-toggle' ] ) {
			await page.locator( trigger ).click();
			const dialog = page.locator( '.maestro-tour, .maestro-popover' );
			const close = dialog.getByRole( 'button', { name: /Close (tour|dialog)/ } );
			const geometry = await close.evaluate( button => {
				const box = button.getBoundingClientRect();
				const icon = button.querySelector( '.dashicons' )!.getBoundingClientRect();
				const dialog = button.closest( '.maestro-tour, .maestro-popover' )!;
				const card = dialog.getBoundingClientRect();
				const content = dialog.querySelector( '.maestro-profiles-intro, .maestro-width-row, .maestro-preview-dialog-row, .maestro-tour-text' )!.getBoundingClientRect();
				return {
					x: Math.abs( box.x + box.width / 2 - icon.x - icon.width / 2 ),
					y: Math.abs( box.y + box.height / 2 - icon.y - icon.height / 2 ),
					width: box.width, height: box.height,
					top: box.top - card.top,
					end: getComputedStyle( dialog ).direction === 'rtl' ? box.left - card.left : card.right - box.right,
					overlap: box.left < content.right && box.right > content.left && box.top < content.bottom && box.bottom > content.top,
					// The title's own text, not its box: an untranslated title is
					// LTR in an RTL admin and must still clear Close.
					titleOverlap: ( () => {
						const title = dialog.querySelector( '.maestro-settings-title' );
						if ( ! title ) { return false; }
						const range = document.createRange();
						range.selectNodeContents( title );
						const text = range.getBoundingClientRect();
						return box.left < text.right && box.right > text.left && box.top < text.bottom && box.bottom > text.top;
					} )(),
				};
			} );
			expect( geometry.x ).toBeLessThan( 1 );
			expect( geometry.y ).toBeLessThan( 1 );
			expect( geometry.width ).toBe( 44 );
			expect( geometry.height ).toBe( 44 );
			expect( geometry.top ).toBeGreaterThanOrEqual( 4 );
			expect( geometry.end ).toBeGreaterThanOrEqual( 4 );
			expect( geometry.end ).toBeLessThan( 7 );
			expect( geometry.overlap ).toBe( false );
			expect( geometry.titleOverlap ).toBe( false );
			await close.click();
			await expect( dialog ).toHaveCount( 0 );
			await expect( page.locator( trigger ) ).toBeFocused();
		}
	} );
}

test( 'Preview has one visible descriptor and requires explicit navigation', async ( { page } ) => {
	await page.goto( '/wp-admin/index.php?maestro_edit=1' );
	await page.locator( '.maestro-preview-toggle' ).click();
	const dialog = page.getByRole( 'dialog', { name: 'Preview as' } );
	await expect( dialog.getByRole( 'heading' ) ).toHaveText( 'Preview as' );
	const label = dialog.locator( 'label' );
	const bounds = await label.boundingBox();
	expect( bounds!.width ).toBeLessThanOrEqual( 1 );
	await expect( dialog.getByRole( 'button', { name: 'Done', exact: true } ) ).toHaveCount( 0 );
	await dialog.getByRole( 'combobox', { name: 'Preview as' } ).selectOption( 'editor' );
	await expect( page ).not.toHaveURL( /maestro_preview=/ );
	await dialog.getByRole( 'button', { name: 'Preview', exact: true } ).click();
	await expect( page ).toHaveURL( /maestro_preview=editor/ );
} );

test( 'desktop Preview remains dismissible after resizing to a phone', async ( { page } ) => {
	await page.goto( '/wp-admin/index.php?maestro_edit=1' );
	const trigger = page.locator( '.maestro-preview-toggle' );
	await trigger.click();
	await page.setViewportSize( { width: 375, height: 812 } );
	const sheet = page.locator( '.maestro-preview-popover.maestro-mobile-sheet' );
	await expect( sheet ).toBeVisible();
	await expect( sheet.getByRole( 'combobox', { name: 'Preview as' } ) ).toBeVisible();
	await sheet.getByRole( 'button', { name: 'Close dialog', exact: true } ).click();
	await expect( sheet ).toHaveCount( 0 );
	await expect( trigger ).toBeFocused();
} );
