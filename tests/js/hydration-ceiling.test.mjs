/**
 * Regression guard for the fullscreen hydration ceiling.
 *
 * WHY THIS EXISTS: this constant was already silently reverted once. #164
 * raised it from 3000 to 10000 with measurements behind it, and #165 put it
 * back to 3000 — not by disagreeing, but because a wholesale
 * `git checkout <branch> -- assets/maestro.js` replaced the file from a branch
 * that predated the change. Every suite stayed green, because the ceiling only
 * bounds a give-up path no test exercises. It surfaced days later, by accident,
 * during an unrelated audit.
 *
 * WHY A FLOOR AND NOT AN EXACT VALUE: 10000 is a tuning number, not a contract.
 * Asserting it exactly would turn every legitimate re-tune into a failing test
 * and teach people to edit the assertion, which is how a guard stops guarding.
 * Asserting a floor catches the thing that actually happened — a silent revert
 * to a value too small to be safe — while leaving the tuning free above it.
 *
 * WHY 5000: the measured worst case is 2303ms of hydration latency at 20x CPU
 * throttle (see the comment on the constant itself). 5000 keeps roughly 2x over
 * that, and any revert to the old 3000 trips it.
 *
 * WHY IT READS THE SOURCE: maestro.js is a browser IIFE with no export surface,
 * so there is nothing to import. Reading the text is the honest way to assert a
 * property of a file that cannot be loaded — the same shape as doc-links.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SOURCE = new URL( '../../assets/maestro.js', import.meta.url );
const FLOOR_MS = 5000;

const source = readFileSync( SOURCE, 'utf8' );

test( 'FULLSCREEN_SETTLE_MS is declared exactly once', () => {
	const declarations = source.match( /var\s+FULLSCREEN_SETTLE_MS\s*=/g ) || [];

	assert.equal(
		declarations.length,
		1,
		'expected a single declaration; if this moved or was renamed, update this guard rather than deleting it'
	);
} );

test( `FULLSCREEN_SETTLE_MS is at least ${ FLOOR_MS }ms`, () => {
	const match = source.match( /var\s+FULLSCREEN_SETTLE_MS\s*=\s*(\d+)\s*;/ );

	assert.ok( match, 'could not read the value of FULLSCREEN_SETTLE_MS' );

	const value = Number( match[ 1 ] );

	assert.ok(
		value >= FLOOR_MS,
		`FULLSCREEN_SETTLE_MS is ${ value }ms, below the ${ FLOOR_MS }ms floor. ` +
			'Hydration was measured at 2303ms on a 20x-throttled device, so a value ' +
			'this low silently denies the editor to non-fullscreen users on slow ' +
			'machines. If you are deliberately lowering it, re-measure first and ' +
			'move the floor with it.'
	);
} );

test( 'the constant still carries its measurements', () => {
	// The numbers are the whole argument for the value. If a future edit strips
	// them, the next person re-tunes blind — which is how it got to 3000.
	assert.match(
		source,
		/2303ms/,
		'the measurement table above FULLSCREEN_SETTLE_MS is missing its 20x figure'
	);
} );
