/**
 * Unit tests for the fill-resolution policy in generate-bootstrap-icons.mjs.
 *
 * RED phase: these tests will fail until the generator exports
 * resolveIcon, CURATED, SYNONYM_FILL, and bakeDataUri, and is
 * refactored to be side-effect-free on import.
 *
 * Uses node:test + node:assert (built-in, zero new deps).
 * Imports via dynamic ESM import to avoid createRequire CJS interop issues
 * with .mjs generator files.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname( fileURLToPath( import.meta.url ) );
const generatorUrl = new URL( '../../bin/generate-bootstrap-icons.mjs', import.meta.url );

// Load module once via dynamic import — generator MUST be side-effect-free
const mod = await import( generatorUrl.href );
const { resolveIcon, CURATED, SYNONYM_FILL, bakeDataUri } = mod;

// ---------------------------------------------------------------------------
// 1. resolveIcon: name WITH a -fill variant -> source:'fill'
// ---------------------------------------------------------------------------
test( 'resolveIcon("gear") -> source fill, file ends gear-fill.svg', () => {
	const result = resolveIcon( 'gear' );
	assert.equal( result.source, 'fill', 'gear has a -fill variant; source should be "fill"' );
	assert.ok( result.file.endsWith( '/gear-fill.svg' ), `expected file to end with /gear-fill.svg, got: ${ result.file }` );
	assert.ok( existsSync( result.file ), 'resolved fill file must exist on disk' );
} );

test( 'resolveIcon("house") -> source fill, file ends house-fill.svg', () => {
	const result = resolveIcon( 'house' );
	assert.equal( result.source, 'fill' );
	assert.ok( result.file.endsWith( '/house-fill.svg' ) );
	assert.ok( existsSync( result.file ) );
} );

// ---------------------------------------------------------------------------
// 2. resolveIcon: name in SYNONYM_FILL -> source:'synonym', file is synonym
// ---------------------------------------------------------------------------
test( 'resolveIcon("cart3") -> source synonym, file ends cart-fill.svg', () => {
	const result = resolveIcon( 'cart3' );
	assert.equal( result.source, 'synonym', 'cart3 has no cart3-fill.svg; should resolve via synonym to cart-fill' );
	assert.ok( result.file.endsWith( '/cart-fill.svg' ), `expected /cart-fill.svg, got: ${ result.file }` );
	assert.ok( existsSync( result.file ) );
} );

test( 'resolveIcon("files") -> source synonym, file ends file-earmark-fill.svg', () => {
	const result = resolveIcon( 'files' );
	assert.equal( result.source, 'synonym' );
	assert.ok( result.file.endsWith( '/file-earmark-fill.svg' ) );
	assert.ok( existsSync( result.file ) );
} );

test( 'resolveIcon("person-lock") -> source synonym, file ends person-fill-lock.svg', () => {
	const result = resolveIcon( 'person-lock' );
	assert.equal( result.source, 'synonym' );
	assert.ok( result.file.endsWith( '/person-fill-lock.svg' ) );
	assert.ok( existsSync( result.file ) );
} );

// ---------------------------------------------------------------------------
// 3. resolveIcon: name with NO fill and NO synonym -> source:'outline'
// ---------------------------------------------------------------------------
test( 'resolveIcon("speedometer2") -> source outline, file ends speedometer2.svg', () => {
	const result = resolveIcon( 'speedometer2' );
	assert.equal( result.source, 'outline', 'speedometer2 has no fill variant and no synonym; should stay outline' );
	assert.ok( result.file.endsWith( '/speedometer2.svg' ), `expected /speedometer2.svg, got: ${ result.file }` );
	assert.ok( existsSync( result.file ) );
} );

test( 'resolveIcon("sliders") -> source outline, file ends sliders.svg', () => {
	const result = resolveIcon( 'sliders' );
	assert.equal( result.source, 'outline' );
	assert.ok( result.file.endsWith( '/sliders.svg' ) );
	assert.ok( existsSync( result.file ) );
} );

// ---------------------------------------------------------------------------
// 4. SYNONYM_FILL: every target file actually exists on disk (hard check)
// ---------------------------------------------------------------------------
test( 'every SYNONYM_FILL target exists on disk', () => {
	assert.ok( SYNONYM_FILL && typeof SYNONYM_FILL === 'object', 'SYNONYM_FILL must be exported' );
	const ICON_DIR = resolve( __dirname, '../../node_modules/bootstrap-icons/icons' );
	for ( const [ src, target ] of Object.entries( SYNONYM_FILL ) ) {
		const file = resolve( ICON_DIR, target + '.svg' );
		assert.ok(
			existsSync( file ),
			`SYNONYM_FILL[${ src }] = "${ target }" — target file missing: ${ file }`
		);
	}
} );

// ---------------------------------------------------------------------------
// 5. No-silent-drop invariant: every CURATED name resolves to a file, once
// ---------------------------------------------------------------------------
test( 'every CURATED name resolves to an existing file, with no duplicates', () => {
	assert.ok( Array.isArray( CURATED ), 'CURATED must be an exported array' );
	assert.ok( CURATED.length >= 300, `CURATED should be near Dashicons parity (342); got ${ CURATED.length }` );
	assert.equal( new Set( CURATED ).size, CURATED.length, 'CURATED must not list a name twice' );

	const results = CURATED.map( ( name ) => ( { name, ...resolveIcon( name ) } ) );
	const missing = results.filter( ( r ) => ! existsSync( r.file ) );
	assert.equal(
		missing.length,
		0,
		`${ missing.length } resolved file(s) do not exist: ${ missing.map( ( r ) => r.name + ' -> ' + r.file ).join( ', ' ) }`
	);
} );

// ---------------------------------------------------------------------------
// 5b. The committed JSON is what the generator builds now
// ---------------------------------------------------------------------------
test( 'assets/icons-bootstrap.json is up to date with the generator', () => {
	const file = resolve( __dirname, '../../assets/icons-bootstrap.json' );
	const committed = JSON.parse( readFileSync( file, 'utf8' ) ).icons;
	assert.deepEqual( committed, mod.buildIcons(), 'Run `node bin/generate-bootstrap-icons.mjs` and commit the result.' );
} );

// ---------------------------------------------------------------------------
// 6. Data-URI shape: baked output starts 'data:image/svg+xml;base64,',
//    decoded SVG contains #a7aaad and no 'currentColor'
// ---------------------------------------------------------------------------
test( 'bakeDataUri("gear") returns a valid data-URI with baked grey and no currentColor', () => {
	assert.ok( typeof bakeDataUri === 'function', 'bakeDataUri must be exported' );
	const uri = bakeDataUri( 'gear' );
	assert.ok( uri.startsWith( 'data:image/svg+xml;base64,' ), `data-URI must start with data:image/svg+xml;base64, — got: ${ uri.slice( 0, 40 ) }` );

	const b64 = uri.replace( 'data:image/svg+xml;base64,', '' );
	const decoded = Buffer.from( b64, 'base64' ).toString( 'utf8' );
	assert.ok( decoded.includes( '#a7aaad' ), 'decoded SVG must contain the baked menu grey #a7aaad' );
	assert.ok( ! decoded.includes( 'currentColor' ), 'decoded SVG must NOT contain currentColor (should be replaced with #a7aaad)' );
} );

test( 'bakeDataUri returns valid data-URIs for all CURATED names', () => {
	for ( const name of CURATED ) {
		const uri = bakeDataUri( name );
		assert.ok(
			uri.startsWith( 'data:image/svg+xml;base64,' ),
			`bakeDataUri("${ name }") must return a valid data-URI; got: ${ uri.slice( 0, 40 ) }`
		);
	}
} );
