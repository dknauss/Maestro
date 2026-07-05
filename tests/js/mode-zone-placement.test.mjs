/**
 * Unit tests for modeZonePlacement — the 782px relocation gate (pure).
 *
 * Maps a viewport width to where the mode/status zone lives:
 *   - width > 782  -> 'menu'    (admin-menu column visible; dock the zone in it)
 *   - width <= 782 -> 'toolbar' (column off-canvas per WP core; zone in the bar)
 *
 * The boundary (<= 782 -> 'toolbar') deliberately matches the existing
 * @media (max-width:782px) rule so CSS and JS agree on which side 782 lands.
 * Non-finite / non-numeric widths fall back to 'toolbar' (the always-safe
 * full-width home) and never throw.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire( import.meta.url );
const { modeZonePlacement } = require( '../../assets/maestro-logic.js' );

test( "1200 -> 'menu' (wide: column visible)", () => {
	assert.equal( modeZonePlacement( 1200 ), 'menu' );
} );

test( "783 -> 'menu' (just above the boundary)", () => {
	assert.equal( modeZonePlacement( 783 ), 'menu' );
} );

test( "782 -> 'toolbar' (AT the boundary: column off-canvas at <= 782)", () => {
	assert.equal( modeZonePlacement( 782 ), 'toolbar' );
} );

test( "400 -> 'toolbar' (narrow: column off-canvas)", () => {
	assert.equal( modeZonePlacement( 400 ), 'toolbar' );
} );

test( "NaN -> 'toolbar' (non-finite -> safe full-width home)", () => {
	assert.equal( modeZonePlacement( NaN ), 'toolbar' );
} );

test( "undefined -> 'toolbar' (guard: never throws)", () => {
	assert.equal( modeZonePlacement( undefined ), 'toolbar' );
} );
