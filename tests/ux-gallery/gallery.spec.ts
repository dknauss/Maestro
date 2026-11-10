import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * UX state gallery: photographs each editor state in the UX lab at desktop,
 * tablet, and phone sizes, for people to look over side by side.
 *
 * Not a test suite. A state that cannot be reached at some size is still
 * photographed as it stands and recorded with the error, so the gallery shows the
 * problem instead of hiding it. Run through bin/ux-gallery.sh (npm run ux:gallery),
 * which starts the lab and builds ux-gallery/index.html from states.json and the
 * per-shot records in ux-gallery/shots/.
 */

const OUT = process.env.MAESTRO_GALLERY_DIR || path.join( process.cwd(), 'ux-gallery' );

const VIEWPORTS = [
	{ id: 'desktop', label: 'Desktop', width: 1440, height: 900, touch: false },
	{ id: 'tablet', label: 'Tablet', width: 820, height: 1180, touch: true },
	{ id: 'phone', label: 'Phone', width: 390, height: 844, touch: true },
] as const;

type Step = ( page: Page ) => Promise< void >;

const EDIT = '/wp-admin/index.php?maestro_edit=1';

async function openEditor( page: Page ): Promise< void > {
	await page.goto( EDIT );
	await expect( page.locator( '.maestro-toolbar' ) ).toBeVisible();
	await page.waitForSelector( '#adminmenu li.maestro-item' );
}

async function select( page: Page, liId: string ): Promise< void > {
	await openEditor( page );
	await page.locator( `#${ liId } > a.menu-top` ).click();
	await expect( page.locator( '.maestro-toolbar .maestro-panel' ) ).toBeVisible();
}

async function openFromToolbar( page: Page, button: string, popover: string ): Promise< void > {
	await openEditor( page );
	await page.locator( `.maestro-toolbar ${ button }` ).first().click();
	await expect( page.locator( popover ) ).toBeVisible();
}

type State = {
	id: string;
	title: string;
	note: string;
	tour?: boolean;
	// Sizes where the state does not exist by design, with the reason shown in the gallery.
	absent?: { viewports: string[]; reason: string };
	run: Step;
};

const STATES: State[] = [
	{
		id: 'menu',
		title: 'The saved menu',
		note: 'Not editing. Posts renamed to Articles, Shop moved up with a new icon, and an added separator.',
		run: async ( page ) => {
			await page.goto( '/wp-admin/index.php' );
			const toggle = page.locator( '#wp-admin-bar-menu-toggle' );
			if ( await toggle.isVisible() ) {
				await toggle.locator( 'a' ).click();
			}
			await expect( page.locator( '#adminmenu' ) ).toBeVisible();
		},
	},
	{
		id: 'edit-mode',
		title: 'Edit mode, nothing selected',
		note: 'The bottom toolbar and the menu ready to edit.',
		run: openEditor,
	},
	{
		id: 'item-selected',
		title: 'An item selected',
		note: 'Articles (Posts) selected: rename, icon, visibility, move, and reset controls.',
		run: ( page ) => select( page, 'menu-posts' ),
	},
	{
		id: 'deep-submenu',
		title: 'A long submenu',
		note: 'Shop selected, with ten submenu items.',
		run: ( page ) => select( page, 'toplevel_page_ux-shop' ),
	},
	{
		id: 'icon-picker',
		title: 'Icon picker',
		note: 'Opened from the selected item.',
		run: async ( page ) => {
			await select( page, 'menu-posts' );
			await page.locator( '.maestro-toolbar .maestro-icon-btn' ).click();
			await expect( page.locator( '.maestro-icon-popover' ) ).toBeVisible();
		},
	},
	{
		id: 'visibility',
		title: 'Visibility picker',
		note: 'Comments, hidden from authors and contributors.',
		run: async ( page ) => {
			await select( page, 'menu-comments' );
			await page.locator( '.maestro-toolbar .maestro-vis-btn' ).click();
			await expect( page.locator( '.maestro-vis-popover' ) ).toBeVisible();
		},
	},
	{
		id: 'profiles',
		title: 'Profiles',
		note: 'Two saved profiles: Writers and Shop staff.',
		run: ( page ) => openFromToolbar( page, '.maestro-profiles-btn', '.maestro-profiles-popover' ),
	},
	{
		id: 'preview',
		title: 'Preview as a role',
		note: 'The dialog for viewing the menu as another role.',
		run: ( page ) => openFromToolbar( page, '.maestro-preview-btn, .maestro-preview-toggle', '.maestro-preview-popover' ),
	},
	{
		id: 'settings',
		title: 'Settings',
		note: 'Menu width, and exporting or importing settings.',
		absent: {
			viewports: [ 'tablet', 'phone' ],
			reason: 'Hidden below 961px by design: the menu width applies only from there, and export and import are desk tasks.',
		},
		run: ( page ) =>
			openFromToolbar( page, '.maestro-settings-btn', '.maestro-settings-popover:not(.maestro-profiles-popover):not(.maestro-preview-popover)' ),
	},
	{
		id: 'tour',
		title: 'First-run tour',
		note: 'The first step of the guided tour.',
		tour: true,
		run: async ( page ) => {
			await page.goto( EDIT );
			await expect( page.locator( '.maestro-tour' ) ).toBeVisible();
		},
	},
];

// Each shot writes its own record: Playwright restarts the worker after a failure,
// so a list kept in memory would lose the shots taken before it.
test.beforeAll( () => {
	fs.mkdirSync( path.join( OUT, 'shots' ), { recursive: true } );
	fs.writeFileSync(
		path.join( OUT, 'states.json' ),
		JSON.stringify(
			{
				viewports: VIEWPORTS,
				states: STATES.map( ( { id, title, note, absent } ) => ( { id, title, note, absent } ) ),
			},
			null,
			'\t'
		)
	);
} );

for ( const state of STATES ) {
	for ( const viewport of VIEWPORTS ) {
		if ( state.absent?.viewports.includes( viewport.id ) ) {
			continue;
		}
		test( `${ state.id } at ${ viewport.id }`, async ( { browser } ) => {
			const context = await browser.newContext( {
				viewport: { width: viewport.width, height: viewport.height },
				deviceScaleFactor: 2,
				hasTouch: viewport.touch,
				isMobile: viewport.id === 'phone',
			} );
			if ( ! state.tour ) {
				await context.addInitScript( () => {
					try {
						window.localStorage.setItem( 'maestroFirstRunDone', '1' );
					} catch ( e ) {
						// Storage blocked: the tour may show.
					}
				} );
			}
			const page = await context.newPage();
			const file = `shots/${ state.id }--${ viewport.id }.jpg`;
			let error = '';
			try {
				await state.run( page );
				// Let popovers finish their open transition.
				await page.waitForTimeout( 400 );
			} catch ( e ) {
				// First line of the message, without the terminal colour codes.
				error = String( ( e as Error ).message || e )
					.replace( /\u001b\[[0-9;]*m/g, '' )
					.split( '\n' )[ 0 ];
			}
			await page.screenshot( { path: path.join( OUT, file ), type: 'jpeg', quality: 82 } );
			fs.writeFileSync(
				path.join( OUT, 'shots', `${ state.id }--${ viewport.id }.json` ),
				JSON.stringify( { state: state.id, viewport: viewport.id, file, error } )
			);
			await context.close();
		} );
	}
}
