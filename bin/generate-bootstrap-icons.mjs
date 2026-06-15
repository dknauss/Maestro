#!/usr/bin/env node
/**
 * Generate includes/icons-bootstrap.php — a curated set of Bootstrap Icons
 * encoded as base64 SVG data-URIs for the editor's icon picker.
 *
 * Why curated: Bootstrap Icons ships ~2000 glyphs; localising them all into
 * every edit-mode page would be megabytes. We bundle an admin-relevant subset.
 * Add a name to CURATED and re-run to extend it.
 *
 * Why #a7aaad: a data-URI used as a CSS background-image cannot inherit text
 * colour, so `currentColor` would resolve to black and vanish on the dark admin
 * menu. We bake in WordPress's default menu-icon grey. (Trade-off: these icons
 * don't recolour on hover/active the way dashicons fonts do — documented.)
 *
 * Run: node bin/generate-bootstrap-icons.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname( fileURLToPath( import.meta.url ) );
const ICON_DIR = resolve( __dirname, '../node_modules/bootstrap-icons/icons' );
const OUT = resolve( __dirname, '../includes/icons-bootstrap.php' );
const MENU_GREY = '#a7aaad';

// Admin-relevant subset. Grouped by intent for readability; flattened on output.
const CURATED = [
	// Dashboard / pages / content
	'house', 'speedometer2', 'file-earmark-text', 'file-earmark', 'files',
	'journal-text', 'book', 'bookmark', 'pencil-square', 'card-text', 'layout-text-window',
	// Media
	'images', 'image', 'camera', 'film', 'music-note-beamed', 'mic', 'play-btn',
	// Taxonomy / organization
	'tag', 'tags', 'folder', 'folder2-open', 'archive', 'trash', 'grid', 'list-ul', 'kanban', 'table',
	// Commerce
	'cart3', 'bag', 'shop', 'credit-card', 'cash-stack', 'receipt', 'box-seam', 'truck',
	// Analytics
	'graph-up', 'bar-chart', 'pie-chart', 'clipboard-data',
	// Time / place
	'calendar3', 'calendar-event', 'clock', 'geo-alt',
	// People / comms
	'people', 'person', 'person-badge', 'person-circle', 'chat-dots', 'envelope', 'megaphone', 'bell',
	// Settings / tools
	'gear', 'gear-wide-connected', 'sliders', 'tools', 'wrench', 'plug', 'puzzle',
	// Security
	'shield', 'shield-lock', 'lock', 'key', 'person-lock',
	// Infra / dev
	'database', 'hdd-stack', 'cloud', 'server', 'globe', 'rss', 'link-45deg', 'code-slash', 'terminal',
	// Appearance
	'palette', 'brush',
	// Misc
	'star', 'heart', 'lightning', 'trophy', 'ticket-perforated', 'building', 'briefcase',
	'search', 'question-circle', 'info-circle', 'eye', 'eye-slash',
];

function toDataUri( name ) {
	const file = resolve( ICON_DIR, name + '.svg' );
	if ( ! existsSync( file ) ) {
		return null;
	}
	let svg = readFileSync( file, 'utf8' );
	// Drop the fixed width/height and the bi-* class; keep viewBox so it scales.
	svg = svg
		.replace( /\s(width|height|class)="[^"]*"/g, '' )
		.replace( /fill="currentColor"/g, `fill="${ MENU_GREY }"` )
		.replace( />\s+</g, '><' )
		.trim();
	// Ensure a fill is present (a few icons rely on the attribute we just set).
	if ( ! /fill="/.test( svg ) ) {
		svg = svg.replace( '<svg ', `<svg fill="${ MENU_GREY }" ` );
	}
	return 'data:image/svg+xml;base64,' + Buffer.from( svg, 'utf8' ).toString( 'base64' );
}

const version = JSON.parse(
	readFileSync( resolve( __dirname, '../node_modules/bootstrap-icons/package.json' ), 'utf8' )
).version;

const entries = [];
const missing = [];
for ( const name of CURATED ) {
	const uri = toDataUri( name );
	if ( uri ) {
		entries.push( [ 'bi-' + name, uri ] );
	} else {
		missing.push( name );
	}
}

if ( missing.length ) {
	console.warn( 'Skipped (not found in this Bootstrap Icons version): ' + missing.join( ', ' ) );
}

const lines = entries.map(
	( [ id, uri ] ) => `\t'${ id }' => '${ uri }',`
).join( '\n' );

const php = `<?php
/**
 * Curated Bootstrap Icons as base64 SVG data-URIs for the icon picker.
 *
 * GENERATED — do not edit by hand. Run \`node bin/generate-bootstrap-icons.mjs\`
 * to regenerate. Source: Bootstrap Icons v${ version } (MIT). Icons are recoloured
 * to WordPress's menu grey (${ MENU_GREY }); see the generator for the rationale.
 *
 * @package Maestro
 */

defined( 'ABSPATH' ) || exit;

return array(
${ lines }
);
`;

writeFileSync( OUT, php, 'utf8' );
console.log( `Wrote ${ entries.length } icons to ${ OUT }` );
