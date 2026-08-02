/**
 * Unit tests for diffItem — pure function that reports whether a working
 * model item differs from its pristine default and which fields changed.
 *
 * Mirrors the inline diff logic in buildConfig() in assets/maestro.js.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire( import.meta.url );
const { diffItem } = require( '../../assets/maestro-logic.js' );

// Pristine-equal item: no change
test( 'identical current and pristine -> not modified, empty fields', () => {
	const current  = { title: 'Posts', icon: 'dashicons-admin-post', hiddenRoles: [] };
	const pristine = { title: 'Posts', icon: 'dashicons-admin-post' };
	const result = diffItem( current, pristine );
	assert.equal( result.modified, false );
	assert.deepEqual( result.fields, [] );
} );

// Title changed
test( 'changed title only -> modified, fields=[title]', () => {
	const current  = { title: 'My Posts', icon: 'dashicons-admin-post', hiddenRoles: [] };
	const pristine = { title: 'Posts', icon: 'dashicons-admin-post' };
	const result = diffItem( current, pristine );
	assert.equal( result.modified, true );
	assert.deepEqual( result.fields, [ 'title' ] );
} );

// Icon changed
test( 'changed icon only -> modified, fields=[icon]', () => {
	const current  = { title: 'Posts', icon: 'dashicons-admin-home', hiddenRoles: [] };
	const pristine = { title: 'Posts', icon: 'dashicons-admin-post' };
	const result = diffItem( current, pristine );
	assert.equal( result.modified, true );
	assert.deepEqual( result.fields, [ 'icon' ] );
} );

// Hidden roles present
test( 'any hidden role present -> modified, fields=[hiddenRoles]', () => {
	const current  = { title: 'Posts', icon: 'dashicons-admin-post', hiddenRoles: [ 'editor' ] };
	const pristine = { title: 'Posts', icon: 'dashicons-admin-post' };
	const result = diffItem( current, pristine );
	assert.equal( result.modified, true );
	assert.deepEqual( result.fields, [ 'hiddenRoles' ] );
} );

// Empty/absent title equal to empty pristine -> not modified
// Mirrors the `m.title && m.title !== def.title` rule:
// an untouched empty item is NOT flagged as modified.
test( 'empty current title and empty pristine title -> not modified', () => {
	const current  = { title: '', icon: 'dashicons-admin-post', hiddenRoles: [] };
	const pristine = { title: '', icon: 'dashicons-admin-post' };
	const result = diffItem( current, pristine );
	assert.equal( result.modified, false );
	assert.deepEqual( result.fields, [] );
} );

test( 'falsy current title (not set) vs any pristine -> not modified for title', () => {
	const current  = { title: '', icon: 'dashicons-admin-post', hiddenRoles: [] };
	const pristine = { title: 'Posts', icon: 'dashicons-admin-post' };
	const result = diffItem( current, pristine );
	// title is falsy so it is NOT considered modified (mirrors m.title && rule)
	assert.equal( result.modified, false );
	assert.deepEqual( result.fields, [] );
} );

// Submenu item (no icon key in pristine) — icon is ignored
test( 'submenu item: pristine has no icon -> icon change is ignored', () => {
	const current  = { title: 'All Posts', icon: 'dashicons-admin-post', hiddenRoles: [] };
	const pristine = { title: 'All Posts' }; // no icon key
	const result = diffItem( current, pristine );
	assert.equal( result.modified, false );
	assert.deepEqual( result.fields, [] );
} );

test( 'submenu item: only title/roles drive modified flag', () => {
	const current  = { title: 'Changed', icon: 'dashicons-whatever', hiddenRoles: [ 'subscriber' ] };
	const pristine = { title: 'All Posts' }; // no icon key
	const result = diffItem( current, pristine );
	assert.equal( result.modified, true );
	// icon is absent from pristine, so only title and hiddenRoles reported
	assert.ok( result.fields.includes( 'title' ) );
	assert.ok( result.fields.includes( 'hiddenRoles' ) );
	assert.ok( ! result.fields.includes( 'icon' ) );
} );

// Multiple changes
test( 'multiple changes -> fields contains each changed key', () => {
	const current  = { title: 'My Posts', icon: 'dashicons-admin-home', hiddenRoles: [ 'editor' ] };
	const pristine = { title: 'Posts', icon: 'dashicons-admin-post' };
	const result = diffItem( current, pristine );
	assert.equal( result.modified, true );
	assert.deepEqual( result.fields.sort(), [ 'hiddenRoles', 'icon', 'title' ] );
} );

// child_hidden_roles (COMPAT-10 REVISED editor UI, parent-only field) —
// empty is not modified; a non-empty list is modified, independent of
// hiddenRoles (mirrors the hiddenRoles-length-only rule).
test( 'childHiddenRoles empty -> not modified, fields empty', () => {
	const current  = { title: 'Posts', icon: 'dashicons-admin-post', hiddenRoles: [], childHiddenRoles: [] };
	const pristine = { title: 'Posts', icon: 'dashicons-admin-post' };
	const result = diffItem( current, pristine );
	assert.equal( result.modified, false );
	assert.deepEqual( result.fields, [] );
} );

test( 'childHiddenRoles non-empty -> modified, fields=[childHiddenRoles]', () => {
	const current  = { title: 'Posts', icon: 'dashicons-admin-post', hiddenRoles: [], childHiddenRoles: [ 'editor' ] };
	const pristine = { title: 'Posts', icon: 'dashicons-admin-post' };
	const result = diffItem( current, pristine );
	assert.equal( result.modified, true );
	assert.deepEqual( result.fields, [ 'childHiddenRoles' ] );
} );

test( 'childHiddenRoles non-empty alongside other changes -> fields contains childHiddenRoles too', () => {
	const current  = { title: 'My Posts', icon: 'dashicons-admin-post', hiddenRoles: [], childHiddenRoles: [ 'editor' ] };
	const pristine = { title: 'Posts', icon: 'dashicons-admin-post' };
	const result = diffItem( current, pristine );
	assert.equal( result.modified, true );
	assert.deepEqual( result.fields.sort(), [ 'childHiddenRoles', 'title' ] );
} );

test( 'hiddenRoles and childHiddenRoles are independent -> both can be modified at once', () => {
	const current  = { title: 'Posts', icon: 'dashicons-admin-post', hiddenRoles: [ 'shop_manager' ], childHiddenRoles: [ 'editor' ] };
	const pristine = { title: 'Posts', icon: 'dashicons-admin-post' };
	const result = diffItem( current, pristine );
	assert.equal( result.modified, true );
	assert.deepEqual( result.fields.sort(), [ 'childHiddenRoles', 'hiddenRoles' ] );
} );
