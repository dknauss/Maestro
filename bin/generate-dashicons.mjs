#!/usr/bin/env node
/**
 * Generate includes/icons-dashicons.php — every glyph in core's Dashicons font,
 * for the editor's icon picker.
 *
 * Core stopped adding Dashicons in WordPress 5.5, and the stylesheet is
 * identical from 6.4 (our minimum) through 7.1, so a static list is safe.
 * A few classes are aliases on one code point (share1, exerpt-view, ...); the
 * first name in stylesheet order wins so no glyph shows twice.
 * tests/integration/IconSetsTest.php checks the list against the running core.
 *
 * Run: node bin/generate-dashicons.mjs <path/to/wp-includes/css/dashicons.css>
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const OUT = resolve( dirname( fileURLToPath( import.meta.url ) ), '../includes/icons-dashicons.php' );

const src = process.argv[ 2 ];
if ( ! src ) {
	console.error( 'Usage: node bin/generate-dashicons.mjs <path/to/dashicons.css>' );
	process.exit( 1 );
}

const css     = readFileSync( src, 'utf8' );
const seen    = new Set();
const classes = [];
for ( const [ , selectors, glyph ] of css.matchAll( /((?:\.dashicons-[a-z0-9-]+:before,?\s*)+)\{\s*content:\s*"([^"]+)"/g ) ) {
	for ( const [ , name ] of selectors.matchAll( /\.(dashicons-[a-z0-9-]+):before/g ) ) {
		if ( ! seen.has( glyph ) ) {
			seen.add( glyph );
			classes.push( name );
		}
	}
}

const php = `<?php
/**
 * Every Dashicons glyph core ships, one class per glyph, for the icon picker.
 *
 * GENERATED — do not edit by hand. Run \`node bin/generate-dashicons.mjs
 * <path/to/wp-includes/css/dashicons.css>\` to regenerate.
 *
 * @package Maestro
 */

defined( 'ABSPATH' ) || exit;

return array(
${ classes.map( c => `\t'${ c }',` ).join( '\n' ) }
);
`;

writeFileSync( OUT, php, 'utf8' );
console.log( `Wrote ${ classes.length } dashicons to ${ OUT }` );
