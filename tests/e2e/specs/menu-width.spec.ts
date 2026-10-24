import { test, expect } from '../fixtures';
import { execFileSync } from 'child_process';

/**
 * Phase 28-03 — the menu-width controls: the Settings dialog field and the
 * handle on the menu's edge.
 *
 * The assertion that matters most is the ordinary admin page after a reload:
 * that is the difference between this feature and a CSS tweak inside edit mode.
 */

function wp( args: string[] ): string {
	try {
		return execFileSync( 'npx', [ 'wp-env', 'run', 'tests-cli', 'wp', ...args ], {
			encoding: 'utf8',
			stdio: [ 'ignore', 'pipe', 'ignore' ],
		} ).trim();
	} catch ( e ) {
		// `option delete` / `pluck` on an absent value exits non-zero.
		return '';
	}
}

const SAVE = ( url: string ) => url.includes( '/maestro/v1/config' );

// Waits for the save that drops the width, not just the next save: an earlier
// change may already have one queued.
function savedWithoutWidth( page ) {
	return page.waitForResponse( ( r ) =>
		SAVE( r.url() ) && r.request().method() === 'POST' && r.ok() &&
		! ( 'menu_width' in ( r.request().postDataJSON()?.config ?? {} ) )
	);
}

async function menuWidth( page ) {
	return page.evaluate( () => Math.round( document.getElementById( 'adminmenuwrap' )!.getBoundingClientRect().width ) );
}

async function openSettings( page ) {
	await page.locator( '.maestro-toolbar .maestro-settings-btn' ).click();
	const dialog = page.getByRole( 'dialog', { name: 'Settings', exact: true } );
	await expect( dialog ).toBeVisible();
	return dialog;
}

