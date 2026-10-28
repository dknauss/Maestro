/**
 * Unit tests for separatorsCoreDrops and separatorsHiddenWith: the rule core
 * applies to separators on render, and the trimmed separators a Remove takes
 * with it so they cannot reappear in the same place.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire( import.meta.url );
const { separatorsCoreDrops, separatorsHiddenWith } = require( '../../assets/maestro-logic.js' );

const set = ( ...slugs ) => Object.fromEntries( slugs.map( s => [ s, true ] ) );
const SEPS = set( 's1', 's2', 's3' );

test( 'separatorsCoreDrops: a well-formed menu drops nothing', () => {
	assert.deepEqual( separatorsCoreDrops( [ 's1', 'a', 's2', 'b' ], SEPS ), [] );
} );

test( 'separatorsCoreDrops: the second of two adjacent separators goes', () => {
	assert.deepEqual( separatorsCoreDrops( [ 'a', 's1', 's2', 'b' ], SEPS ), [ 's2' ] );
	assert.deepEqual( separatorsCoreDrops( [ 'a', 's1', 's2', 's3', 'b' ], SEPS ), [ 's2', 's3' ] );
} );

test( 'separatorsCoreDrops: a separator left at the end goes', () => {
	assert.deepEqual( separatorsCoreDrops( [ 'a', 'b', 's1' ], SEPS ), [ 's1' ] );
	// Core trims adjacency first, so only one trailing separator is left to drop.
	assert.deepEqual( separatorsCoreDrops( [ 'a', 's1', 's2' ], SEPS ), [ 's2', 's1' ] );
} );

test( 'separatorsCoreDrops: a leading separator stays, as in core', () => {
	assert.deepEqual( separatorsCoreDrops( [ 's1', 'a' ], SEPS ), [] );
} );

test( 'separatorsHiddenWith: takes the trimmed neighbours on either side', () => {
	const order = [ 'a', 's1', 's2', 'b', 's3' ];
	assert.deepEqual( separatorsHiddenWith( 's1', order, set( 'a', 's1', 'b', 's3' ), SEPS ), [ 's2' ] );
	assert.deepEqual( separatorsHiddenWith( 's2', [ 'a', 's1', 's2', 'b' ], set( 'a', 's2', 'b' ), SEPS ), [ 's1' ] );
} );

test( 'separatorsHiddenWith: walks past unrendered items but stops at a rendered row', () => {
	// 'gone' is a stored item whose plugin is inactive: not rendered, so core
	// would still put s1 and s2 together.
	const order = [ 'a', 's1', 'gone', 's2', 'b', 's3' ];
	assert.deepEqual( separatorsHiddenWith( 's1', order, set( 'a', 's1', 'b', 's3' ), SEPS ), [ 's2' ] );
	assert.deepEqual( separatorsHiddenWith( 's3', order, set( 'a', 's1', 'b', 's3' ), SEPS ), [] );
} );

test( 'separatorsHiddenWith: a separator not in the order takes nothing', () => {
	assert.deepEqual( separatorsHiddenWith( 's9', [ 'a', 's1' ], set( 'a', 's1' ), SEPS ), [] );
} );
