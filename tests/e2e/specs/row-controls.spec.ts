import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { execFileSync } from 'child_process';

/**
 * Selected-row controls prototype (.planning/DESKTOP-UX-NEXT-PASS.md).
 *
 * Opt-in with ?maestro_rows=1 while it is a prototype: rename, move and icon
 * controls sit on the selected menu row, and the toolbar keeps Visibility,
 * Reset item, the separator actions and the global controls.
 */

const POST_SAVE = ( url: string ) => url.includes( '/maestro/v1/config' );
const EDIT = '/wp-admin/index.php?maestro_edit=1&maestro_rows=1';

const posts = ( page: Page ) => page.locator( '#adminmenu > li#menu-posts' );
const strip = ( page: Page ) => page.locator( '#adminmenu .maestro-row-strip' );

function saved( page: Page ) {
	return page.waitForResponse( r => POST_SAVE( r.url() ) && r.request().method() === 'POST' && r.ok() );
}

async function openEditor( page: Page, url = EDIT ) {
	await page.goto( url );
	await expect( page.locator( '.maestro-toolbar' ) ).toBeAttached();
	const closeTour = page.getByRole( 'button', { name: 'Close tour' } );
	if ( await closeTour.isVisible() ) { await closeTour.click(); }
}


// Pointer selection must commit the OLD row before the shared controls move.
async function renameThenSelect( page: Page, touch: boolean, submenu: boolean ) {
	await openEditor( page );
	const activate = async ( selector: string ) => touch ? page.locator( selector ).tap() : page.locator( selector ).click();
	await activate( '#menu-posts > a' );
	const row = submenu ? posts( page ).locator( '.maestro-subitem' ).first() : posts( page );
	if ( submenu ) {
		if ( touch ) { await row.locator( '> a' ).tap(); } else { await row.locator( '> a' ).click(); }
	}
	await activate( '.maestro-row-rename' );
	await row.locator( '.maestro-row-rename-input' ).fill( 'Saved before switching rows' );
	const save = saved( page );
	await activate( '#menu-media > a' );
	await expect( row.locator( submenu ? '> a' : '.wp-menu-name' ) ).toHaveText( /^Saved before switching rows/ );
	await save;
	await expect( page.locator( '#menu-media' ) ).toHaveClass( /maestro-selected/ );
	await expect( page.locator( '#menu-media > a' ) ).toBeFocused();
	await expect( page.locator( '.maestro-row-rename-input' ) ).toHaveCount( 0 );
	await page.reload();
	await expect( row.locator( submenu ? '> a' : '.wp-menu-name' ) ).toHaveText( /^Saved before switching rows/ );
	await expect( page.locator( '#menu-media .wp-menu-name' ) ).not.toHaveText( /^Saved before switching rows/ );
}

async function checkIconTouchTarget( page: Page ) {
	await openEditor( page );
	await posts( page ).locator( '> a' ).tap();
	const icon = posts( page ).locator( '> .maestro-row-icon' );
	await icon.scrollIntoViewIfNeeded();
	const box = ( await icon.boundingBox() )!;
	const menu = ( await page.locator( '#adminmenu' ).boundingBox() )!;
	const link = ( await posts( page ).locator( '> a' ).boundingBox() )!;
	expect( box.width ).toBeGreaterThanOrEqual( 44 );
	expect( box.height ).toBeGreaterThanOrEqual( 44 );
	expect( box.x ).toBeGreaterThanOrEqual( Math.max( 0, menu.x ) );
	expect( box.x + box.width ).toBeLessThanOrEqual( Math.min( page.viewportSize()!.width, menu.x + menu.width ) );
	expect( box.y ).toBeGreaterThanOrEqual( link.y );
	expect( box.y + box.height ).toBeLessThanOrEqual( link.y + link.height );
	// All four corners must really hit the icon, not an overlapping link.
	for ( const x of [ box.x + 1, box.x + box.width - 1 ] ) {
		for ( const y of [ box.y + 1, box.y + box.height - 1 ] ) {
			expect( await icon.evaluate( ( button, point ) => button.contains( document.elementFromPoint( point.x, point.y ) ), { x, y } ) ).toBe( true );
		}
	}
	expect( await icon.evaluate( ( button, point ) => button.contains( document.elementFromPoint( point.x, point.y ) ), { x: box.x + box.width / 2, y: link.y - 2 } ) ).toBe( false );
	// Tap near the far edge of the 44px box, beyond the old narrow target.
	await page.touchscreen.tap( box.x + box.width - 2, box.y + box.height - 2 );
	await expect( page.locator( '.maestro-icon-popover' ) ).toBeVisible();
	await page.keyboard.press( 'Escape' );
	await expect( icon ).toBeFocused();
	const rtl = await page.locator( 'html' ).getAttribute( 'dir' ) === 'rtl';
	await page.touchscreen.tap( rtl ? box.x - 8 : box.x + box.width + 8, link.y + link.height / 2 );
	await expect( page.locator( '.maestro-icon-popover' ) ).toHaveCount( 0 );
}

