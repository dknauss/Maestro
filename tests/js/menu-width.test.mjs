/**
 * Unit tests for Phase 28-03's pure menu-width helpers: bounding a requested
 * width, the CSS the live preview injects, and turning a pointer position into a
 * width for the edge drag.
 *
 * menuWidthCss() must stay byte-identical to PHP's Assets::menu_width_css(), so
 * the preview shows exactly what a reload will. Both suites assert the same
 * literal (EXPECTED_240 here, MenuWidthCssTest on the PHP side).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire( import.meta.url );
const { clampMenuWidth, menuWidthCss, menuWidthFromPointer } = require( '../../assets/maestro-logic.js' );

const BOUNDS = { min: 160, max: 320, default: 160 };

const EXPECTED_240 =
	'@media screen and (min-width: 961px){' +
	'body:not(.folded) #adminmenuback,body:not(.folded) #adminmenuwrap,body:not(.folded) #adminmenu,' +
	'body:not(.folded) #adminmenu .wp-has-current-submenu .wp-submenu{width:240px}' +
	'body:not(.rtl):not(.folded) #wpcontent,body:not(.rtl):not(.folded) #wpfooter{margin-left:240px}' +
	'body.rtl:not(.folded) #wpcontent,body.rtl:not(.folded) #wpfooter{margin-right:240px}' +
	'body:not(.rtl):not(.folded) #adminmenu .wp-not-current-submenu .wp-submenu{left:240px}' +
	'body.rtl:not(.folded) #adminmenu .wp-not-current-submenu .wp-submenu{right:240px}' +
	'}';

/* ---------- clampMenuWidth --------------------------------------------- */

test( 'clampMenuWidth: an in-range value passes through as an integer', () => {
	assert.equal( clampMenuWidth( 240, BOUNDS ), 240 );
	assert.equal( clampMenuWidth( '241', BOUNDS ), 241 );
	assert.equal( clampMenuWidth( 200.6, BOUNDS ), 201 );
} );

test( 'clampMenuWidth: out of range clamps, and the default comes back as null', () => {
	assert.equal( clampMenuWidth( 5000, BOUNDS ), 320 );
	// The floor is the default, and the sparse contract stores no default.
	assert.equal( clampMenuWidth( 100, BOUNDS ), null );
	assert.equal( clampMenuWidth( 160, BOUNDS ), null );
} );

test( 'clampMenuWidth: anything that is not a plain number is null', () => {
	for ( const v of [ '', 'wide', '200px', NaN, Infinity, null, undefined, true, [ 200 ] ] ) {
		assert.equal( clampMenuWidth( v, BOUNDS ), null, String( v ) );
	}
} );

/* ---------- menuWidthCss ------------------------------------------------ */

test( 'menuWidthCss: matches the PHP rule byte for byte', () => {
	assert.equal( menuWidthCss( 240 ), EXPECTED_240 );
} );

test( 'menuWidthCss: casts to an integer so no value can inject CSS', () => {
	assert.ok( menuWidthCss( '200px;}body{display:none' ).indexOf( 'display' ) === -1 );
	assert.ok( menuWidthCss( 199.7 ).indexOf( 'width:199px' ) !== -1 );
} );

/* ---------- menuWidthFromPointer ---------------------------------------- */

test( 'menuWidthFromPointer: LTR measures from the menu’s left edge', () => {
	assert.equal( menuWidthFromPointer( 250, { left: 0, right: 160 }, false, BOUNDS ), 250 );
	assert.equal( menuWidthFromPointer( 900, { left: 0, right: 160 }, false, BOUNDS ), 320 );
	assert.equal( menuWidthFromPointer( 40, { left: 0, right: 160 }, false, BOUNDS ), null );
} );

test( 'menuWidthFromPointer: RTL measures from the menu’s right edge', () => {
	assert.equal( menuWidthFromPointer( 1030, { left: 1120, right: 1280 }, true, BOUNDS ), 250 );
} );
