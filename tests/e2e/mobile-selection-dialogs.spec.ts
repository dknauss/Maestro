import { test, expect } from './fixtures';
import { execFileSync } from 'child_process';

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

const LANDSCAPES = [ { width: 667, height: 375 }, { width: 844, height: 390 } ];
const TRIGGERS: Record< string, string > = {
	preview: '.maestro-preview-toggle',
	profiles: '.maestro-profiles-btn',
	vis: '.maestro-vis-btn',
	icon: '.maestro-icon-btn',
};

// A stand-in visualViewport the test can move, as a software keyboard would.
async function stubVisualViewport( page, width: number, height: number ) {
	await page.evaluate( ( [ w, h ] ) => {
		const viewport = Object.assign( new EventTarget(), { width: w, height: h, offsetTop: 0, offsetLeft: 0 } );
		Object.defineProperty( window, 'visualViewport', { configurable: true, value: viewport } );
	}, [ width, height ] );
}

async function showKeyboard( page, height: number, offsetTop: number ) {
	await page.evaluate( ( [ h, top ] ) => {
		Object.assign( window.visualViewport!, { height: h, offsetTop: top } );
		window.visualViewport!.dispatchEvent( new Event( 'resize' ) );
	}, [ height, offsetTop ] );
}

async function within( locator, top: number, bottom: number ) {
	await expect.poll( async () => {
		const r = ( await locator.boundingBox() )!;
		return r.y >= top - 1 && r.y + r.height <= bottom + 1;
	} ).toBe( true );
}

for ( const viewport of LANDSCAPES ) {
	test.describe( `landscape ${ viewport.width }x${ viewport.height }`, () => {
		test.use( { viewport } );

		test( 'touch selection keeps the keyboard closed; renaming commits on the next tap', async ( { page } ) => {
			await page.goto( '/wp-admin/index.php?maestro_edit=1' );
			const posts = page.locator( '#menu-posts > a.menu-top' );
			await posts.tap();
			await expect( posts ).toBeFocused();
			const rename = page.locator( '.maestro-rename-input' );
			await expect( rename ).not.toBeFocused();
			await rename.tap();
			await rename.fill( 'Articles wide' );
			const child = page.locator( '#menu-posts .wp-submenu a' ).first();
			await child.tap();
			await expect( child ).toBeFocused();
			await expect( rename ).not.toBeFocused();
			await expect( posts.locator( '.wp-menu-name' ) ).toContainText( 'Articles wide' );
		} );

		for ( const kind of Object.keys( TRIGGERS ) ) {
			test( `${ kind } dialog fits its content inside the screen`, async ( { page } ) => {
				await page.goto( '/wp-admin/index.php?maestro_edit=1' );
				await page.locator( '#menu-posts > a.menu-top' ).tap();
				await page.locator( TRIGGERS[ kind ] ).tap();
				const dialog = page.locator( '.maestro-mobile-sheet' );
				await expect( dialog.getByRole( 'button', { name: 'Close dialog', exact: true } ) ).toBeFocused();
				await within( dialog, 0, viewport.height );
				const m = await dialog.evaluate( pop => {
					const body = pop.querySelector( '.maestro-mobile-body' ) as HTMLElement;
					return { height: pop.offsetHeight, max: parseFloat( pop.style.maxHeight ), body: body.offsetHeight, content: body.scrollHeight };
				} );
				expect( m.height ).toBeLessThanOrEqual( m.max + 1 );
				// No forced blank space: the scroll body is never taller than what it holds.
				expect( m.body ).toBeLessThanOrEqual( m.content + 1 );
			} );
		}
	} );
}