test.describe( 'selected-row controls, desktop', () => {
	test.use( { viewport: { width: 1280, height: 800 } } );

	test( 'selecting a row puts its controls on it and keeps focus there', async ( { page } ) => {
		await openEditor( page );
		await posts( page ).locator( '> a' ).click();

		await expect( posts( page ).locator( '> .maestro-row-strip' ) ).toBeVisible();
		await expect( posts( page ).locator( '> .maestro-row-icon' ) ).toBeVisible();
		await expect( page.locator( '.maestro-toolbar .maestro-rename-input' ) ).toBeHidden();
		await expect( page.locator( '.maestro-toolbar .maestro-move-up' ) ).toBeHidden();
		// What stays in the toolbar for now.
		await expect( page.locator( '.maestro-toolbar .maestro-vis-btn' ) ).toBeVisible();
		await expect( page.locator( '.maestro-vis-btn .dashicons-visibility' ) ).toBeVisible();
		await expect( page.locator( '.maestro-preview-toggle .dashicons-welcome-view-site' ) ).toBeVisible();
		await expect( page.locator( '.maestro-toolbar .maestro-reset-item' ) ).toBeVisible();

		// Row, then Change icon, Rename, Move up, Move down.
		await expect( posts( page ).locator( '> a' ) ).toBeFocused();
		for ( const name of [ /Change icon of Posts/, /Rename Posts/, 'Move up', 'Move down' ] ) {
			await page.keyboard.press( 'Tab' );
			await expect( page.locator( ':focus' ) ).toHaveAccessibleName( name );
		}
	} );


	for ( const enabled of [ false, true ] ) {
		test( `rename discourages credential autofill with row controls ${ enabled }`, async ( { page } ) => {
			await openEditor( page, `/wp-admin/index.php?maestro_edit=1&maestro_rows=${ enabled ? 1 : 0 }` );
			await posts( page ).locator( '> a' ).click();
			if ( enabled ) { await strip( page ).locator( '.maestro-row-rename' ).click(); }
			const field = page.locator( enabled ? '.maestro-row-rename-input' : '.maestro-toolbar .maestro-rename-input' );
			await expect( field ).toHaveAttribute( 'type', 'text' );
			await expect( field ).toHaveAttribute( 'autocomplete', 'off' );
			await expect( field ).toHaveAttribute( 'data-1p-ignore', 'true' );
			await expect( field ).toHaveAttribute( 'data-lpignore', 'true' );
			await expect( field ).toHaveAttribute( 'data-bwignore', 'true' );
			await expect( field ).toHaveAttribute( 'data-protonpass-ignore', 'true' );
			await expect( field ).toHaveAccessibleName( 'Menu label' );
			await field.fill( 'Edited without credential autofill' );
			const save = saved( page );
			await field.press( 'Enter' );
			await save;
			await page.reload();
			await expect( posts( page ).locator( '.wp-menu-name' ) ).toHaveText( /^Edited without credential autofill/ );
		} );
	}

	test( 'rename in place: Enter commits, Escape cancels, focus returns to the pencil', async ( { page } ) => {
		await openEditor( page );
		await posts( page ).locator( '> a' ).click();

		await strip( page ).getByRole( 'button', { name: 'Rename Posts' } ).click();
		const field = posts( page ).locator( '.maestro-row-rename-input' );
		await expect( field ).toBeFocused();
		await expect( field ).toHaveAccessibleName( 'Menu label' );
		await field.fill( 'Articles' );
		const save = saved( page );
		await field.press( 'Enter' );
		await save;
		await expect( field ).toHaveCount( 0 );
		await expect( posts( page ).locator( '.wp-menu-name' ) ).toHaveText( /^Articles/ );
		await expect( strip( page ).getByRole( 'button', { name: 'Rename Articles' } ) ).toBeFocused();

		await page.keyboard.press( 'Enter' ); // activates the pencil again
		await page.keyboard.type( 'Discarded' );
		await page.keyboard.press( 'Escape' );
		await expect( posts( page ).locator( '.wp-menu-name' ) ).toHaveText( /^Articles/ );

		await page.reload();
		await expect( posts( page ).locator( '.wp-menu-name' ) ).toHaveText( /^Articles/ );
	} );


	for ( const submenu of [ false, true ] ) {
		test( `mouse switching rows commits the ${ submenu ? 'submenu' : 'top-level' } rename`, async ( { page } ) => {
			await renameThenSelect( page, false, submenu );
		} );
	}

	for ( const key of [ 'Enter', 'Escape' ] ) {
		test( `IME ${ key } leaves rename open until composition ends`, async ( { page } ) => {
			await openEditor( page );
			await posts( page ).locator( '> a' ).click();
			await strip( page ).locator( '.maestro-row-rename' ).click();
			const field = posts( page ).locator( '.maestro-row-rename-input' );
			await field.fill( '未確定' );
			await field.dispatchEvent( 'keydown', { key, isComposing: true } );
			await expect( field ).toBeFocused();
			await field.dispatchEvent( 'compositionstart' );
			// Some IMEs omit isComposing on the confirming key.
			await field.dispatchEvent( 'keydown', { key } );
			await expect( field ).toBeFocused();
			await field.dispatchEvent( 'compositionend', { data: '未確定' } );
			// WebKit may report keyCode 229 on the final composition key.
			await field.dispatchEvent( 'keydown', { key, keyCode: 229 } );
			await expect( field ).toBeFocused();
			await expect( field ).toHaveValue( '未確定' );
			await expect( posts( page ).locator( '.wp-menu-name' ) ).toHaveText( /^Posts/ );

			const save = key === 'Enter' ? saved( page ) : null;
			await field.press( key );
			if ( save ) { await save; }
			await expect( field ).toHaveCount( 0 );
			await expect( strip( page ).locator( '.maestro-row-rename' ) ).toBeFocused();
			await expect( posts( page ).locator( '.wp-menu-name' ) ).toHaveText( key === 'Enter' ? /^未確定/ : /^Posts/ );
		} );
	}

	test( 'Enter on the selected row and F2 both start a rename', async ( { page } ) => {
		await openEditor( page );
		const row = posts( page ).locator( '> a' );
		await row.focus();
		await page.keyboard.press( 'Enter' ); // first Enter selects
		await expect( posts( page ) ).toHaveClass( /maestro-selected/ );
		await expect( posts( page ).locator( '.maestro-row-rename-input' ) ).toHaveCount( 0 );
		await page.keyboard.press( 'Enter' ); // second renames
		await expect( posts( page ).locator( '.maestro-row-rename-input' ) ).toBeFocused();
		await page.keyboard.press( 'Escape' );

		await page.locator( '#adminmenu > li#menu-media > a' ).focus();
		await page.keyboard.press( 'F2' );
		await expect( page.locator( '#adminmenu > li#menu-media' ) ).toHaveClass( /maestro-selected/ );
		await expect( page.locator( '#menu-media .maestro-row-rename-input' ) ).toBeFocused();
	} );

	test( 'the arrows move the row and keep focus for the next press', async ( { page } ) => {
		await openEditor( page );
		await page.locator( '#adminmenu > li#menu-media > a' ).click();
		const up = strip( page ).getByRole( 'button', { name: 'Move up' } );
		const save = saved( page );
		await up.click();
		await save;
		await expect( up ).toBeFocused();
		const order = await page.evaluate( () =>
			Array.from( document.querySelectorAll( '#adminmenu > li.maestro-item:not(.maestro-separator)' ) ).map( li => li.id )
		);
		expect( order.indexOf( 'menu-media' ) ).toBeLessThan( order.indexOf( 'menu-posts' ) );
	} );

	test( 'an icon only opens the picker once its row is selected', async ( { page } ) => {
		await openEditor( page );
		await posts( page ).locator( '.wp-menu-image' ).click();
		await expect( posts( page ) ).toHaveClass( /maestro-selected/ );
		await expect( page.locator( '.maestro-icon-popover' ) ).toHaveCount( 0 );

		await posts( page ).locator( '> .maestro-row-icon' ).click();
		await expect( page.locator( '.maestro-icon-popover' ) ).toBeVisible();
		await page.keyboard.press( 'Escape' );
		await expect( posts( page ).locator( '> .maestro-row-icon' ) ).toBeFocused();
	} );

	test( 'at the 160px default every control fits inside the menu', async ( { page } ) => {
		await openEditor( page );
		await posts( page ).locator( '> a' ).click();
		const menu = ( await page.locator( '#adminmenu' ).boundingBox() )!;
		for ( const b of await strip( page ).locator( 'button' ).all() ) {
			const box = ( await b.boundingBox() )!;
			expect( box.x ).toBeGreaterThanOrEqual( menu.x );
			expect( box.x + box.width ).toBeLessThanOrEqual( menu.x + menu.width );
			expect( box.height ).toBeGreaterThanOrEqual( 24 ); // WCAG 2.5.8
		}
		expect( await page.evaluate( () => document.documentElement.scrollWidth <= document.documentElement.clientWidth ) ).toBe( true );
	} );

	test( 'without the flag the shipped toolbar flow is unchanged', async ( { page } ) => {
		await openEditor( page, '/wp-admin/index.php?maestro_edit=1&maestro_rows=0' );
		await posts( page ).locator( '> a' ).click();
		await expect( strip( page ) ).toHaveCount( 0 );
		await expect( page.locator( '.maestro-toolbar .maestro-rename-input' ) ).toBeFocused();
	} );
} );

