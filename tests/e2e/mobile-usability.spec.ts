import { test, expect } from '@playwright/test';

test.use( { hasTouch: true } );

test.beforeEach( async ( { page } ) => {
	await page.setViewportSize( { width: 375, height: 812 } );
	await page.addInitScript( () => localStorage.setItem( 'maestroFirstRunDone', '1' ) );
	await page.goto( '/wp-admin/index.php?maestro_edit=1' );
} );

test( 'phone toolbar has touch targets and no width-only Settings', async ( { page } ) => {
	await page.locator( '#menu-posts > a.menu-top' ).click();
	await expect( page.locator( '.maestro-settings-btn' ) ).toBeHidden();
	const sizes = await page.locator( '.maestro-toolbar button:visible' ).evaluateAll( buttons => buttons.map( b => {
		const r = b.getBoundingClientRect(); return { width: r.width, height: r.height };
	} ) );
	for ( const size of sizes ) {
		expect( size.width ).toBeGreaterThanOrEqual( 44 );
		expect( size.height ).toBeGreaterThanOrEqual( 44 );
	}
} );

for ( const kind of [ 'visibility', 'icons', 'groups' ] ) {
	test( `phone ${ kind } sheet contains taps and closes explicitly`, async ( { page } ) => {
		await page.locator( '#menu-posts > a.menu-top' ).click();
		const trigger = page.locator( kind === 'visibility' ? '.maestro-vis-btn' : kind === 'icons' ? '.maestro-icon-btn' : '.maestro-profiles-btn' );
		await trigger.tap();
		const pop = page.locator( '.maestro-popover' );
		await expect( pop ).toBeVisible();
		const r = await pop.boundingBox();
		expect( r!.width ).toBeGreaterThanOrEqual( 350 );
		const barBottom = await page.locator( '#wpadminbar' ).evaluate( el => el.getBoundingClientRect().bottom );
		expect( r!.y ).toBeGreaterThanOrEqual( barBottom );
		expect( r!.y + r!.height ).toBeLessThanOrEqual( 812 );
		if ( kind === 'visibility' ) {
			const before = await page.evaluate( () => window.scrollY );
			await pop.locator( '.maestro-mobile-body' ).evaluate( el => { el.scrollTop = el.scrollHeight; } );
			expect( await page.evaluate( () => window.scrollY ) ).toBe( before );
		}
		await page.touchscreen.tap( 2, 200 ); // outside sheet must not dismiss it or the menu
		await expect( pop ).toBeVisible();
		await expect( page.locator( '#adminmenu' ) ).toBeVisible();
		await pop.getByRole( 'button', { name: 'Close dialog', exact: true } ).tap();
		await expect( pop ).toHaveCount( 0 );
		await expect( page.locator( '#adminmenu' ) ).toBeVisible();
		await expect( trigger ).toBeFocused();
		expect( await page.evaluate( () => document.body.style.overflow ) ).not.toBe( 'hidden' );
	} );
}

test( 'group sheet follows visual viewport and keeps focused input above keyboard', async ( { page } ) => {
	// Install an event source before opening, as a real visualViewport would be.
	await page.evaluate( () => {
		const viewport = Object.assign( new EventTarget(), { width: 375, height: 812, offsetTop: 0, offsetLeft: 0 } );
		Object.defineProperty( window, 'visualViewport', { configurable: true, value: viewport } );
	} );
	await page.locator( '.maestro-profiles-btn' ).tap();
	const pop = page.locator( '.maestro-profiles-popover' );
	const input = pop.getByRole( 'textbox', { name: 'New group name' } );
	await input.tap();
	// Keyboard geometry: iOS changes the visual viewport without resizing layout.
	await page.evaluate( () => {
		Object.assign( window.visualViewport!, { height: 320, offsetTop: 44 } );
		window.visualViewport!.dispatchEvent( new Event( 'resize' ) );
	} );
	await expect.poll( async () => ( await pop.boundingBox() )!.y ).toBeGreaterThanOrEqual( 44 );
	const r = ( await pop.boundingBox() )!;
	expect( r.y + r.height ).toBeLessThanOrEqual( 364 );
	await expect.poll( async () => ( await input.boundingBox() )!.y + ( await input.boundingBox() )!.height ).toBeLessThanOrEqual( 364 );
	const done = pop.getByRole( 'button', { name: 'Close dialog', exact: true } );
	const footer = ( await done.boundingBox() )!;
	expect( footer.y + footer.height ).toBeLessThanOrEqual( 364 );
	await done.tap();
	await expect( pop ).toHaveCount( 0 );
} );