test.describe( 'landscape keyboard', () => {
	test.use( { viewport: { width: 667, height: 375 } } );

	test( 'typed group name and Close stay above a landscape keyboard without moving the page', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await stubVisualViewport( page, 667, 375 );
		await page.locator( '.maestro-profiles-btn' ).tap();
		const pop = page.locator( '.maestro-profiles-popover' );
		const input = pop.getByRole( 'textbox', { name: 'New group name' } );
		await expect( input ).not.toBeFocused();
		await input.tap();
		await input.fill( 'Sales' );
		const scrollY = await page.evaluate( () => window.scrollY );
		await showKeyboard( page, 190, 32 );
		await within( pop, 32, 222 );
		await within( pop.getByRole( 'button', { name: 'Close dialog', exact: true } ), 32, 222 );
		await within( input, 32, 222 );
		await expect( input ).toBeFocused();
		expect( await page.evaluate( () => document.body.style.overflow ) ).toBe( 'hidden' );
		expect( await page.evaluate( () => window.scrollY ) ).toBe( scrollY );
	} );

	test( 'the toolbar name field rises above a landscape keyboard and returns afterwards', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await stubVisualViewport( page, 667, 375 );
		await page.locator( '#menu-posts > a.menu-top' ).tap();
		const rename = page.locator( '.maestro-rename-input' );
		const toolbar = page.locator( '.maestro-toolbar' );
		await rename.tap();
		await showKeyboard( page, 190, 0 );
		await within( rename, 0, 190 );
		await within( toolbar, 0, 190 );
		await showKeyboard( page, 375, 0 );
		await page.locator( '#menu-posts > a.menu-top' ).tap();
		await expect.poll( async () => {
			const r = ( await toolbar.boundingBox() )!;
			return Math.round( r.y + r.height );
		} ).toBe( 375 );
	} );

	test( 'long group lists grow to the screen limit, then scroll with the header fixed', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await page.locator( '.maestro-profiles-btn' ).tap();
		const pop = page.locator( '.maestro-profiles-popover' );
		const input = pop.getByRole( 'textbox', { name: 'New group name' } );
		for ( const name of [ 'One', 'Two', 'Three', 'Four' ] ) {
			await input.tap();
			await input.fill( name );
			await pop.getByRole( 'button', { name: 'Add group', exact: true } ).tap();
		}
		const m = await pop.evaluate( node => {
			const body = node.querySelector( '.maestro-mobile-body' ) as HTMLElement;
			return { height: node.offsetHeight, max: parseFloat( node.style.maxHeight ), client: body.clientHeight, content: body.scrollHeight };
		} );
		expect( m.height ).toBeLessThanOrEqual( m.max + 1 );
		expect( m.content ).toBeGreaterThan( m.client );
		await within( pop, 0, 375 );
		const last = pop.locator( '.maestro-profile-name' ).last();
		await last.tap();
		await within( last, 0, 375 );
		await within( pop.getByRole( 'button', { name: 'Close dialog', exact: true } ), 0, 375 );
	} );
} );

test.describe( 'wide touch screen', () => {
	test.use( { viewport: { width: 1024, height: 768 } } );

	test( 'a touch tap selects without focusing the name field; a mouse click still does', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		const posts = page.locator( '#menu-posts > a.menu-top' );
		const rename = page.locator( '.maestro-rename-input' );
		await posts.tap();
		await expect( posts ).toBeFocused();
		await expect( rename ).not.toBeFocused();
		await page.locator( '#menu-media > a.menu-top' ).click();
		await expect( rename ).toBeFocused();
	} );

	test( 'a touch-opened dialog starts on Close; a mouse-opened one keeps its field', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		const trigger = page.locator( '.maestro-profiles-btn' );
		const dialog = page.getByRole( 'dialog', { name: 'Visibility groups' } );
		await trigger.tap();
		await expect( dialog.getByRole( 'button', { name: 'Close dialog', exact: true } ) ).toBeFocused();
		await page.keyboard.press( 'Escape' );
		await expect( dialog ).toHaveCount( 0 );
		await trigger.click();
		await expect( dialog.getByRole( 'textbox', { name: 'New group name' } ) ).toBeFocused();
	} );

	for ( const kind of [ 'icon', 'vis' ] ) {
		test( `a touch-opened ${ kind } dialog does not focus a text field`, async ( { page } ) => {
			await page.goto( '/wp-admin/index.php?maestro_edit=1' );
			await page.locator( '#menu-posts > a.menu-top' ).tap();
			await page.locator( TRIGGERS[ kind ] ).tap();
			await expect( page.locator( '.maestro-popover' ) ).toBeVisible();
			await expect.poll( () => page.evaluate( () => {
				const a = document.activeElement as HTMLElement;
				return !! a.closest( '.maestro-popover' ) && ! a.matches( 'input[type="text"], input[type="search"], input:not([type])' );
			} ) ).toBe( true );
			// A hardware keyboard can still Tab either way without leaving the dialog.
			for ( const key of [ 'Shift+Tab', 'Tab', 'Tab' ] ) {
				await page.keyboard.press( key );
				expect( await page.evaluate( () => !! document.activeElement!.closest( '.maestro-popover' ) ), key ).toBe( true );
			}
		} );
	}
} );

