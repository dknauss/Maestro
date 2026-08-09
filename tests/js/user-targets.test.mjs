/**
 * Unit tests for ROLE-02's pure per-user target helpers — the axis mutation,
 * membership, and self-target predicates behind the visibility popover's
 * "Hide this item from [user(s)]" / "Hide its sub-items from [user(s)]"
 * sections.
 *
 * These live in maestro-logic.js rather than inline in the popover
 * deliberately: Phase 20 inlined an equivalent predicate in maestro.js while a
 * tested one already existed, which is the drift logged in
 * todos/pending/2026-08-02-child-role-lock-predicate-parity.md. The user axes
 * do not repeat that.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire( import.meta.url );
const {
	isUserTargeted,
	addUserTarget,
	removeUserTarget,
	userTargetIds,
	isSelfTarget,
} = require( '../../assets/maestro-logic.js' );

const ada = { id: 4, name: 'Ada' };
const grace = { id: 9, name: 'Grace' };

/* ---------- isUserTargeted ---------------------------------------------- */

test( 'isUserTargeted finds a targeted user by id', () => {
	assert.equal( isUserTargeted( [ ada, grace ], 9 ), true );
} );

test( 'isUserTargeted returns false for an untargeted user', () => {
	assert.equal( isUserTargeted( [ ada ], 9 ), false );
} );

test( 'isUserTargeted is empty-safe', () => {
	assert.equal( isUserTargeted( [], 1 ), false );
} );

test( 'isUserTargeted compares by id, not object identity', () => {
	// A re-render replaces the objects; membership must still hold.
	assert.equal( isUserTargeted( [ { id: 4, name: 'Ada' } ], 4 ), true );
} );

test( 'isUserTargeted coerces numeric strings', () => {
	// A DOM dataset attribute arrives as a string.
	assert.equal( isUserTargeted( [ ada ], '4' ), true );
} );

/* ---------- addUserTarget ----------------------------------------------- */

test( 'addUserTarget appends a new target', () => {
	assert.deepEqual( addUserTarget( [ ada ], grace ), [ ada, grace ] );
} );

test( 'addUserTarget adding an existing target is a no-op', () => {
	assert.deepEqual( addUserTarget( [ ada ], { id: 4, name: 'Ada' } ), [ ada ] );
} );

test( 'addUserTarget does not mutate the input list', () => {
	const original = [ ada ];
	addUserTarget( original, grace );
	assert.deepEqual( original, [ ada ] );
} );

test( 'addUserTarget normalises id to a number and name to a string', () => {
	const out = addUserTarget( [], { id: '7', name: 'Katherine' } );
	assert.strictEqual( out[ 0 ].id, 7 );
	assert.strictEqual( out[ 0 ].name, 'Katherine' );
} );

/* ---------- removeUserTarget -------------------------------------------- */

test( 'removeUserTarget drops the named target', () => {
	assert.deepEqual( removeUserTarget( [ ada, grace ], 4 ), [ grace ] );
} );

test( 'removeUserTarget removing the last target yields an empty list', () => {
	// buildConfig() must then omit the key entirely — the sparse contract.
	assert.deepEqual( removeUserTarget( [ ada ], 4 ), [] );
} );

test( 'removeUserTarget is a no-op for an untargeted id', () => {
	assert.deepEqual( removeUserTarget( [ ada ], 999 ), [ ada ] );
} );

test( 'removeUserTarget does not mutate the input list', () => {
	const original = [ ada, grace ];
	removeUserTarget( original, 4 );
	assert.deepEqual( original, [ ada, grace ] );
} );

/* ---------- userTargetIds ----------------------------------------------- */

test( 'userTargetIds reduces pairs to the stored id array', () => {
	assert.deepEqual( userTargetIds( [ ada, grace ] ), [ 4, 9 ] );
} );

test( 'userTargetIds on an empty axis is an empty array', () => {
	assert.deepEqual( userTargetIds( [] ), [] );
} );

/* ---------- isSelfTarget ------------------------------------------------ */

test( 'isSelfTarget is true for the acting user', () => {
	assert.equal( isSelfTarget( 4, 4 ), true );
} );

test( 'isSelfTarget is false for anyone else', () => {
	assert.equal( isSelfTarget( 4, 9 ), false );
} );

test( 'isSelfTarget coerces across string/number boundaries', () => {
	assert.equal( isSelfTarget( '4', 4 ), true );
} );

/* ---------- round-trip -------------------------------------------------- */

test( 'add then remove returns to the sparse empty state', () => {
	let axis = [];
	axis = addUserTarget( axis, ada );
	axis = addUserTarget( axis, grace );
	assert.deepEqual( userTargetIds( axis ), [ 4, 9 ] );

	axis = removeUserTarget( axis, 4 );
	axis = removeUserTarget( axis, 9 );
	assert.deepEqual( axis, [] );
	assert.deepEqual( userTargetIds( axis ), [] );
} );