// A real RTL locale loads WordPress's RTL styles as well as its direction.
test.describe( 'selected-row controls, RTL live widths', () => {
	test.use( { viewport: { width: 1280, height: 800 } } );
	let previousLanguage: string;
	function wp( args: string[] ) {
		return execFileSync( 'npx', [ 'wp-env', 'run', 'tests-cli', 'wp', ...args ], {
			encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ],
		} );
	}
	test.beforeAll( () => {
		previousLanguage = JSON.parse( wp( [ 'eval', "echo wp_json_encode( get_option( 'WPLANG', '' ) );" ] ) );
		wp( [ 'language', 'core', 'install', 'ar', '--activate' ] );
	} );
	test.afterAll( () => {
		wp( [ 'option', 'update', 'WPLANG', previousLanguage ] );
	} );

	for ( const submenu of [ false, true ] ) {
		test( `live resizing keeps the ${ submenu ? 'submenu' : 'top-level' } rename field aligned in RTL`, async ( { page } ) => {
			await openEditor( page );
			await expect( page.locator( 'html' ) ).toHaveAttribute( 'dir', 'rtl' );
			// Simulate an external width owner (Keel), without a window resize.
			await page.addStyleTag( { content: '#adminmenuwrap, #adminmenu { width: var(--review-width, 320px) !important; }' } );
			await posts( page ).locator( '> a' ).click();
			const row = submenu ? posts( page ).locator( '.maestro-subitem' ).first() : posts( page );
			await row.locator( '> a' ).focus();
			await page.keyboard.press( 'F2' );
			const field = row.locator( '.maestro-row-rename-input' );
			await field.fill( 'قائمة طويلة للغاية لاختبار عرض عناصر التحكم بجانب الصف المحدد' );
			const save = saved( page );
			await field.press( 'Enter' );
			await save;
			await strip( page ).locator( '.maestro-row-rename' ).click();
			await field.fill( 'نص غير محفوظ لاختبار عرض القائمة' );
			await field.evaluate( ( input: HTMLInputElement ) => input.setSelectionRange( 2, 5 ) );

			for ( const width of [ 160, 240, 320, 160 ] ) {
				await page.evaluate( w => document.documentElement.style.setProperty( '--review-width', `${ w }px` ), width );
				// Also exercise the window-resize path without changing the menu width.
				if ( width === 240 ) { await page.setViewportSize( { width: 1100, height: 800 } ); }
				await expect.poll( () => row.evaluate( ( li, isSub ) => {
					const a = li.querySelector( 'a' )!;
					const label = isSub ? a : a.querySelector( '.wp-menu-name' )!;
					const r = label.getBoundingClientRect();
					const ar = a.getBoundingClientRect();
					const style = getComputedStyle( label );
					const left = parseFloat( style.paddingLeft ) || 0;
					const right = parseFloat( style.paddingRight ) || 0;
					const f = li.querySelector( '.maestro-row-rename-input' )!.getBoundingClientRect();
					return Math.max( Math.abs( f.left - r.left - left ), Math.abs( f.width - ( r.width - left - right ) ), Math.abs( f.top - ar.top ), Math.abs( f.height - ar.height ) );
				}, submenu ) ).toBeLessThan( 1 );
				await expect( field ).toBeFocused();
				await expect( field ).toHaveValue( 'نص غير محفوظ لاختبار عرض القائمة' );
				expect( await field.evaluate( ( input: HTMLInputElement ) => [ input.selectionStart, input.selectionEnd ] ) ).toEqual( [ 2, 5 ] );
				const menu = ( await page.locator( '#adminmenu' ).boundingBox() )!;
				const box = ( await field.boundingBox() )!;
				expect( box.x ).toBeGreaterThanOrEqual( menu.x );
				expect( box.x + box.width ).toBeLessThanOrEqual( menu.x + menu.width );
			}
			await page.keyboard.press( 'Escape' );
			await expect( field ).toHaveCount( 0 );
			await expect( strip( page ).locator( '.maestro-row-rename' ) ).toBeFocused();
		} );
	}

	test.describe( 'phone', () => {
		test.use( { viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true } );
		test( 'RTL icon has a usable 44px touch target', async ( { page } ) => {
			await checkIconTouchTarget( page );
		} );
	} );

} );

