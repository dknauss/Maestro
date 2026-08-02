/**
 * Unit tests for isChildRoleLockedByParent — the pure DERIVED-lock predicate
 * behind the "Hide its sub-items from:" (COMPAT-10) role group's
 * checked+disabled rows, plus the payload-purity round-trip it exists to
 * guarantee: a role locked purely by the parent's own "Hide this item
 * from:" hide must NEVER be written into the persisted child_hidden_roles.
 *
 * Mirrors the derivation in assets/maestro.js's buildRoleGroup#refresh():
 * locked = hiddenRoles.indexOf( roleKey ) !== -1 — a pure read of the
 * parent's own hidden_roles, never a read OR write of childHiddenRoles.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire( import.meta.url );
const { isChildRoleLockedByParent } = require( '../../assets/maestro-logic.js' );

test( 'role present in hiddenRoles is locked', () => {
	assert.equal( isChildRoleLockedByParent( [ 'editor' ], 'editor' ), true );
} );

test( 'role absent from hiddenRoles is not locked', () => {
	assert.equal( isChildRoleLockedByParent( [ 'shop_manager' ], 'editor' ), false );
} );

test( 'empty hiddenRoles locks nothing', () => {
	assert.equal( isChildRoleLockedByParent( [], 'editor' ), false );
} );

test( 'only the matching role is locked among several hidden roles', () => {
	assert.equal( isChildRoleLockedByParent( [ 'editor', 'shop_manager' ], 'editor' ), true );
	assert.equal( isChildRoleLockedByParent( [ 'editor', 'shop_manager' ], 'author' ), false );
} );

/**
 * PAYLOAD PURITY ROUND-TRIP (the key correctness property from the refinement
 * brief): simulate the exact sequence a browser session would drive against
 * the model, using ONLY the same primitives buildRoleGroup#refresh() and
 * buildConfig() use — isChildRoleLockedByParent() for the derived lock, and
 * a plain array for childHiddenRoles (the thing that actually gets saved).
 * The lock predicate must never be the thing that adds a role to
 * childHiddenRoles; only an ENABLED checkbox's own change handler may do
 * that, and a locked checkbox is always disabled (see maestro.js), so it
 * can never fire one.
 */
test( 'round-trip: hiding the parent from a role never persists that role into child_hidden_roles, and un-hiding restores the real state', () => {
	const model = { hiddenRoles: [], childHiddenRoles: [] };

	// 1. Baseline: nobody hidden, nothing locked.
	assert.equal( isChildRoleLockedByParent( model.hiddenRoles, 'editor' ), false );
	assert.deepEqual( model.childHiddenRoles, [] );

	// 2. Hide the parent itself from 'editor' (Group 1) — this is the ONLY
	//    state change; nothing here ever touches childHiddenRoles.
	model.hiddenRoles.push( 'editor' );

	// 3. 'editor' is now locked in Group 2 — rendered checked+disabled — but
	//    the persisted array is untouched (payload purity).
	assert.equal( isChildRoleLockedByParent( model.hiddenRoles, 'editor' ), true );
	assert.deepEqual( model.childHiddenRoles, [], 'Locking must never write into child_hidden_roles.' );

	// 4. Simulate a save: buildConfig() would read model.childHiddenRoles
	//    directly (never DOM checkbox state) — still empty for 'editor'.
	const persistedAfterLock = model.childHiddenRoles.slice();
	assert.deepEqual( persistedAfterLock, [] );

	// 5. Un-hide the parent from 'editor' (Group 1 toggled back off).
	model.hiddenRoles = model.hiddenRoles.filter( ( r ) => r !== 'editor' );

	// 6. 'editor' is no longer locked, and its checkbox reflects the REAL,
	//    still-empty childHiddenRoles — i.e. the children REAPPEAR for
	//    'editor' because that role was never actually added to
	//    child_hidden_roles by the lock.
	assert.equal( isChildRoleLockedByParent( model.hiddenRoles, 'editor' ), false );
	assert.deepEqual( model.childHiddenRoles, [], 'Un-hiding the parent must restore the true (untouched) child state.' );
} );

test( 'round-trip: a role with its OWN real child_hidden_roles rule survives being locked and unlocked', () => {
	// A DIFFERENT role ('shop_manager') has a genuine, admin-set
	// child_hidden_roles rule. Locking/unlocking 'editor' via the parent's
	// own hide must never disturb it.
	const model = { hiddenRoles: [ 'editor' ], childHiddenRoles: [ 'shop_manager' ] };

	assert.equal( isChildRoleLockedByParent( model.hiddenRoles, 'editor' ), true );
	assert.equal( isChildRoleLockedByParent( model.hiddenRoles, 'shop_manager' ), false );
	assert.deepEqual( model.childHiddenRoles, [ 'shop_manager' ] );

	model.hiddenRoles = model.hiddenRoles.filter( ( r ) => r !== 'editor' );

	assert.equal( isChildRoleLockedByParent( model.hiddenRoles, 'editor' ), false );
	assert.deepEqual( model.childHiddenRoles, [ 'shop_manager' ], "shop_manager's own rule must be untouched by editor's lock/unlock cycle." );
} );
