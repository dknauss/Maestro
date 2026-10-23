/**
 * Unit tests for the select-all role helpers behind Phase 29's
 * "All other roles" row (UX-14, #214):
 *
 * - selectAllRoleTargets() — which roles the control ticks: every role the
 *   editing user does not hold, and none that is locked by the parent.
 * - selectAllState()        — 'none' | 'some' | 'all' over those targets,
 *   which drives the tri-state checkbox (aria-checked="mixed").
 * - applySelectAll()        — the new stored set after ticking or clearing.
 *
 * Mirrors the use in assets/maestro.js's buildRoleGroup().
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire( import.meta.url );
const {
	selectAllRoleTargets,
	selectAllState,
	applySelectAll,
} = require( '../../assets/maestro-logic.js' );

const ROLES = [ 'administrator', 'editor', 'author', 'contributor', 'subscriber' ];
const never = () => false;

test( 'targets every role except the editing user\'s own', () => {
	assert.deepEqual(
		selectAllRoleTargets( ROLES, [ 'administrator' ], never ),
		[ 'editor', 'author', 'contributor', 'subscriber' ]
	);
} );

test( 'a user with several roles keeps every one of them', () => {
	assert.deepEqual(
		selectAllRoleTargets( ROLES, [ 'editor', 'author' ], never ),
		[ 'administrator', 'contributor', 'subscriber' ]
	);
} );

test( 'a user with no role on this site (a multisite super admin) targets every role', () => {
	assert.deepEqual( selectAllRoleTargets( ROLES, [], never ), ROLES );
} );

test( 'locked roles are never targets', () => {
	const locked = ( r ) => r === 'author' || r === 'subscriber';
	assert.deepEqual(
		selectAllRoleTargets( ROLES, [ 'administrator' ], locked ),
		[ 'editor', 'contributor' ]
	);
} );

test( 'a missing own-roles list or lock predicate is treated as empty', () => {
	assert.deepEqual( selectAllRoleTargets( ROLES ), ROLES );
	assert.deepEqual( selectAllRoleTargets( ROLES, null, null ), ROLES );
} );

test( 'targets follow the order of the role list', () => {
	assert.deepEqual(
		selectAllRoleTargets( [ 'subscriber', 'editor' ], [], never ),
		[ 'subscriber', 'editor' ]
	);
} );

test( 'state is none, some or all over the targets only', () => {
	const targets = [ 'editor', 'author' ];
	assert.equal( selectAllState( [], targets ), 'none' );
	assert.equal( selectAllState( [ 'editor' ], targets ), 'some' );
	assert.equal( selectAllState( [ 'editor', 'author' ], targets ), 'all' );
	// The user's own role, ticked by hand, is not a target and does not count.
	assert.equal( selectAllState( [ 'administrator' ], targets ), 'none' );
	assert.equal( selectAllState( [ 'administrator', 'editor', 'author' ], targets ), 'all' );
} );

test( 'with no targets the state is none', () => {
	assert.equal( selectAllState( [ 'editor' ], [] ), 'none' );
} );

test( 'ticking adds every missing target, keeping what was already there', () => {
	assert.deepEqual(
		applySelectAll( [ 'author' ], [ 'editor', 'author', 'subscriber' ], true ),
		[ 'author', 'editor', 'subscriber' ]
	);
} );

test( 'ticking keeps the user\'s own role if they had ticked it by hand', () => {
	assert.deepEqual(
		applySelectAll( [ 'administrator' ], [ 'editor' ], true ),
		[ 'administrator', 'editor' ]
	);
} );

test( 'clearing removes only the targets', () => {
	assert.deepEqual(
		applySelectAll( [ 'administrator', 'editor', 'author' ], [ 'editor', 'author' ], false ),
		[ 'administrator' ]
	);
} );

test( 'clearing never removes a locked role that is stored', () => {
	// 'author' is locked, so it is not a target; a stored entry for it stays.
	const locked = ( r ) => r === 'author';
	const targets = selectAllRoleTargets( ROLES, [ 'administrator' ], locked );
	assert.deepEqual( applySelectAll( [ 'author', 'editor' ], targets, false ), [ 'author' ] );
} );

test( 'ticking never writes a locked role into the set', () => {
	const locked = ( r ) => r === 'author';
	const targets = selectAllRoleTargets( ROLES, [ 'administrator' ], locked );
	const out = applySelectAll( [], targets, true );
	assert.equal( out.indexOf( 'author' ), -1 );
	assert.equal( out.indexOf( 'administrator' ), -1 );
} );

test( 'neither direction mutates the input set', () => {
	const set = [ 'editor' ];
	applySelectAll( set, [ 'editor', 'author' ], true );
	applySelectAll( set, [ 'editor', 'author' ], false );
	assert.deepEqual( set, [ 'editor' ] );
} );

test( 'a missing set is treated as empty', () => {
	assert.deepEqual( applySelectAll( undefined, [ 'editor' ], true ), [ 'editor' ] );
	assert.deepEqual( applySelectAll( null, [ 'editor' ], false ), [] );
	assert.equal( selectAllState( undefined, [ 'editor' ] ), 'none' );
} );

test( 'bulk selection refuses the whole change when it would exceed the role limit', () => {
	const set = [ 'editor' ];
	assert.equal( applySelectAll( set, [ 'editor', 'author', 'subscriber' ], true, 2 ), null );
	assert.deepEqual( set, [ 'editor' ] );
} );

test( 'bulk selection accepts exactly the server role limit', () => {
	const targets = Array.from( { length: 50 }, ( _, i ) => `role-${ i }` );
	assert.deepEqual( applySelectAll( [], targets, true, 50 ), targets );
} );

test( 'the role limit counts retained own and locked roles as well as new targets', () => {
	assert.equal( applySelectAll( [ 'administrator' ], [ 'editor', 'author' ], true, 2 ), null );
} );

test( 'clearing remains available even when the starting set is over the limit', () => {
	assert.deepEqual( applySelectAll( [ 'administrator', 'editor', 'author' ], [ 'editor', 'author' ], false, 2 ), [ 'administrator' ] );
} );
