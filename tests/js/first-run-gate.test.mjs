/**
 * Unit tests for firstRunSeen — pure function that reads a localStorage-like
 * stub to determine whether the first-run cue has already been shown.
 *
 * Returns true (treat as seen; suppress cue) when storage.getItem throws,
 * so a blocked/unavailable storage is safe.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire( import.meta.url );
const { firstRunSeen } = require( '../../assets/maestro-logic.js' );

test( "getItem returns null (key absent) -> false (not yet seen)", () => {
	const storage = { getItem: () => null };
	assert.equal( firstRunSeen( storage ), false );
} );

test( "getItem returns '1' -> true (cue has been seen/dismissed)", () => {
	const storage = { getItem: () => '1' };
	assert.equal( firstRunSeen( storage ), true );
} );

test( "getItem returns '0' (other value) -> false (not seen)", () => {
	const storage = { getItem: () => '0' };
	assert.equal( firstRunSeen( storage ), false );
} );

test( "getItem throws -> true (treat as seen; suppress cue safely)", () => {
	const storage = { getItem: () => { throw new Error( 'blocked' ); } };
	assert.equal( firstRunSeen( storage ), true );
} );
