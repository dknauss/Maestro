/**
 * Unit tests for Phase 27's pure hiding-profile helpers: the axis predicates
 * behind the Visibility popover's profile groups, the Profiles dialog's name
 * and ID rules, and the payload builder buildConfig() calls.
 *
 * Kept in maestro-logic.js so the popover calls a tested function rather than
 * an inline copy, the drift the role-lock and user-axis helpers both had.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire( import.meta.url );
const {
	hasOwnHide,
	isProfileAssigned,
	toggleProfile,
	nextProfileId,
	profileNameProblem,
	profileItemCount,
	buildProfilesPayload,
	carryProfileHides,
	diffItem,
	resetItem,
} = require( '../../assets/maestro-logic.js' );

/* ---------- hasOwnHide --------------------------------------------------- */

test( 'hasOwnHide is true for any one of the three own-item axes', () => {
	assert.equal( hasOwnHide( { hiddenRoles: [ 'editor' ] } ), true );
	assert.equal( hasOwnHide( { hiddenUsers: [ { id: 3, name: 'A' } ] } ), true );
	assert.equal( hasOwnHide( { hiddenProfiles: [ 'p_1' ] } ), true );
} );

test( 'hasOwnHide ignores the child axes and empty or absent lists', () => {
	assert.equal( hasOwnHide( { hiddenRoles: [], childHiddenRoles: [ 'editor' ], childHiddenProfiles: [ 'p_1' ] } ), false );
	assert.equal( hasOwnHide( {} ), false );
	assert.equal( hasOwnHide( null ), false );
} );

/* ---------- isProfileAssigned / toggleProfile ---------------------------- */

test( 'isProfileAssigned is sparse-safe and compares as strings', () => {
	assert.equal( isProfileAssigned( undefined, 'p_1' ), false );
	assert.equal( isProfileAssigned( [ 'p_1' ], 'p_1' ), true );
	assert.equal( isProfileAssigned( [ 'p_1' ], 'p_2' ), false );
} );

test( 'toggleProfile adds once and removes, never mutating its input', () => {
	const list = [ 'p_1' ];
	assert.deepEqual( toggleProfile( list, 'p_2', true ), [ 'p_1', 'p_2' ] );
	assert.deepEqual( toggleProfile( list, 'p_1', true ), [ 'p_1' ], 'Adding an assigned profile is a no-op.' );
	assert.deepEqual( toggleProfile( list, 'p_1', false ), [] );
	assert.deepEqual( toggleProfile( undefined, 'p_1', false ), [] );
	assert.deepEqual( list, [ 'p_1' ] );
} );

/* ---------- nextProfileId ------------------------------------------------ */

test( 'nextProfileId is one above the highest ID in use', () => {
	assert.equal( nextProfileId( [] ), 'p_1' );
	assert.equal( nextProfileId( [ { id: 'p_1' }, { id: 'p_7' }, { id: 'p_3' } ] ), 'p_8' );
} );

test( 'nextProfileId never reuses a number handed out earlier this session', () => {
	assert.equal( nextProfileId( [ { id: 'p_1' } ], 4 ), 'p_5' );
} );

test( 'nextProfileId ignores IDs outside the p_<n> shape', () => {
	assert.equal( nextProfileId( [ { id: 'p_01' }, { id: 'x_9' }, { id: 'p_2' } ] ), 'p_3' );
} );

/* ---------- profileNameProblem ------------------------------------------- */

const existing = [ { id: 'p_1', name: 'Clients' }, { id: 'p_2', name: 'Editors' } ];

test( 'profileNameProblem refuses an empty or blank name', () => {
	assert.equal( profileNameProblem( '', existing ), 'empty' );
	assert.equal( profileNameProblem( '   ', existing ), 'empty' );
} );

test( 'profileNameProblem refuses a name taken by another profile, ignoring case and spaces', () => {
	assert.equal( profileNameProblem( 'clients', existing ), 'taken' );
	assert.equal( profileNameProblem( '  EDITORS ', existing ), 'taken' );
} );

test( 'profileNameProblem lets a profile keep, or re-case, its own name', () => {
	assert.equal( profileNameProblem( 'CLIENTS', existing, 'p_1' ), '' );
	assert.equal( profileNameProblem( 'Shop staff', existing ), '' );
} );

/* ---------- profileItemCount --------------------------------------------- */

test( 'profileItemCount counts an item once even when both of its axes name the profile', () => {
	const assignments = [
		{ key: 'tools.php', own: [ 'p_1' ] },
		{ key: 'edit.php', own: [ 'p_1' ], child: [ 'p_1' ] },
		{ key: 'upload.php', child: [ 'p_1' ] },
		{ key: 'index.php', own: [ 'p_2' ] },
	];
	assert.equal( profileItemCount( 'p_1', assignments ), 3 );
	assert.equal( profileItemCount( 'p_3', assignments ), 0 );
} );