test( 'coach tips are omitted on phones and remain available on larger screens', async ( { page } ) => {
	await expect( page.locator( '.maestro-tour-help' ) ).toBeHidden();
	await page.setViewportSize( { width: 900, height: 900 } );
	await page.locator( '.maestro-tour-help' ).tap();
	const texts: string[] = [];
	while ( await page.locator( '.maestro-tour' ).count() ) {
		expect( texts.length ).toBeLessThan( 15 );
		texts.push( await page.locator( '.maestro-tour-text' ).innerText() );
		await page.locator( '.maestro-tour-next' ).tap();
		await expect( page.locator( '#adminmenu' ) ).toBeVisible();
	}
	expect( texts ).toHaveLength( 12 );
	for ( const label of [ 'Type a new name', 'Reorder', 'icon', 'Hide the item', 'Visibility groups', 'Preview as', 'Reset all', 'Exit' ] ) {
		expect( texts.some( text => text.includes( label ) ), label ).toBe( true );
	}
	expect( texts.some( text => text.includes( 'Menu settings' ) ) ).toBe( false );
	await page.locator( '.maestro-tour-help' ).tap();
	await page.locator( '.maestro-tour-next' ).tap();
	await expect( page.locator( '.maestro-tour-text' ) ).toContainText( 'Type a new name' );
	await page.locator( '.maestro-tour-back' ).tap();
	await expect( page.locator( '.maestro-tour-text' ) ).toContainText( 'Click any menu item' );
	await page.locator( '.maestro-tour-skip' ).tap();
	await expect( page.locator( '.maestro-tour' ) ).toHaveCount( 0 );
	await expect( page.locator( '#adminmenu' ) ).toBeVisible();
} );


test( 'phone RTL dialog hand-off and Escape restore scrolling and menu focus', async ( { page } ) => {
	await page.evaluate( () => { document.documentElement.dir = 'rtl'; document.body.classList.add( 'rtl' ); } );
	await page.locator( '#menu-posts > a.menu-top' ).tap();
	await page.locator( '.maestro-vis-btn' ).tap();
	await page.locator( '.maestro-manage-profiles' ).tap();
	const dialog = page.getByRole( 'dialog', { name: 'Visibility groups' } );
	await expect( dialog ).toBeVisible();
	await expect( page.locator( '.maestro-popover' ) ).toHaveCount( 1 );
	const box = ( await dialog.boundingBox() )!;
	expect( box.x ).toBeGreaterThanOrEqual( 0 );
	expect( box.x + box.width ).toBeLessThanOrEqual( 375 );
	expect( await page.evaluate( () => document.body.style.overflow ) ).toBe( 'hidden' );
	await page.keyboard.press( 'Escape' );
	await expect( dialog ).toHaveCount( 0 );
	await expect( page.locator( '#adminmenu' ) ).toBeVisible();
	await expect( page.locator( '.maestro-profiles-btn' ) ).toBeFocused();
	expect( await page.evaluate( () => document.body.style.overflow ) ).not.toBe( 'hidden' );
	await page.locator( '.maestro-profiles-btn' ).tap();
	await dialog.getByRole( 'button', { name: 'Close dialog', exact: true } ).tap();
	await expect( dialog ).toHaveCount( 0 );
} );

test( 'width Settings returns at the desktop breakpoint', async ( { page } ) => {
	await page.setViewportSize( { width: 961, height: 900 } );
	await page.reload();
	await page.locator( '.maestro-settings-btn' ).click();
	const dialog = page.getByRole( 'dialog', { name: 'Menu width', exact: true } );
	await expect( dialog.getByLabel( 'Menu width in pixels' ) ).toBeVisible();
	await dialog.getByRole( 'button', { name: 'Close dialog', exact: true } ).click();
	await expect( dialog ).toHaveCount( 0 );
} );

test( 'an open desktop dialog becomes a phone sheet after resize', async ( { page } ) => {
	await page.setViewportSize( { width: 1000, height: 900 } );
	await page.reload();
	await page.locator( '.maestro-profiles-btn' ).click();
	await expect( page.locator( '.maestro-mobile-sheet' ) ).toHaveCount( 0 );
	await page.setViewportSize( { width: 375, height: 812 } );
	const sheet = page.locator( '.maestro-mobile-sheet' );
	await expect( sheet ).toBeVisible();
	await page.touchscreen.tap( 2, 200 );
	await expect( sheet ).toBeVisible();
	await sheet.getByRole( 'button', { name: 'Close dialog', exact: true } ).tap();
	await expect( sheet ).toHaveCount( 0 );
	expect( await page.evaluate( () => document.body.style.overflow ) ).not.toBe( 'hidden' );
} );


test( '320px phone toolbar fits without horizontal overflow', async ( { page } ) => {
	await page.setViewportSize( { width: 320, height: 812 } );
	await page.locator( '#menu-posts > a.menu-top' ).tap();
	const layout = await page.locator( '.maestro-toolbar' ).evaluate( el => {
		const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, scroll: el.scrollWidth, client: el.clientWidth, height: r.height };
	} );
	expect( layout.left ).toBeGreaterThanOrEqual( 0 );
	expect( layout.right ).toBeLessThanOrEqual( 320 );
	expect( layout.scroll ).toBeLessThanOrEqual( layout.client + 1 );
	expect( layout.height ).toBeLessThanOrEqual( 180 );
} );