test.describe( 'Phase 28-03 — menu width controls', () => {
	test.beforeEach( async ( { page } ) => {
		await page.setViewportSize( { width: 1280, height: 900 } );
	} );

	test.afterEach( () => {
		wp( [ 'option', 'delete', 'maestro_e2e_wide_menu' ] );
	} );

	test( 'the field previews live, saves, and applies on an ordinary page after reload', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		const dialog = await openSettings( page );

		await expect( dialog.getByText( 'Using the WordPress default (160px).' ) ).toBeVisible();
		// Opened from the toolbar's right zone, the dialog must stay on screen
		// rather than push the page into a sideways scroll.
		expect(
			await page.evaluate( () => document.documentElement.scrollWidth <= document.documentElement.clientWidth )
		).toBe( true );
		await expect( dialog.getByRole( 'button', { name: 'Use default' } ) ).toBeDisabled();

		const saved = page.waitForResponse( ( r ) => SAVE( r.url() ) && r.request().method() === 'POST' && r.ok() );
		await dialog.getByLabel( 'Menu width in pixels' ).fill( '240' );

		// Live, before the save lands: the menu and the toolbar both move.
		await expect.poll( () => menuWidth( page ) ).toBe( 240 );
		await expect
			.poll( () =>
				page.evaluate( () => Math.round( document.querySelector( '.maestro-toolbar' )!.getBoundingClientRect().left ) )
			)
			.toBe( 240 );
		await expect( dialog.getByRole( 'slider', { name: 'Menu width' } ) ).toHaveValue( '240' );

		expect( ( await saved ).request().postDataJSON().config.menu_width ).toBe( 240 );

		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		expect( await menuWidth( page ) ).toBe( 240 );

		await page.goto( '/wp-admin/edit.php' );
		expect( await menuWidth( page ) ).toBe( 240 );

		// Folding still works at a custom width.
		await page.evaluate( () => document.body.classList.add( 'folded' ) );
		expect( await menuWidth( page ) ).toBe( 36 );
	} );

	test( 'the slider is keyboard-operable and Use default clears the width', async ( { page } ) => {
		wp( [ 'eval', "update_option( 'maestro_config', array( 'menu_width' => 200 ), false );" ] );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		const dialog = await openSettings( page );

		const slider = dialog.getByRole( 'slider', { name: 'Menu width' } );
		await expect( slider ).toBeFocused();
		await expect( slider ).toHaveAttribute( 'aria-valuetext', '200 pixels' );
		await page.keyboard.press( 'ArrowRight' );
		await expect.poll( () => menuWidth( page ) ).toBe( 201 );

		const saved = savedWithoutWidth( page );
		await dialog.getByRole( 'button', { name: 'Use default' } ).click();
		await expect.poll( () => menuWidth( page ) ).toBe( 160 );
		await saved;

		// Escape closes and returns focus to the toolbar button.
		await page.keyboard.press( 'Escape' );
		await expect( dialog ).toHaveCount( 0 );
		await expect( page.locator( '.maestro-toolbar .maestro-settings-btn' ) ).toBeFocused();
	} );

	test( 'the edge handle resizes by drag and by keyboard', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		const handle = page.getByRole( 'separator', { name: 'Resize menu' } );
		await expect( handle ).toBeVisible();
		await expect( handle ).toHaveAttribute( 'aria-valuenow', '160' );

		const box = ( await handle.boundingBox() )!;
		await page.mouse.move( box.x + box.width / 2, box.y + 100 );
		await page.mouse.down();
		await page.mouse.move( 260, box.y + 100, { steps: 5 } );
		await page.mouse.up();
		await expect.poll( () => menuWidth( page ) ).toBe( 260 );
		await expect( handle ).toHaveAttribute( 'aria-valuenow', '260' );

		await handle.focus();
		await page.keyboard.press( 'Shift+ArrowLeft' );
		await expect.poll( () => menuWidth( page ) ).toBe( 240 );
		await page.keyboard.press( 'End' );
		await expect.poll( () => menuWidth( page ) ).toBe( 320 );

		const saved = savedWithoutWidth( page );
		await page.keyboard.press( 'Home' );
		await expect.poll( () => menuWidth( page ) ).toBe( 160 );
		await saved;
	} );

	test( 'Reset Item leaves the width alone', async ( { page } ) => {
		wp( [ 'eval', "update_option( 'maestro_config', array( 'menu_width' => 240, 'items' => array( 'edit.php' => array( 'title' => 'Articles' ) ) ), false );" ] );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		await page.locator( '#menu-posts > a.menu-top' ).click();
		const saved = page.waitForResponse( ( r ) => SAVE( r.url() ) && r.request().method() === 'POST' && r.ok() );
		await page.locator( '.maestro-toolbar .maestro-reset-item' ).click();
		const config = ( await saved ).request().postDataJSON().config;

		expect( config.menu_width ).toBe( 240 );
		expect( await menuWidth( page ) ).toBe( 240 );
	} );

	test( 'when another plugin forces the width, the dialog says so', async ( { page } ) => {
		wp( [ 'option', 'update', 'maestro_e2e_wide_menu', '200' ] );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		const dialog = await openSettings( page );

		await dialog.getByLabel( 'Menu width in pixels' ).fill( '260' );
		await expect( dialog.getByText( /Another plugin sets the menu width \(200px\)/ ) ).toBeVisible();
		expect( await menuWidth( page ) ).toBe( 200 );
	} );

	test( 'when another plugin forces the width, the edge handle saves nothing', async ( { page } ) => {
		wp( [ 'option', 'update', 'maestro_e2e_wide_menu', '200' ] );
		const posts: string[] = [];
		page.on( 'request', ( r ) => { if ( SAVE( r.url() ) && r.method() === 'POST' ) { posts.push( r.url() ); } } );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );

		const handle = page.getByRole( 'separator', { name: 'Resize menu' } );
		await handle.focus();
		await page.keyboard.press( 'Shift+ArrowRight' );
		await expect( handle ).toHaveAttribute( 'aria-valuenow', '200' ); // the width on screen, not one it cannot produce
		await expect( handle ).toHaveAttribute( 'aria-disabled', 'true' );
		await expect( page.locator( '#a11y-speak-polite' ) ).toContainText( /Another plugin sets the menu width/ );
		// Longer than the autosave debounce.
		await page.waitForTimeout( 800 );
		expect( posts ).toHaveLength( 0 );
	} );

	test( 'Reset All clears the width', async ( { page } ) => {
		wp( [ 'eval', "update_option( 'maestro_config', array( 'menu_width' => 240 ), false );" ] );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		expect( await menuWidth( page ) ).toBe( 240 );

		page.once( 'dialog', ( d ) => d.accept() );
		// Reset All reloads the page once the DELETE lands.
		const reloaded = page.waitForEvent( 'load' );
		await page.locator( '.maestro-toolbar .maestro-reset-all' ).click();
		await reloaded;
		expect( await menuWidth( page ) ).toBe( 160 );
		expect( wp( [ 'option', 'get', 'maestro_config', '--format=json' ] ) ).not.toContain( 'menu_width' );
	} );

	test( 'the edge handle is hidden below 961px', async ( { page } ) => {
		await page.setViewportSize( { width: 900, height: 900 } );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-width-handle' ) ).toBeHidden();
	} );

	for ( const width of [ 160, 240, 320 ] ) {
		test( `RTL toolbar clears the right menu at ${ width }px`, async ( { page } ) => {
			wp( [ 'option', 'update', 'maestro_config', JSON.stringify( { menu_width: width } ), '--format=json' ] );
			await page.goto( '/wp-admin/index.php?maestro_edit=1' );
			await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
			await page.evaluate( () => {
				document.body.classList.add( 'rtl' );
				document.documentElement.dir = 'rtl';
			} );
			await expect.poll( () => page.evaluate( () => {
				const bar = document.querySelector( '.maestro-toolbar' )!.getBoundingClientRect();
				return { left: Math.round( bar.left ), right: Math.round( bar.right ) };
			} ) ).toEqual( { left: 0, right: 1280 - width } );
		} );
	}

	// The width does nothing below 961px and export/import is a desk task, so
	// the gear goes with the edge handle there (Dan, 2026-10-23; #252). It follows a
	// resize without a reload, and a stored width is untouched by hiding it.
	test( 'the Settings gear is hidden below 961px and returns at 961px', async ( { page } ) => {
		wp( [ 'option', 'update', 'maestro_config', '{"menu_width":240}', '--format=json' ] );
		const gear = page.locator( '.maestro-toolbar .maestro-settings-btn' );
		for ( const width of [ 375, 782, 960 ] ) {
			await page.setViewportSize( { width, height: 900 } );
			await page.goto( '/wp-admin/index.php?maestro_edit=1' );
			await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
			await expect( gear, `at ${ width }px` ).toBeHidden();
		}
		await page.setViewportSize( { width: 961, height: 900 } );
		await expect( gear ).toBeVisible();
		await expect( await openSettings( page ) ).toBeVisible();
		expect( wp( [ 'option', 'get', 'maestro_config', '--format=json' ] ) ).toContain( '"menu_width":240' );
	} );

	// Rows the toolbar may take: two on a phone held upright, three only on
	// the smallest (320px) screens, where eight 36px controls cannot share one.
	for ( const [ width, maxRows ] of [ [ 320, 3 ], [ 375, 2 ], [ 600, 2 ] ] ) {
		test( `narrow toolbar lays the panel controls out in rows at ${ width }px`, async ( { page } ) => {
			await page.setViewportSize( { width, height: 900 } );
			await page.goto( '/wp-admin/index.php?maestro_edit=1' );
			await page.locator( '#menu-posts > a.menu-top' ).click();
			await expect( page.locator( '.maestro-panel' ) ).toBeVisible();

			const layout = await page.evaluate( () => {
				const visible = ( sel: string ) => Array.from( document.querySelectorAll( sel ) )
					.filter( ( n ) => ( n as HTMLElement ).offsetParent !== null )
					.map( ( n ) => n.getBoundingClientRect() );
				// Rows by centre line: Reset All is shorter than the icon
				// buttons, so their tops differ while their middles align.
				const rowsOf = ( rects: DOMRect[] ) => {
					const mids: number[] = [];
					rects.forEach( ( r ) => {
						const mid = ( r.top + r.bottom ) / 2;
						if ( ! mids.some( ( m ) => Math.abs( m - mid ) < 6 ) ) { mids.push( mid ); }
					} );
					return mids.length;
				};
				const panel = visible( '.maestro-panel button, .maestro-panel input' );
				const all = visible( '.maestro-toolbar button, .maestro-toolbar input' );
				return {
					panelControls: panel.length,
					panelRows: rowsOf( panel ),
					rows: rowsOf( all ),
					left: Math.min( ...all.map( ( r ) => r.left ) ),
					right: Math.max( ...all.map( ( r ) => r.right ) ),
					viewport: document.documentElement.clientWidth,
				};
			} );

			// Before the fix the panel was squeezed to one control's width and
			// every control took a row of its own.
			expect( layout.panelRows ).toBeLessThanOrEqual( Math.ceil( layout.panelControls / 2 ) );
			// The right zone no longer takes a row of its own: on a phone it
			// shares the panel's second row, which is what keeps the toolbar
			// from eating a third of the screen.
			expect( layout.rows ).toBeLessThanOrEqual( maxRows );
			expect( layout.left ).toBeGreaterThanOrEqual( 0 );
			expect( layout.right ).toBeLessThanOrEqual( layout.viewport );
		} );
	}

	test( 'in an RTL admin, untranslated English keeps its own direction', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
		await page.evaluate( () => {
			document.body.classList.add( 'rtl' );
			document.documentElement.dir = 'rtl';
		} );
		const dialog = await openSettings( page );

		const dirs = await dialog.evaluate( ( d ) => {
			const dir = ( sel: string ) => getComputedStyle( d.querySelector( sel )! ).direction;
			return {
				dialog: getComputedStyle( d ).direction,
				title: dir( '.maestro-settings-title' ),
				state: dir( '.maestro-width-state' ),
				hint: dir( '.maestro-width-hint' ),
			};
		} );
		// The page is RTL; the English strings inside it read left to right.
		expect( dirs ).toEqual( { dialog: 'rtl', title: 'ltr', state: 'ltr', hint: 'ltr' } );

		// A translated (RTL-script) string takes RTL from its own text.
		const arabic = await page.evaluate( () => {
			const n = document.querySelector( '.maestro-settings-title' )!;
			n.textContent = 'إعدادات القائمة';
			return getComputedStyle( n ).direction;
		} );
		expect( arabic ).toBe( 'rtl' );
	} );

	test( 'the tour counter keeps its digits in order in an RTL admin', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
		await page.evaluate( () => {
			document.body.classList.add( 'rtl' );
			document.documentElement.dir = 'rtl';
		} );
		await page.locator( '.maestro-toolbar .maestro-tour-help' ).click();
		const progress = page.locator( '.maestro-tour-progress' );
		await expect( progress ).toBeVisible();
		await expect( progress ).toHaveAttribute( 'dir', 'auto' );
		expect( await progress.evaluate( ( n ) => getComputedStyle( n ).direction ) ).toBe( 'ltr' );
	} );

	test( 'a width another plugin changes live updates the dialog and the handle', async ( { page } ) => {
		const posts: string[] = [];
		page.on( 'request', ( r ) => { if ( SAVE( r.url() ) && r.method() === 'POST' ) { posts.push( r.url() ); } } );
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		const handle = page.getByRole( 'separator', { name: 'Resize menu' } );
		const dialog = await openSettings( page );
		await expect( dialog.getByText( 'Using the WordPress default (160px).' ) ).toBeVisible();

		// What Keel's settings slider does while previewing: an !important width
		// applied after the page has loaded, with Maestro's editor already open.
		const takeOver = ( px: number | null ) => page.evaluate( ( w ) => {
			let s = document.getElementById( 'e2e-live-width' );
			if ( ! s ) {
				s = document.createElement( 'style' );
				s.id = 'e2e-live-width';
				document.head.appendChild( s );
			}
			s.textContent = w ? `#adminmenu,#adminmenuback,#adminmenuwrap{width:${ w }px !important}` : '';
		}, px );

		await takeOver( 220 );
		await expect( dialog.getByText( /Another plugin sets the menu width \(220px\)/ ) ).toBeVisible();
		await expect( handle ).toHaveAttribute( 'aria-disabled', 'true' );
		await expect( handle ).toHaveAttribute( 'aria-valuenow', '220' );
		await expect( page.locator( '.maestro-toolbar' ) ).toHaveCSS( 'left', '220px' );

		// Released while the dialog is open: Maestro's own width state comes back.
		await takeOver( null );
		await expect( dialog.getByText( 'Using the WordPress default (160px).' ) ).toBeVisible();
		await expect( handle ).toHaveAttribute( 'aria-disabled', 'false' );
		await expect( handle ).toHaveAttribute( 'aria-valuenow', '160' );

		// Taken over again, a drag on the handle saves nothing. (The drag ends
		// outside the dialog, which closes it like any outside click.)
		await takeOver( 220 );
		await expect( handle ).toHaveAttribute( 'aria-disabled', 'true' );
		const box = ( await handle.boundingBox() )!;
		await page.mouse.move( box.x + box.width / 2, box.y + 100 );
		await page.mouse.down();
		await page.mouse.move( 280, box.y + 100, { steps: 5 } );
		await page.mouse.up();
		await page.waitForTimeout( 800 );
		expect( posts ).toHaveLength( 0 );
		expect( await menuWidth( page ) ).toBe( 220 );
	} );

	test( 'a takeover that starts mid-drag stops the drag without saving the rest', async ( { page } ) => {
		await page.goto( '/wp-admin/index.php?maestro_edit=1' );
		const handle = page.getByRole( 'separator', { name: 'Resize menu' } );
		const box = ( await handle.boundingBox() )!;
		await page.mouse.move( box.x + box.width / 2, box.y + 100 );
		await page.mouse.down();
		await page.mouse.move( 200, box.y + 100, { steps: 3 } );
		await expect.poll( () => menuWidth( page ) ).toBe( 200 );

		await page.evaluate( () => {
			const s = document.createElement( 'style' );
			s.textContent = '#adminmenu,#adminmenuback,#adminmenuwrap{width:230px !important}';
			document.head.appendChild( s );
		} );
		const saved = page.waitForResponse( ( r ) => SAVE( r.url() ) && r.request().method() === 'POST' && r.ok() );
		await page.mouse.move( 300, box.y + 100, { steps: 5 } );
		await page.mouse.up();
		// The last width Maestro could actually show is what gets saved.
		expect( ( await saved ).request().postDataJSON().config.menu_width ).toBe( 200 );
		await expect( handle ).toHaveAttribute( 'aria-disabled', 'true' );
	} );
} );
