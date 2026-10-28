/**
 * The editor files' build stamps must equal MAESTRO_VERSION, or every editor
 * would see the stale-files notice (assets/maestro-build-check.js).
 * bin/prep-release.sh bumps them; this catches a bump that missed one.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = ( f ) => readFileSync( new URL( '../../' + f, import.meta.url ), 'utf8' );
const version = read( 'maestro-menu-editor.php' ).match( /define\( 'MAESTRO_VERSION', '([0-9.]+)' \)/ )[ 1 ];

test( 'maestro.js states the plugin version', () => {
	assert.equal( read( 'assets/maestro.js' ).match( /window\.maestroBuild = '([0-9.]+)';/ )?.[ 1 ], version );
} );

test( 'maestro-logic.js states the plugin version', () => {
	assert.equal( read( 'assets/maestro-logic.js' ).match( /window\.maestroLogicBuild = '([0-9.]+)';/ )?.[ 1 ], version );
} );

test( 'maestro.css states the plugin version', () => {
	assert.equal( read( 'assets/maestro.css' ).match( /--maestro-build: "([0-9.]+)";/ )?.[ 1 ], version );
} );
