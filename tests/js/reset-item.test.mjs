/**
 * Unit tests for resetItem — pure function that recomputes an item to its
 * pristine state without mutating the input or touching the DOM.
 *
 * Also covers the round-trip invariant: after resetItem, diffItem(result, pristine)
 * must report modified:false.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire( import.meta.url );
const { resetItem, diffItem } = require( '../../assets/maestro-logic.js' );

// Top-level item reset
test( 'top-level item: returns title, hiddenRoles=[], icon from pristine', () => {
	const item     = { title: 'My Posts', icon: 'dashicons-admin-home', hiddenRoles: [ 'editor' ] };
	const pristine = { title: 'Posts', icon: 'dashicons-admin-post' };
	const result   = resetItem( item, pristine, false );
	assert.equal( result.title, 'Posts' );
	assert.equal( result.icon, 'dashicons-admin-post' );
	assert.deepEqual( result.hiddenRoles, [] );
} );

// childHiddenRoles (COMPAT-10 REVISED) has no WP-native pristine state —
// reset always clears it to [], top-level or submenu.
test( 'top-level item: childHiddenRoles is always reset to []', () => {
	const item     = { title: 'My Posts', icon: 'dashicons-admin-home', hiddenRoles: [ 'editor' ], childHiddenRoles: [ 'shop_manager' ] };
	const pristine = { title: 'Posts', icon: 'dashicons-admin-post' };
	const result   = resetItem( item, pristine, false );
	assert.deepEqual( result.childHiddenRoles, [] );
} );

// Top-level item with empty pristine strings
test( 'top-level item: empty pristine title/icon -> empty strings in result', () => {
	const item     = { title: 'Foo', icon: 'dashicons-admin-home', hiddenRoles: [] };
	const pristine = { title: '', icon: '' };
	const result   = resetItem( item, pristine, false );
	assert.equal( result.title, '' );
	assert.equal( result.icon, '' );
	assert.deepEqual( result.hiddenRoles, [] );
} );

// Submenu item: icon is omitted/empty (submenu has no icon column)
test( 'submenu item (isSub=true): icon is empty string regardless of pristine', () => {
	const item     = { title: 'Changed Sub', icon: 'dashicons-admin-post', hiddenRoles: [ 'subscriber' ] };
	const pristine = { title: 'All Posts' }; // no icon key — submenu
	const result   = resetItem( item, pristine, true );
	assert.equal( result.title, 'All Posts' );
	assert.equal( result.icon, '' );
	assert.deepEqual( result.hiddenRoles, [] );
} );

// Immutability — input item must NOT be mutated
test( 'resetItem does not mutate the input item', () => {
	const item     = { title: 'Foo', icon: 'dashicons-admin-home', hiddenRoles: [ 'editor' ] };
	const pristine = { title: 'Bar', icon: 'dashicons-admin-post' };
	resetItem( item, pristine, false );
	assert.equal( item.title, 'Foo' );
	assert.equal( item.icon, 'dashicons-admin-home' );
	assert.deepEqual( item.hiddenRoles, [ 'editor' ] );
} );

// Round-trip invariant: diffItem(resetItem(item), pristine) === modified:false
test( 'round-trip: top-level item after reset is not modified per diffItem', () => {
	const item     = { title: 'My Posts', icon: 'dashicons-admin-home', hiddenRoles: [ 'editor' ] };
	const pristine = { title: 'Posts', icon: 'dashicons-admin-post' };
	const reset    = resetItem( item, pristine, false );
	const diff     = diffItem( reset, pristine );
	assert.equal( diff.modified, false );
	assert.deepEqual( diff.fields, [] );
} );

test( 'round-trip: submenu item after reset is not modified per diffItem', () => {
	const item     = { title: 'Changed Sub', icon: '', hiddenRoles: [ 'subscriber' ] };
	const pristine = { title: 'All Posts' }; // no icon key
	const reset    = resetItem( item, pristine, true );
	const diff     = diffItem( reset, pristine );
	assert.equal( diff.modified, false );
	assert.deepEqual( diff.fields, [] );
} );
