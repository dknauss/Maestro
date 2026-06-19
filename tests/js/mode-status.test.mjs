/**
 * Unit tests for modeStatusLabel — pure function that maps a save-state
 * ('idle'|'saving'|'saved'|'error') to transient save-status text.
 *
 * The 'idle' state returns '' so the save-status element renders nothing.
 * The persistent "Edit Mode" mode label is built in the DOM (Plan 02), NOT here.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire( import.meta.url );
const { modeStatusLabel } = require( '../../assets/maestro-logic.js' );

const strings = {
	saving:    'Saving…',
	saved:     'Saved',
	saveError: 'Save failed. Retrying on next change.',
};

test( "idle -> '' (save-status element shows nothing at idle)", () => {
	assert.equal( modeStatusLabel( 'idle', strings ), '' );
} );

test( "saving -> strings.saving", () => {
	assert.equal( modeStatusLabel( 'saving', strings ), strings.saving );
} );

test( "saved -> strings.saved", () => {
	assert.equal( modeStatusLabel( 'saved', strings ), strings.saved );
} );

test( "error -> strings.saveError", () => {
	assert.equal( modeStatusLabel( 'error', strings ), strings.saveError );
} );

test( "unknown state ('frobnicate') -> '' (never throws, defaults to empty)", () => {
	assert.equal( modeStatusLabel( 'frobnicate', strings ), '' );
} );
