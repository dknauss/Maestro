/**
 * Unit tests for carrySeparators — keeps the stored state of separators the
 * editor did not render, so a full-replace save cannot silently erase them.
 *
 * A separator can be missing from the DOM without the user removing it: core
 * trims one that ends up adjacent to another (e.g. after a role hide empties
 * the group between them), and the editor leaves every separator unmanaged
 * when it cannot pair them with the model.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire( import.meta.url );
const { carrySeparators } = require( '../../assets/maestro-logic.js' );

const P = 'separator-maestro-';

function run( overrides ) {
	return carrySeparators( Object.assign( {
		domOrder:    [],
		domAdded:    [],
		storedOrder: [],
		storedAdded: [],
		known:       [],
		removed:     [],
		prefix:      P,
	}, overrides ) );
}

test( 'nothing unrendered: the DOM state is the whole answer', () => {
	assert.deepEqual(
		run( { domOrder: [ 'a', P + 'x', 'b' ], domAdded: [ P + 'x' ], storedOrder: [ 'a', P + 'x', 'b' ], storedAdded: [ P + 'x' ] } ),
		{ order: [ 'a', P + 'x', 'b' ], added: [ P + 'x' ] }
	);
} );

test( 'an unrendered added separator keeps its id and its stored place', () => {
	assert.deepEqual(
		run( { domOrder: [ 'a', 'b', 'c' ], storedOrder: [ 'a', 'b', P + 'x', 'c' ], storedAdded: [ P + 'x' ] } ),
		{ order: [ 'a', 'b', P + 'x', 'c' ], added: [ P + 'x' ] }
	);
} );

test( 'an unrendered core separator keeps its stored place', () => {
	assert.deepEqual(
		run( { domOrder: [ 'a', 'b' ], storedOrder: [ 'a', 'separator2', 'b' ], known: [ 'separator2' ] } ).order,
		[ 'a', 'separator2', 'b' ]
	);
} );

test( 'it follows its stored predecessor after the items were reordered', () => {
	assert.deepEqual(
		run( { domOrder: [ 'b', 'a', 'c' ], storedOrder: [ 'a', P + 'x', 'b', 'c' ], storedAdded: [ P + 'x' ] } ).order,
		[ 'b', 'a', P + 'x', 'c' ]
	);
} );

test( 'with no stored predecessor still present it goes first', () => {
	assert.deepEqual(
		run( { domOrder: [ 'b' ], storedOrder: [ 'gone', P + 'x', 'b' ], storedAdded: [ P + 'x' ] } ).order,
		[ P + 'x', 'b' ]
	);
} );

test( 'consecutive unrendered separators keep their relative order', () => {
	assert.deepEqual(
		run( { domOrder: [ 'a', 'b' ], storedOrder: [ 'a', 'separator1', P + 'x', 'b' ], storedAdded: [ P + 'x' ], known: [ 'separator1' ] } ).order,
		[ 'a', 'separator1', P + 'x', 'b' ]
	);
} );

test( 'a separator the user removed this session is not carried', () => {
	assert.deepEqual(
		run( { domOrder: [ 'a', 'b' ], storedOrder: [ 'a', P + 'x', 'separator2', 'b' ], storedAdded: [ P + 'x' ], known: [ 'separator2' ], removed: [ P + 'x', 'separator2' ] } ),
		{ order: [ 'a', 'b' ], added: [] }
	);
} );

test( 'a stored item that is not rendered is not carried: only separators are', () => {
	assert.deepEqual(
		run( { domOrder: [ 'a' ], storedOrder: [ 'a', 'hidden-item.php' ] } ).order,
		[ 'a' ]
	);
} );

test( 'inputs are not mutated', () => {
	const domOrder = [ 'a', 'b' ];
	const storedOrder = [ 'a', P + 'x', 'b' ];
	run( { domOrder, storedOrder, storedAdded: [ P + 'x' ] } );
	assert.deepEqual( domOrder, [ 'a', 'b' ] );
	assert.deepEqual( storedOrder, [ 'a', P + 'x', 'b' ] );
} );