test.describe( 'selected-row controls, phone', () => {
	test.use( { viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true } );


	for ( const submenu of [ false, true ] ) {
		test( `touch switching rows commits the ${ submenu ? 'submenu' : 'top-level' } rename`, async ( { page } ) => {
			await renameThenSelect( page, true, submenu );
		} );
	}

	test( 'LTR icon has a usable 44px touch target', async ( { page } ) => {
		await checkIconTouchTarget( page );
	} );

	test( 'targets are 44px, live inside #adminmenuwrap, and leave the menu open', async ( { page } ) => {
		await openEditor( page );
		await posts( page ).locator( '> a' ).tap();
		await expect( strip( page ) ).toBeVisible();
		expect( await strip( page ).evaluate( n => !! n.closest( '#adminmenuwrap' ) ) ).toBe( true );
		await expect( page.locator( '.maestro-toolbar .maestro-rename-input' ) ).toBeHidden();
		// Selecting does not raise the on-screen keyboard.
		expect( await page.evaluate( () => document.activeElement?.tagName ) ).not.toBe( 'INPUT' );

		for ( const b of await strip( page ).locator( 'button' ).all() ) {
			const box = ( await b.boundingBox() )!;
			expect( box.width ).toBeGreaterThanOrEqual( 44 );
			expect( box.height ).toBeGreaterThanOrEqual( 44 );
		}

		await strip( page ).getByRole( 'button', { name: 'Move down' } ).tap();
		await posts( page ).locator( '> .maestro-row-icon' ).tap();
		await expect( page.locator( '.maestro-icon-popover' ) ).toBeVisible();
		expect( await page.evaluate( () => document.getElementById( 'wpwrap' )!.classList.contains( 'wp-responsive-open' ) ) ).toBe( true );
	} );
} );