test( 'adding and deleting a group leaves focus on Close, not a text field', async ( { page } ) => {
	await page.goto( '/wp-admin/index.php?maestro_edit=1' );
	await page.locator( '.maestro-profiles-btn' ).tap();
	const pop = page.locator( '.maestro-profiles-popover' );
	const close = pop.getByRole( 'button', { name: 'Close dialog', exact: true } );
	const input = pop.getByRole( 'textbox', { name: 'New group name' } );
	const add = pop.getByRole( 'button', { name: 'Add group', exact: true } );
	// An empty name is an explicit error the person has to correct by typing.
	await add.tap();
	await expect( input ).toBeFocused();
	await input.fill( 'Support' );
	await add.tap();
	await expect( close ).toBeFocused();
	page.once( 'dialog', d => d.accept() );
	await pop.getByRole( 'button', { name: 'Delete Support', exact: true } ).tap();
	await expect( pop.locator( '.maestro-profile' ) ).toHaveCount( 0 );
	await expect( close ).toBeFocused();
} );

test( 'resizing an open dialog across layouts keeps one header and restores scrolling', async ( { page } ) => {
	await page.setViewportSize( { width: 1000, height: 900 } );
	await page.goto( '/wp-admin/index.php?maestro_edit=1' );
	const trigger = page.locator( '.maestro-profiles-btn' );
	await trigger.click();
	const sheet = page.locator( '.maestro-mobile-sheet' );
	const counts = () => sheet.evaluate( pop => [ '.maestro-mobile-header', '.maestro-mobile-body', '.maestro-dialog-close', '.maestro-settings-title' ]
		.map( sel => pop.querySelectorAll( sel ).length ) );
	await page.setViewportSize( { width: 375, height: 812 } );
	await expect( sheet ).toBeVisible();
	await page.setViewportSize( { width: 812, height: 375 } );
	await within( sheet, 0, 375 );
	expect( await counts() ).toEqual( [ 1, 1, 1, 1 ] );
	await page.keyboard.press( 'Escape' );
	await expect( sheet ).toHaveCount( 0 );
	await expect( trigger ).toBeFocused();
	expect( await page.evaluate( () => [ document.body.style.overflow, document.documentElement.style.overflow ] ) ).not.toContain( 'hidden' );
	await trigger.tap();
	await expect( sheet ).toBeVisible();
	expect( await counts() ).toEqual( [ 1, 1, 1, 1 ] );
	await sheet.getByRole( 'button', { name: 'Close dialog', exact: true } ).tap();
	await expect( sheet ).toHaveCount( 0 );
	expect( await page.evaluate( () => document.body.style.overflow ) ).not.toBe( 'hidden' );
} );

test.describe( 'people in Visibility', () => {
	const LOGIN = 'maestro_mobile_person';
	const NAME = 'Pat Phone';
	const wp = ( args: string[] ) => {
		try {
			execFileSync( 'npx', [ 'wp-env', 'run', 'tests-cli', 'wp', ...args ], { stdio: 'ignore' } );
		} catch ( e ) {
			// create-when-present / delete-when-absent both exit non-zero; both fine.
		}
	};
	test.beforeAll( () => wp( [ 'user', 'create', LOGIN, `${ LOGIN }@example.com`, '--role=editor', `--display_name=${ NAME }`, '--user_pass=password' ] ) );
	test.afterAll( () => wp( [ 'user', 'delete', LOGIN, '--yes' ] ) );

	test( 'adding and removing a person leaves focus on Close, not the search field', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await page.locator( '#menu-posts > a.menu-top' ).tap();
		await page.locator( '.maestro-vis-btn' ).tap();
		const pop = page.locator( '.maestro-vis-popover' );
		const close = pop.getByRole( 'button', { name: 'Close dialog', exact: true } );
		const group = pop.locator( '.maestro-vis-own-users' );
		const search = group.locator( '.maestro-user-search' );
		await search.tap();
		await search.fill( 'Pat' );
		const result = group.locator( '.maestro-user-result' ).filter( { hasText: NAME } ).first();
		await expect( result ).toBeVisible( { timeout: 15000 } );
		await result.tap();
		const chip = group.locator( '.maestro-user-chip' );
		await expect( chip ).toContainText( NAME );
		await expect( close ).toBeFocused();
		await chip.getByRole( 'button' ).tap();
		await expect( chip ).toHaveCount( 0 );
		await expect( close ).toBeFocused();
		await expect( pop ).toBeVisible();
	} );
} );
