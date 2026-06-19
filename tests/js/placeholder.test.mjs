/**
 * Unit tests for placeholderVisible — pure function that determines whether
 * the rename input placeholder should be visible.
 *
 * Mirrors commitRename's raw.trim() === '' rule: whitespace-only counts as
 * empty, so the placeholder shows whenever the field is blank or whitespace.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire( import.meta.url );
const { placeholderVisible } = require( '../../assets/maestro-logic.js' );

test( "empty string -> true (placeholder shows)", () => {
	assert.equal( placeholderVisible( '' ), true );
} );

test( "whitespace-only '   ' -> true (matches commitRename trim rule)", () => {
	assert.equal( placeholderVisible( '   ' ), true );
} );

test( "non-empty 'Posts' -> false (value present; placeholder hidden)", () => {
	assert.equal( placeholderVisible( 'Posts' ), false );
} );
