import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Independent REST seeding keeps this regression runnable against a real local
// site as well as CI's wp-env. Do not import the fixture's WP-CLI reset here.
const previewCss = readFileSync( join( __dirname, '../fixtures/keel-width/preview.css' ), 'utf8' );
const previewJs = readFileSync( join( __dirname, '../fixtures/keel-width/preview.js' ), 'utf8' );
const savedCss = `@media screen and (min-width: 961px) {
	body:not(.folded) #adminmenu,
	body:not(.folded) #adminmenuback,
	body:not(.folded) #adminmenuwrap,
	body:not(.folded) #adminmenu li.menu-top,
	body:not(.folded) #adminmenu .wp-submenu { width: 240px !important; }
	body:not(.folded) #adminmenu li.menu-top > a.menu-top,
	body:not(.folded) #adminmenu .wp-has-current-submenu a.wp-has-current-submenu,
	body:not(.folded) #adminmenu li.current a.menu-top { width: auto !important; }
	body:not(.folded) #wpcontent,
	body:not(.folded) #wpfooter { margin-left: 240px !important; }
	body:not(.folded) #adminmenu li.menu-top:not(.wp-has-current-submenu) .wp-submenu { left: 240px; }
	body:not(.folded) #adminmenu .wp-has-current-submenu .wp-submenu.wp-submenu-wrap { left: auto; }
	body:not(.folded) #adminmenu .wp-not-current-submenu .wp-submenu { min-width: 240px !important; }
}`;

async function config( page: Page, value: object | null ) {
	const status = await page.evaluate( async ( value ) => {
		const d = ( window as unknown as { maestroData: { restUrl: string; nonce: string } } ).maestroData;
		const r = await fetch( d.restUrl, {
			method: value === null ? 'DELETE' : 'POST',
			headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': d.nonce },
			body: value === null ? undefined : JSON.stringify( { config: value } ),
		} );
		return r.status;
	}, value );
	expect( status ).toBeGreaterThanOrEqual( 200 );
	expect( status ).toBeLessThan( 300 );
}

async function aligned( page: Page, width: number ) {
	await expect.poll( () => page.evaluate( () => {
		const rect = ( s: string ) => document.querySelector( s )!.getBoundingClientRect();
		const wrap = rect( '#adminmenuwrap' );
		const submenus = Array.from( document.querySelectorAll( '#adminmenu .wp-submenu' ) )
			.filter( n => ( n as HTMLElement ).offsetParent !== null );
		return {
			wrap: Math.round( wrap.width ), menu: Math.round( rect( '#adminmenu' ).width ),
			back: Math.round( rect( '#adminmenuback' ).right ),
			content: Math.round( rect( '#wpcontent' ).left ),
			toolbar: Math.round( rect( '.maestro-toolbar' ).left ),
			// Check every expanded submenu, not just the current parent's submenu.
			submenusFit: submenus.length > 0 && submenus.every( n => {
				const r = n.getBoundingClientRect();
				return r.left >= wrap.left - 1 && r.right <= wrap.right + 1;
			} ),
			rowsFit: Array.from( document.querySelectorAll( '#adminmenu > li.menu-top' ) ).every( n =>
				Math.abs( n.getBoundingClientRect().width - wrap.width ) <= 1 ),
		};
	} ) ).toEqual( { wrap: width, menu: width, back: width, content: width, toolbar: width, submenusFit: true, rowsFit: true } );
}

test.use( { viewport: { width: 1280, height: 900 } } );

for ( const storedWidth of [ null, 240 ] ) {
	test( `Keel preview keeps submenu/content alignment with Maestro width ${ storedWidth ?? 'unset' }`, async ( { page } ) => {
		await page.addInitScript( () => localStorage.setItem( 'maestroFirstRunDone', '1' ) );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
		await config( page, storedWidth === null ? {} : { menu_width: storedWidth } );
		await page.reload();
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
		try {
			// Keel's saved-width rule remains loaded throughout its live preview.
			await page.addStyleTag( { content: savedCss } );
			await page.addStyleTag( { content: previewCss } );
			await page.evaluate( () => {
				const input = document.createElement( 'input' );
				input.type = 'range'; input.min = '0'; input.max = '5'; input.value = '3';
				input.id = 'keel-preview-regression';
				input.setAttribute( 'aria-label', 'Keel menu width preview' );
				input.dataset.keelRange = 'keel-preview-readout';
				input.dataset.keelRangeLabels = JSON.stringify( [ 'Leave unchanged', '160px', '200px', '240px', '280px', '300px' ] );
				input.dataset.keelRangeWidths = '[160,160,200,240,280,300]';
				const out = document.createElement( 'output' ); out.id = 'keel-preview-readout';
				const host = document.createElement( 'div' );
				host.style.cssText = 'position:fixed;top:40px;right:20px;z-index:100001;background:white';
				host.append( input, out ); document.body.appendChild( host );
			} );
			await page.addScriptTag( { content: previewJs } );
			await aligned( page, 240 );
			const slider = page.getByRole( 'slider', { name: 'Keel menu width preview' } );
			await slider.press( 'End' ); await aligned( page, 300 );
			// Home is Keel's real Leave unchanged transition: it applies a 160px
			// preview; it does NOT remove the CSS or saved 240px submenu minimum.
			await slider.press( 'Home' ); await aligned( page, 160 );
			await slider.press( 'ArrowRight' ); await aligned( page, 160 );
			await slider.press( 'ArrowRight' ); await aligned( page, 200 );
			await slider.press( 'End' ); await aligned( page, 300 );
			await slider.press( 'Home' ); await aligned( page, 160 );
			await page.reload();
			await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
			await page.addStyleTag( { content: savedCss } );
			await aligned( page, 240 );
		} finally { await config( page, null ); }
	} );
}