/* ---------- buildProfilesPayload ----------------------------------------- */

test( 'buildProfilesPayload emits the stored shape, hide-lists in menu order', () => {
	const out = buildProfilesPayload(
		[ { id: 'p_1', name: 'Reduced view', users: [ { id: 3, name: 'Ada' }, { id: 9, name: 'Grace' } ] } ],
		[
			{ key: 'tools.php', own: [ 'p_1' ] },
			{ key: 'edit.php', own: [], child: [ 'p_1' ] },
			{ key: 'edit.php>post-new.php', own: [ 'p_1' ] },
		]
	);

	assert.deepEqual( JSON.parse( JSON.stringify( out ) ), {
		p_1: {
			name: 'Reduced view',
			users: [ 3, 9 ],
			hides: [ 'tools.php', 'edit.php>post-new.php' ],
			child_hides: [ 'edit.php' ],
		},
	} );
} );

test( 'buildProfilesPayload keeps a profile with no members or hides, lists omitted', () => {
	const out = buildProfilesPayload( [ { id: 'p_4', name: 'New', users: [] } ], [] );
	assert.deepEqual( JSON.parse( JSON.stringify( out ) ), { p_4: { name: 'New' } } );
} );

test( 'buildProfilesPayload with no profiles is an EMPTY map, which deletes them all', () => {
	const out = buildProfilesPayload( [], [ { key: 'tools.php', own: [ 'p_1' ] } ] );
	assert.equal( JSON.stringify( out ), '{}' );
} );

test( 'buildProfilesPayload ignores assignments to profiles that are not in the list', () => {
	const out = buildProfilesPayload(
		[ { id: 'p_2', name: 'Kept' } ],
		[ { key: 'tools.php', own: [ 'p_1', 'p_2' ] } ]
	);
	assert.deepEqual( JSON.parse( JSON.stringify( out ) ), { p_2: { name: 'Kept', hides: [ 'tools.php' ] } } );
} );

/* ---------- carryProfileHides ------------------------------------------ */

test( 'carryProfileHides keeps stored hides of items that were not rendered', () => {
	const out = carryProfileHides(
		[ { key: 'tools.php', own: [] } ],
		{
			p_1: { name: 'A', hides: [ 'tools.php', 'gone.php' ], child_hides: [ 'shop' ] },
			p_2: { name: 'B', hides: [ 'gone.php' ] },
		}
	);
	assert.deepEqual( out, [
		{ key: 'tools.php', own: [], child: [] },
		{ key: 'gone.php', own: [ 'p_1', 'p_2' ], child: [] },
		{ key: 'shop', own: [], child: [ 'p_1' ] },
	] );
} );

test( 'carryProfileHides never overrides a rendered item, so unticking it sticks', () => {
	const out = carryProfileHides(
		[ { key: 'tools.php', own: [], child: [] } ],
		{ p_1: { name: 'A', hides: [ 'tools.php' ] } }
	);
	assert.deepEqual( out, [ { key: 'tools.php', own: [], child: [] } ] );
} );

test( 'carryProfileHides round-trips through buildProfilesPayload', () => {
	const stored = { p_1: { name: 'A', users: [ 3 ], hides: [ 'gone.php' ] } };
	const payload = buildProfilesPayload(
		[ { id: 'p_1', name: 'A', users: [ { id: 3, name: 'Ada' } ] } ],
		carryProfileHides( [ { key: 'tools.php', own: [ 'p_1' ] } ], stored )
	);
	assert.deepEqual( JSON.parse( JSON.stringify( payload ) ), {
		p_1: { name: 'A', users: [ 3 ], hides: [ 'tools.php', 'gone.php' ] },
	} );
} );

test( 'carryProfileHides tolerates no stored map', () => {
	assert.deepEqual( carryProfileHides( [], undefined ), [] );
} );

/* ---------- diffItem / resetItem ----------------------------------------- */

test( 'diffItem marks an item modified by a profile axis alone', () => {
	const d = diffItem( { title: '', hiddenRoles: [], hiddenProfiles: [ 'p_1' ] }, { title: 'Tools' } );
	assert.equal( d.modified, true );
	assert.deepEqual( d.fields, [ 'hiddenProfiles' ] );

	const c = diffItem( { title: '', hiddenRoles: [], childHiddenProfiles: [ 'p_1' ] }, { title: 'Posts' } );
	assert.deepEqual( c.fields, [ 'childHiddenProfiles' ] );
} );

test( 'resetItem clears both profile axes', () => {
	const r = resetItem( { title: 'X', hiddenRoles: [], hiddenProfiles: [ 'p_1' ], childHiddenProfiles: [ 'p_1' ] }, { title: 'Tools' }, false );
	assert.deepEqual( r.hiddenProfiles, [] );
	assert.deepEqual( r.childHiddenProfiles, [] );
} );
