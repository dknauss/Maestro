import { test, expect } from '@playwright/test';

// Check the rendered white dash, not our choice of CSS positioning mechanism.
// These cases do not write config; select-all semantics have separate coverage.
for ( const width of [ 375, 782, 783, 1280 ] ) {
	for ( const rtl of [ false, true ] ) {
		test( `mixed checkbox dash is centered at ${ width }px (${ rtl ? 'RTL' : 'LTR' })`, async ( { page } ) => {
			await page.setViewportSize( { width, height: 900 } );
			await page.addInitScript( () => localStorage.setItem( 'maestroFirstRunDone', '1' ) );
			await page.goto( '/wp-admin/index.php?maestro_edit=1' );
			if ( rtl ) {
				await page.addStyleTag( { url: '/wp-admin/css/forms-rtl.css' } );
				await page.evaluate( () => {
					document.documentElement.dir = 'rtl';
					document.body.classList.add( 'rtl' );
				} );
			}
			await page.locator( '#menu-posts > a.menu-top' ).click();
			await page.locator( '.maestro-vis-btn' ).click();
			const checkbox = page.locator( '.maestro-vis-own .maestro-vis-all-cb' );
			await checkbox.evaluate( ( node: HTMLInputElement ) => {
				node.checked = false;
				node.indeterminate = true;
			} );
			await expect( checkbox ).toBeChecked( { indeterminate: true } );
			await checkbox.scrollIntoViewIfNeeded();
			await checkbox.evaluate( node => ( node as HTMLElement ).blur() );
			const box = ( await checkbox.boundingBox() )!;
			const background = await checkbox.evaluate( node => getComputedStyle( node ).backgroundColor.match( /\d+/g )!.map( Number ) );
			// Locate the painted background too: Chromium's RTL input paint
			// can be offset from its DOM rectangle by the inline margin.
			const png = await page.screenshot( { scale: 'css', animations: 'disabled' } );
			const mark = await page.evaluate( async ( data ) => {
				const image = new Image();
				image.src = 'data:image/png;base64,' + data.png;
				await image.decode();
				const canvas = document.createElement( 'canvas' );
				canvas.width = image.width;
				canvas.height = image.height;
				const ctx = canvas.getContext( '2d' )!;
				ctx.drawImage( image, 0, 0 );
				const pixels = ctx.getImageData( 0, 0, image.width, image.height ).data;
				let left = image.width, right = -1, top = image.height, bottom = -1;
				for ( let y = Math.max( 0, Math.floor( data.box.y ) - 8 ); y < Math.min( image.height, data.box.y + data.box.height + 8 ); y++ ) {
					for ( let x = Math.max( 0, Math.floor( data.box.x ) - 8 ); x < Math.min( image.width, data.box.x + data.box.width + 8 ); x++ ) {
						const i = ( y * image.width + x ) * 4;
						if ( data.background.every( ( color, channel ) => Math.abs( pixels[ i + channel ] - color ) < 8 ) ) {
							left = Math.min( left, x ); right = Math.max( right, x );
							top = Math.min( top, y ); bottom = Math.max( bottom, y );
						}
					}
				}
				let count = 0, xTotal = 0, yTotal = 0;
				// Exclude the rounded border/corners and collect the white mark.
				for ( let y = top + 2; y <= bottom - 2; y++ ) {
					for ( let x = left + 2; x <= right - 2; x++ ) {
						const i = ( y * image.width + x ) * 4;
						if ( pixels[ i ] > 240 && pixels[ i + 1 ] > 240 && pixels[ i + 2 ] > 240 && pixels[ i + 3 ] > 240 ) {
							count++;
							xTotal += x + 0.5;
							yTotal += y + 0.5;
						}
					}
				}
				return { count, paintedWidth: right - left + 1, paintedHeight: bottom - top + 1, dx: Math.abs( xTotal / count - ( left + right + 1 ) / 2 ), dy: Math.abs( yTotal / count - ( top + bottom + 1 ) / 2 ) };
			}, { png: png.toString( 'base64' ), box, background } );
			expect( Math.abs( mark.paintedWidth - box.width ) ).toBeLessThanOrEqual( 1 );
			expect( Math.abs( mark.paintedHeight - box.height ) ).toBeLessThanOrEqual( 1 );
			expect( mark.count, 'visible mixed-state dash' ).toBeGreaterThan( 4 );
			expect( mark.dx, 'horizontal centering in CSS pixels' ).toBeLessThanOrEqual( 1 );
			expect( mark.dy, 'vertical centering in CSS pixels' ).toBeLessThanOrEqual( 1 );
		} );
	}
}
