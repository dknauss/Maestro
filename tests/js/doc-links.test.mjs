/**
 * Tests for the DOC-01 doc-link checker.
 *
 * Two suites:
 *   1. Detection-logic tests against scanText() with inline fixtures — these
 *      PASS as soon as the checker is implemented correctly (they prove the
 *      parser is correct).
 *   2. Strict contract: findOffenders() must return [] — this FAILS until plan
 *      08-02 converts all bare path refs to markdown links (the RED baseline).
 *
 * Uses node:test + node:assert/strict (built-in, zero new deps).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname( fileURLToPath( import.meta.url ) );
const repoRoot = resolve( __dirname, '../..' );

const mod = await import( '../../bin/check-doc-links.mjs' );
const { scanText, findOffenders, CORE_EXCLUDE, STALE_REMAP } = mod;

// ---------------------------------------------------------------------------
// Helper: build a fake doc path relative to the repo root
// ---------------------------------------------------------------------------
const fakeDoc = resolve( repoRoot, 'README.md' );

// ---------------------------------------------------------------------------
// 1. Bare inline-code ref to a real file IS flagged
// ---------------------------------------------------------------------------
test( 'scanText: bare inline-code ref to a real file is an offender', () => {
	// package.json exists at the repo root; it's a real file the checker can resolve.
	const text = 'See `package.json` for the scripts.';
	const results = scanText( text, fakeDoc, repoRoot );
	const tokens = results.map( ( r ) => r.token );
	assert.ok(
		tokens.includes( 'package.json' ),
		`Expected 'package.json' to be flagged; got: ${ JSON.stringify( tokens ) }`
	);
} );

// ---------------------------------------------------------------------------
// 2. Same ref already wrapped in a markdown link is NOT flagged
// ---------------------------------------------------------------------------
test( 'scanText: ref inside a markdown link is NOT an offender', () => {
	const text = 'See [`package.json`](package.json) for the scripts.';
	const results = scanText( text, fakeDoc, repoRoot );
	const tokens = results.map( ( r ) => r.token );
	assert.ok(
		! tokens.includes( 'package.json' ),
		`Expected 'package.json' (already linked) to be skipped; got: ${ JSON.stringify( tokens ) }`
	);
} );

// ---------------------------------------------------------------------------
// 3. Ref inside a fenced code block is NOT flagged
// ---------------------------------------------------------------------------
test( 'scanText: ref inside a fenced code block is NOT an offender', () => {
	const text = '```bash\npackage.json\n```\nSee `README.md` for details.';
	const results = scanText( text, fakeDoc, repoRoot );
	const tokens = results.map( ( r ) => r.token );
	// package.json inside the fence should not appear; README.md (bare, exists) should appear
	assert.ok(
		! tokens.includes( 'package.json' ),
		`package.json inside fence must NOT be flagged; got: ${ JSON.stringify( tokens ) }`
	);
} );

// ---------------------------------------------------------------------------
// 4. CORE_EXCLUDE token is NOT flagged
// ---------------------------------------------------------------------------
test( 'scanText: CORE_EXCLUDE token is NOT an offender', () => {
	const excludedTokens = [ ...CORE_EXCLUDE ];
	assert.ok( excludedTokens.length > 0, 'CORE_EXCLUDE must not be empty' );

	// Use 'common.js' as the representative excluded token
	const text = 'WordPress re-applies `common.js` on each page load.';
	const results = scanText( text, fakeDoc, repoRoot );
	const tokens = results.map( ( r ) => r.token );
	assert.ok(
		! tokens.includes( 'common.js' ),
		`Expected 'common.js' (CORE_EXCLUDE) to be skipped; got: ${ JSON.stringify( tokens ) }`
	);
} );

// ---------------------------------------------------------------------------
// 5. STALE_REMAP token IS flagged (resolves via remap, not literal path)
// ---------------------------------------------------------------------------
test( 'scanText: STALE_REMAP token is an offender with remapped resolvedPath', () => {
	// 'maestro.php' does not exist literally, but STALE_REMAP maps it to
	// 'maestro-menu-editor.php' which does exist.
	const text = 'The main file is `maestro.php`.';
	const results = scanText( text, fakeDoc, repoRoot );
	const match = results.find( ( r ) => r.token === 'maestro.php' );
	assert.ok(
		match !== undefined,
		`Expected 'maestro.php' (STALE_REMAP) to be flagged; got: ${ JSON.stringify( results.map( ( r ) => r.token ) ) }`
	);
	assert.ok(
		match.resolvedPath.endsWith( 'maestro-menu-editor.php' ),
		`Expected resolvedPath to end with 'maestro-menu-editor.php'; got: ${ match.resolvedPath }`
	);
	assert.equal(
		match.reason,
		'stale-path',
		`Expected reason 'stale-path'; got: ${ match.reason }`
	);
} );

// ---------------------------------------------------------------------------
// 6. Ref inside an image `![alt](path)` is NOT flagged
// ---------------------------------------------------------------------------
test( 'scanText: ref inside an image alt or href is NOT an offender', () => {
	// The backtick ref is inside the image alt text — not a standalone inline-code span.
	// This is unusual but tests the image-exclusion guard.
	const text = 'Banner: ![](.wordpress-org/banner-1544x500.png)';
	const results = scanText( text, fakeDoc, repoRoot );
	const tokens = results.map( ( r ) => r.token );
	// The image path itself is not a backtick span, so nothing to flag here.
	// Primary check: image href paths don't get treated as bare code refs.
	assert.ok(
		! tokens.includes( '.wordpress-org/banner-1544x500.png' ),
		`Image href must NOT be flagged as a bare ref; got: ${ JSON.stringify( tokens ) }`
	);
} );

// ---------------------------------------------------------------------------
// 7. Token with no file extension is NOT flagged
// ---------------------------------------------------------------------------
test( 'scanText: inline code without an extension is NOT an offender', () => {
	const text = 'Run `npm` or `node` to install.';
	const results = scanText( text, fakeDoc, repoRoot );
	const tokens = results.map( ( r ) => r.token );
	assert.ok(
		! tokens.includes( 'npm' ) && ! tokens.includes( 'node' ),
		`Tokens without extensions must NOT be flagged; got: ${ JSON.stringify( tokens ) }`
	);
} );

// ---------------------------------------------------------------------------
// 8. Offender shape is correct
// ---------------------------------------------------------------------------
test( 'scanText: offender object has required fields', () => {
	const text = 'See `package.json` for scripts.';
	const results = scanText( text, fakeDoc, repoRoot );
	const hit = results.find( ( r ) => r.token === 'package.json' );
	assert.ok( hit !== undefined, 'Expected package.json offender' );
	assert.ok( typeof hit.file === 'string', 'offender.file must be a string' );
	assert.ok( typeof hit.line === 'number', 'offender.line must be a number' );
	assert.ok( typeof hit.token === 'string', 'offender.token must be a string' );
	assert.ok( typeof hit.resolvedPath === 'string', 'offender.resolvedPath must be a string' );
	assert.ok( typeof hit.reason === 'string', 'offender.reason must be a string' );
} );

// ---------------------------------------------------------------------------
// 9. STRICT CONTRACT: findOffenders() returns [] (GREEN gate for 08-02).
//    This FAILS now because real bare path refs exist in the in-scope docs.
//    That failure IS the intended RED state for DOC-01.
// ---------------------------------------------------------------------------
test( 'findOffenders() returns [] — all in-scope doc refs are linked (GREEN gate for 08-02)', () => {
	const offenders = findOffenders( repoRoot );
	assert.ok( Array.isArray( offenders ), 'findOffenders() must return an array' );
	assert.deepEqual(
		offenders,
		[],
		`Expected no offenders, but found ${ offenders.length }:\n` +
		offenders.map( ( o ) => `  ${ o.file }:${ o.line }  \`${ o.token }\`` ).join( '\n' )
	);
} );
