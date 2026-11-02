import { test, expect } from './fixtures';
import type { Locator, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * v1.11 acceptance, automated half: the iPad and touch checks from
 * .planning/milestones/v1.11-ACCEPTANCE.md, run at real iPad CSS sizes with
 * touch input and a mobile viewport.
 *
 * This is emulation (Chromium with hasTouch/isMobile), so it proves layout,
 * geometry, tap routing and accessible names at iPad sizes. It does not replace
 * Dan's pass on real iPadOS Safari, where the software keyboard, rubber-band
 * scrolling and VoiceOver behave in ways no emulator reproduces.
 *
 * Sizes: iPad mini portrait is narrower than 782px, so it gets the compact
 * phone-style toolbar; iPad Air portrait is a touch "desktop" layout below the
 * 961px width-control cut-off; landscape is the full desktop editor.
 */

const IPAD_UA =
	'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

const PROFILES = [
	{ name: 'iPad mini portrait', width: 744, height: 1133 },
	{ name: 'iPad Air portrait', width: 820, height: 1180 },
	{ name: 'iPad Air landscape', width: 1180, height: 820 },
];

const DIALOG_TRIGGERS = {
	Visibility: '.maestro-vis-btn',
	'Icon picker': '.maestro-icon-btn',
	'Visibility groups': '.maestro-profiles-btn',
};

const AXE_TAGS = [ 'wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa' ];

async function axeViolations( page: Page, include: string ): Promise< string[] > {
	const result = await new AxeBuilder( { page } ).include( include ).withTags( AXE_TAGS ).analyze();
	return result.violations.map( ( v ) => `${ v.id } (${ v.impact }): ${ v.help } — ${ v.nodes.map( ( n ) => n.target.join( ' ' ) ).join( ', ' ) }` );
}

async function inViewport( page: Page, locator: Locator ) {
	const vp = page.viewportSize()!;
	await expect.poll( async () => {
		const r = await locator.boundingBox();
		return !! r && r.x >= -1 && r.y >= -1 && r.x + r.width <= vp.width + 1 && r.y + r.height <= vp.height + 1;
	}, { message: 'element stays inside the screen' } ).toBe( true );
}

// Simulates the iPadOS software keyboard: the visual viewport shrinks while the
// layout viewport stays put.
async function stubVisualViewport( page: Page, width: number, height: number ) {
	await page.evaluate( ( [ w, h ] ) => {
		const viewport = Object.assign( new EventTarget(), { width: w, height: h, offsetTop: 0, offsetLeft: 0, scale: 1 } );
		Object.defineProperty( window, 'visualViewport', { configurable: true, value: viewport } );
	}, [ width, height ] );
}

async function showKeyboard( page: Page, height: number ) {
	await page.evaluate( ( h ) => {
		Object.assign( window.visualViewport!, { height: h } );
		window.visualViewport!.dispatchEvent( new Event( 'resize' ) );
	}, height );
}

/*
 * Close a popover the way a finger would. Phone sheets and Visibility groups
 * have a Close button; on the desktop layout (783px and up, so most iPads)
 * the Icon picker and Visibility popovers have none by design and close on a
 * tap outside, which must not close the menu.
 */
async function closePopover( page: Page, pop: Locator ) {
	const close = pop.getByRole( 'button', { name: 'Close dialog', exact: true } );
	if ( await close.count() ) {
		await close.tap();
	} else {
		const vp = page.viewportSize()!;
		await page.touchscreen.tap( vp.width - 10, vp.height / 2 );
	}
	await expect( pop ).toHaveCount( 0 );
	await expect( page.locator( '#adminmenu' ) ).toBeVisible();
}

async function openEditor( page: Page ) {
	await page.goto( '/wp-admin/index.php?maestro_edit=1' );
	await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
	// Below 782px core hides the menu behind the hamburger until edit mode opens it.
	await expect( page.locator( '#adminmenu' ) ).toBeVisible();
}

for ( const profile of PROFILES ) {
	const wide = profile.width >= 961;
	const compact = profile.width <= 782;

	test.describe( `${ profile.name } ${ profile.width }x${ profile.height }`, () => {
		test.use( {
			viewport: { width: profile.width, height: profile.height },
			hasTouch: true,
			isMobile: true,
			deviceScaleFactor: 2,
			userAgent: IPAD_UA,
		} );

		test( '1.1 enter edit mode from the admin bar, exit, and re-enter', async ( { page } ) => {
			await page.goto( '/wp-admin/index.php' );
			const toggle = page.locator( '#wp-admin-bar-maestro-toggle > .ab-item' );
			await expect( toggle ).toBeVisible();
			await toggle.tap();
			await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
			await expect( page.locator( '#adminmenu li.maestro-item' ).first() ).toBeVisible();
			await page.locator( '#wp-admin-bar-maestro-toggle > .ab-item' ).tap();
			await expect( page.locator( '.maestro-toolbar' ) ).toHaveCount( 0 );
			await page.locator( '#wp-admin-bar-maestro-toggle > .ab-item' ).tap();
			await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
		} );

		test( '1.2 toolbar targets are touch-sized, do not overflow, and tapping the toolbar keeps the menu open', async ( { page } ) => {
			await openEditor( page );
			await page.locator( '#menu-posts > a.menu-top' ).tap();
			await expect( page.locator( '.maestro-toolbar .maestro-panel' ) ).toBeVisible();

			const buttons = await page.locator( '.maestro-toolbar button:visible, .maestro-toolbar a.button:visible' ).evaluateAll( ( els ) =>
				els.map( ( b ) => {
					const r = b.getBoundingClientRect();
					return { label: b.getAttribute( 'aria-label' ) || b.textContent!.trim(), w: Math.round( r.width ), h: Math.round( r.height ), right: r.right, bottom: r.bottom };
				} )
			);
			expect( buttons.length ).toBeGreaterThan( 4 );
			const vp = page.viewportSize()!;
			for ( const b of buttons ) {
				// WCAG 2.2 target size minimum is 24px; 44px is Apple's touch guidance.
				// 44px tall everywhere on touch; 40px wide is kept on the desktop
				// layout so a 1024px iPad's toolbar stays on one row.
				expect.soft( b.h, `${ b.label } is at least 44px tall` ).toBeGreaterThanOrEqual( 44 );
				expect.soft( b.w, `${ b.label } is at least 40px wide` ).toBeGreaterThanOrEqual( 40 );
				expect.soft( b.right, `${ b.label } is not cut off` ).toBeLessThanOrEqual( vp.width + 1 );
				expect.soft( b.bottom, `${ b.label } is not below the screen` ).toBeLessThanOrEqual( vp.height + 1 );
			}
			test.info().annotations.push( {
				type: 'targets',
				description: buttons.map( ( b ) => `${ b.label }=${ b.w }x${ b.h }` ).join( ', ' ),
			} );

			// The toolbar must not run past the screen edge.
			const bar = ( await page.locator( '.maestro-toolbar' ).boundingBox() )!;
			expect( bar.x + bar.width ).toBeLessThanOrEqual( vp.width + 1 );

			// Taps on the toolbar's own background never close the editor or menu.
			await page.locator( '.maestro-toolbar' ).tap( { position: { x: 4, y: 4 } } );
			await expect( page.locator( '#adminmenu' ) ).toBeVisible();
			await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
		} );

		test( '1.3 text fields are 16px, so iPadOS Safari does not zoom the page on focus', async ( { page } ) => {
			await openEditor( page );
			await page.locator( '#menu-posts > a.menu-top' ).tap();
			const sizes: Record< string, string > = {};
			sizes.rename = await page.locator( '.maestro-rename-input' ).evaluate( ( el ) => getComputedStyle( el ).fontSize );
			for ( const [ name, trigger ] of Object.entries( DIALOG_TRIGGERS ) ) {
				await page.locator( `.maestro-toolbar ${ trigger }` ).tap();
				const pop = page.locator( '.maestro-popover' );
				await expect( pop ).toBeVisible();
				const fields = await pop.locator( 'input[type=text], input[type=search], input[type=number], select' ).evaluateAll( ( els ) =>
					els.filter( ( el ) => ( el as HTMLElement ).offsetParent ).map( ( el ) => getComputedStyle( el ).fontSize )
				);
				fields.forEach( ( f, i ) => ( sizes[ `${ name } ${ i }` ] = f ) );
				await closePopover( page, pop );
			}
			for ( const [ field, size ] of Object.entries( sizes ) ) {
				expect.soft( parseFloat( size ), `${ field } font size` ).toBeGreaterThanOrEqual( 16 );
			}
		} );

		test( '1.3 rename with the on-screen keyboard: field stays visible and the next row tap commits', async ( { page } ) => {
			await openEditor( page );
			await stubVisualViewport( page, profile.width, profile.height );
			const posts = page.locator( '#menu-posts > a.menu-top' );
			await posts.tap();
			const rename = page.locator( '.maestro-rename-input' );
			// A tap selects without popping the keyboard.
			await expect( rename ).not.toBeFocused();
			await rename.tap();
			await expect( rename ).toBeFocused();
			// iPad keyboards take roughly 40% (portrait) to 50% (landscape) of the height.
			const kbVisible = Math.round( profile.height * ( profile.width > profile.height ? 0.5 : 0.6 ) );
			await showKeyboard( page, kbVisible );
			await expect.poll( async () => {
				const r = ( await rename.boundingBox() )!;
				return r.y >= 0 && r.y + r.height <= kbVisible + 1;
			}, { message: 'name field is above the keyboard' } ).toBe( true );
			await rename.fill( 'Articles iPad' );
			await page.locator( '#menu-media > a.menu-top' ).tap();
			await expect( rename ).not.toBeFocused();
			await expect( posts.locator( '.wp-menu-name' ) ).toContainText( 'Articles iPad' );
		} );

		for ( const [ name, trigger ] of Object.entries( DIALOG_TRIGGERS ) ) {
			test( `1.4 ${ name } sheet fits, scrolls inside, has no axe violations, and closes by tap`, async ( { page } ) => {
				await openEditor( page );
				await page.locator( '#menu-posts > a.menu-top' ).tap();
				const btn = page.locator( `.maestro-toolbar ${ trigger }` );
				await btn.tap();
				const pop = page.locator( '.maestro-popover' );
				await expect( pop ).toBeVisible();
				await inViewport( page, pop );

				const before = await page.evaluate( () => window.scrollY );
				await pop.evaluate( ( el ) => {
					const body = ( el.querySelector( '.maestro-mobile-body' ) || el ) as HTMLElement;
					body.scrollTop = body.scrollHeight;
				} );
				expect( await page.evaluate( () => window.scrollY ) ).toBe( before );

				expect( await axeViolations( page, '.maestro-popover' ) ).toEqual( [] );
				const hasClose = await pop.getByRole( 'button', { name: 'Close dialog', exact: true } ).count();
				test.info().annotations.push( { type: 'dismissal', description: hasClose ? 'Close button' : 'tap outside (no Close button on this layout)' } );
				await closePopover( page, pop );
				await expect( btn ).toBeFocused();
			} );
		}

		test( '1.4 Preview as opens, the banner and Exit preview are reachable and named', async ( { page } ) => {
			await openEditor( page );
			await page.locator( '.maestro-preview-toggle' ).tap();
			const select = page.getByRole( 'combobox', { name: 'Preview as' } );
			await expect( select ).toBeVisible();
			await inViewport( page, select );
			await select.selectOption( 'editor' );
			await Promise.all( [
				page.waitForURL( /maestro_preview=/ ),
				page.locator( '.maestro-preview-btn' ).tap(),
			] );
			const banner = page.locator( '.maestro-preview-banner' );
			await expect( banner ).toBeVisible();
			const exit = banner.getByRole( 'link', { name: 'Exit preview' } );
			await expect( exit ).toBeVisible();
			await inViewport( page, exit );
			expect( await axeViolations( page, '.maestro-preview-banner' ) ).toEqual( [] );
			await exit.tap();
			await expect( banner ).toHaveCount( 0 );
		} );

		test( '1.6 tour: every tip stays on screen; Next, Back, Close and Done work by tap', async ( { page } ) => {
			await openEditor( page );
			const help = page.locator( '.maestro-tour-help' );
			if ( compact ) {
				// Coach tips are deliberately omitted below 782px.
				await expect( help ).toBeHidden();
				return;
			}
			await help.tap();
			const tour = page.locator( '.maestro-tour' );
			await expect( tour ).toBeVisible();
			const progress = page.locator( '.maestro-tour-progress' );
			const total = Number( ( await progress.textContent() )!.match( /of (\d+)/ )![ 1 ] );
			expect( total ).toBeGreaterThan( 5 );
			test.info().annotations.push( { type: 'tour steps', description: String( total ) } );

			// Back from step 2 returns to step 1.
			await page.locator( '.maestro-tour-next' ).tap();
			await expect( progress ).toHaveText( `2 of ${ total }` );
			await page.locator( '.maestro-tour-back' ).tap();
			await expect( progress ).toHaveText( `1 of ${ total }` );

			for ( let i = 1; i <= total; i++ ) {
				await expect( progress ).toHaveText( `${ i } of ${ total }` );
				await inViewport( page, tour );
				await page.locator( '.maestro-tour-next' ).tap(); // Done on the last step
			}
			await expect( tour ).toHaveCount( 0 );
			await expect( page.locator( '#adminmenu' ) ).toBeVisible();

			// Close from the middle.
			await help.tap();
			await page.locator( '.maestro-tour-next' ).tap();
			await page.getByRole( 'button', { name: 'Close tour' } ).tap();
			await expect( tour ).toHaveCount( 0 );
			await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
		} );

		test( '1.7 width: touch-drag the edge handle, save, reload, and it holds', async ( { page, context } ) => {
			await openEditor( page );
			const handle = page.getByRole( 'separator', { name: 'Resize menu' } );
			if ( ! wide ) {
				await expect( handle ).toBeHidden();
				await expect( page.locator( '.maestro-settings-btn' ) ).toBeHidden();
				return;
			}
			await expect( handle ).toBeVisible();
			const box = ( await handle.boundingBox() )!;
			expect( box.width, 'edge handle is at least 24px wide on a touch screen' ).toBeGreaterThanOrEqual( 24 );
			// Real touch events through CDP, as a finger drag.
			const cdp = await context.newCDPSession( page );
			const x0 = box.x + box.width / 2;
			const y = box.y + 120;
			const touch = ( type: string, x: number ) =>
				cdp.send( 'Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [ { x, y } ] } as never );
			await touch( 'touchStart', x0 );
			for ( let s = 1; s <= 6; s++ ) {
				await touch( 'touchMove', x0 + s * 10 );
			}
			await touch( 'touchEnd', x0 + 60 );

			const width = () => page.locator( '#adminmenuwrap' ).evaluate( ( el ) => Math.round( el.getBoundingClientRect().width ) );
			const after = await width();
			expect( after, 'drag widened the menu' ).toBeGreaterThan( 180 );
			await page.waitForTimeout( 1500 ); // autosave debounce
			await page.reload();
			await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
			expect( Math.abs( ( await width() ) - after ) ).toBeLessThanOrEqual( 2 );
		} );
	} );
}
