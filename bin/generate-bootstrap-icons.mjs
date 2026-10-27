#!/usr/bin/env node
/**
 * Generate assets/icons-bootstrap.json — a curated set of Bootstrap Icons
 * encoded as base64 SVG data-URIs for the editor's icon picker.
 *
 * Why curated: Bootstrap Icons ships ~2000 glyphs, most of them not menu
 * concepts. We bundle an admin-relevant subset about the size of the Dashicons
 * set. Add a name to GROUPS and re-run to extend it.
 *
 * Why a JSON file: the picker fetches it the first time the Bootstrap tab
 * opens, so it never rides in the edit-mode localized payload, and the browser
 * caches it (the URL carries the plugin version) across page loads.
 *
 * Why #a7aaad: the stored icon is this data-URI, and WordPress paints it as a
 * CSS background-image, which cannot inherit text colour. Maestro paints the
 * same SVG as a mask in the glyph's own colour instead (maestro-admin-bar.css),
 * so it follows hover, the current item and the colour scheme like a dashicon.
 * The baked grey is what shows in a browser without CSS masks.
 *
 * Fill-resolution policy (ICON-01): prefer <name>-fill when it exists; else
 * apply SYNONYM_FILL for names whose meaning survives a solid substitute; else
 * retain the outline <name> and record it. Every CURATED name must resolve,
 * no silent drops.
 *
 * Run: node bin/generate-bootstrap-icons.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname( fileURLToPath( import.meta.url ) );
export const ICON_DIR = resolve( __dirname, '../node_modules/bootstrap-icons/icons' );
const OUT = resolve( __dirname, '../assets/icons-bootstrap.json' );
export const MENU_GREY = '#a7aaad';

// Admin-relevant subset, about the size of the Dashicons set (342). Grouped by
// intent; each group's `terms` join the icon's own name as its search words,
// since the npm package ships no tags. Each group opens with its names from
// the original 87-icon set, so the picker's first rows look as they did.
// Brand logos are left out on purpose: they are not ours to offer.
export const GROUPS = [
	{ terms: 'dashboard content page post document writing', names: [
		'house', 'speedometer2', 'file-earmark-text', 'file-earmark', 'files',
		'journal-text', 'book', 'bookmark', 'pencil-square', 'card-text', 'layout-text-window',
		'file-text', 'file-richtext', 'file-post', 'journal', 'journals', 'journal-bookmark',
		'newspaper', 'book-half', 'bookmarks', 'bookmark-star', 'pencil', 'pen', 'vector-pen',
		'feather', 'card-heading', 'card-list', 'card-checklist', 'layout-sidebar',
		'layout-three-columns', 'layout-split', 'window', 'window-stack', 'window-sidebar',
		'columns-gap', 'text-paragraph', 'body-text', 'blockquote-left', 'quote', 'type',
		'highlighter', 'sticky', 'stickies', 'copy', 'clipboard', 'clipboard-check',
		'list-check', 'list-task', 'list-ol', 'list-nested', 'view-list', 'view-stacked',
		'stack', 'layers', 'collection', 'inbox', 'inboxes',
	] },
	{ terms: 'media library upload audio video photo', names: [
		'images', 'image', 'camera', 'film', 'music-note-beamed', 'mic', 'play-btn',
		'image-alt', 'camera-video', 'camera-reels', 'collection-play', 'music-note',
		'music-note-list', 'music-player', 'headphones', 'soundwave', 'volume-up', 'vinyl',
		'disc', 'play-circle', 'broadcast', 'cast', 'tv', 'projector', 'easel',
		'file-earmark-image', 'file-earmark-music', 'file-earmark-play', 'file-earmark-pdf',
		'file-earmark-zip', 'crop', 'aspect-ratio',
	] },
	{ terms: 'taxonomy category organize sort', names: [
		'tag', 'tags', 'folder', 'folder2-open', 'archive', 'trash', 'grid', 'list-ul', 'kanban', 'table',
		'folder-plus', 'folder-check', 'folder-symlink', 'boxes', 'box', 'diagram-2',
		'diagram-3', 'grid-3x3-gap', 'grid-1x2', 'list', 'filter', 'funnel', 'sort-down',
		'hash', 'bookmark-check', 'pin', 'pin-angle', 'trash3', 'recycle',
	] },
	{ terms: 'commerce shop store ecommerce payment money order product', names: [
		'cart3', 'bag', 'shop', 'credit-card', 'cash-stack', 'receipt', 'box-seam', 'truck',
		'cart', 'cart-check', 'cart-plus', 'basket', 'bag-check', 'handbag', 'shop-window',
		'wallet', 'wallet2', 'piggy-bank', 'bank', 'coin', 'cash', 'cash-coin',
		'currency-dollar', 'currency-euro', 'currency-pound', 'currency-exchange', 'percent',
		'gift', 'receipt-cutoff', 'upc-scan', 'qr-code', 'truck-flatbed', 'box2',
		'credit-card-2-front', 'safe',
	] },
	{ terms: 'analytics statistics report chart metrics seo', names: [
		'graph-up', 'bar-chart', 'pie-chart', 'clipboard-data',
		'graph-down', 'graph-up-arrow', 'bar-chart-line', 'bar-chart-steps', 'activity',
		'speedometer', 'clipboard-pulse', 'file-earmark-bar-graph', 'file-earmark-spreadsheet',
		'calculator', 'bullseye', 'binoculars', 'radar', 'reception-4', 'thermometer-half',
	] },
	{ terms: 'time date schedule booking event location place travel', names: [
		'calendar3', 'calendar-event', 'clock', 'geo-alt',
		'calendar', 'calendar-check', 'calendar-date', 'calendar-day', 'calendar-week',
		'calendar-month', 'calendar-plus', 'calendar-range', 'calendar-heart', 'alarm',
		'stopwatch', 'hourglass-split', 'clock-history', 'geo', 'map', 'pin-map', 'compass',
		'signpost', 'signpost-split', 'globe-americas', 'globe-europe-africa', 'house-door',
		'buildings', 'hospital', 'airplane', 'car-front', 'bus-front', 'train-front',
		'bicycle', 'luggage', 'suitcase', 'sun', 'moon', 'cloud-sun', 'umbrella', 'tree',
		'flower1', 'leaf',
	] },
	{ terms: 'people user member community communication email newsletter message support', names: [
		'people', 'person', 'person-badge', 'person-circle', 'chat-dots', 'envelope', 'megaphone', 'bell',
		'person-plus', 'person-check', 'person-gear', 'person-heart', 'person-vcard',
		'person-square', 'person-workspace', 'person-video', 'person-wheelchair',
		'person-raised-hand', 'person-arms-up', 'chat', 'chat-left-text', 'chat-square-quote',
		'chat-quote', 'chat-heart', 'envelope-open', 'envelope-at', 'envelope-paper',
		'envelope-heart', 'send', 'mailbox', 'telephone', 'phone', 'headset', 'bell-slash',
		'broadcast-pin', 'share', 'reply', 'at', 'hand-thumbs-up', 'hand-thumbs-down',
		'emoji-smile', 'mortarboard', 'award', 'patch-check', 'postcard', 'postage',
	] },
	{ terms: 'settings tools options configure import export backup', names: [
		'gear', 'gear-wide-connected', 'sliders', 'tools', 'wrench', 'plug', 'puzzle',
		'gear-wide', 'sliders2', 'toggles', 'toggle-on', 'wrench-adjustable', 'hammer',
		'screwdriver', 'nut', 'plugin', 'power', 'arrow-repeat', 'arrow-clockwise',
		'arrow-counterclockwise', 'download', 'upload', 'box-arrow-in-down',
		'box-arrow-up-right', 'cloud-arrow-up', 'cloud-arrow-down', 'cloud-check', 'save',
		'floppy', 'printer', 'scissors', 'eraser', 'link', 'paperclip',
	] },
	{ terms: 'security privacy login password protection firewall', names: [
		'shield', 'shield-lock', 'lock', 'key', 'person-lock',
		'shield-check', 'shield-shaded', 'shield-exclamation', 'shield-x', 'shield-plus',
		'unlock', 'fingerprint', 'incognito', 'safe2', 'bug', 'virus', 'fire',
		'exclamation-triangle', 'exclamation-octagon', 'ban', 'sign-stop', 'hand-index',
		'door-closed', 'door-open', 'box-arrow-in-right', 'box-arrow-right',
	] },
	{ terms: 'developer code server hosting database cache performance api network', names: [
		'database', 'hdd-stack', 'cloud', 'server', 'globe', 'rss', 'link-45deg', 'code-slash', 'terminal',
		'database-gear', 'database-check', 'database-lock', 'hdd', 'hdd-network', 'hdd-rack',
		'device-ssd', 'cpu', 'memory', 'motherboard', 'router', 'modem', 'wifi', 'ethernet',
		'cloud-upload', 'cloud-download', 'globe2', 'code', 'code-square', 'braces',
		'braces-asterisk', 'terminal-split', 'file-earmark-code', 'filetype-php',
		'filetype-js', 'filetype-css', 'filetype-html', 'filetype-json', 'git', 'regex',
		'lightning-charge', 'robot', 'gpu-card', 'rocket', 'rocket-takeoff', 'usb-plug',
		'outlet', 'window-desktop', 'display', 'laptop', 'tablet', 'pc-display',
	] },
	{ terms: 'appearance design theme style color', names: [
		'palette', 'brush',
		'palette2', 'paint-bucket', 'droplet', 'droplet-half', 'eyedropper', 'bezier2',
		'layout-text-sidebar', 'brightness-high', 'circle-half', 'transparency', 'fonts',
		'type-bold', 'text-left', 'border-style', 'grid-3x3', 'shadows', 'mask', 'window-split',
	] },
	{ terms: 'general', names: [
		'star', 'heart', 'lightning', 'trophy', 'ticket-perforated', 'building', 'briefcase',
		'search', 'question-circle', 'info-circle', 'eye', 'eye-slash',
		'star-half', 'stars', 'magic', 'heart-pulse', 'hearts', 'gem', 'diamond', 'flag',
		'lightbulb', 'question-diamond', 'info-square', 'exclamation-circle', 'check-circle',
		'check2-square', 'x-circle', 'plus-circle', 'dash-circle', 'three-dots',
		'life-preserver', 'universal-access', 'universal-access-circle', 'translate',
		'balloon', 'cake', 'cup-hot', 'controller', 'dice-5', 'joystick', 'bandaid',
		'capsule', 'flask', 'easel2', 'ticket', 'infinity',
	] },
];

export const CURATED = GROUPS.flatMap( ( g ) => g.names );

/**
 * Explicit solid synonyms for CURATED names that lack a direct <name>-fill variant.
 *
 * Rules:
 * - Every target MUST exist in node_modules/bootstrap-icons/icons; verified at
 *   module load time — a missing target throws rather than silently using an outline.
 * - Only map names where the solid substitute preserves the semantic meaning of the
 *   original outline icon (e.g. "files" reads correctly as "file-earmark-fill").
 * - Names with no sensible solid form are NOT in this map and stay outline — see
 *   the RETAINED_OUTLINE array printed at generator run time.
 *
 * Candidates evaluated from the plan decision (fill_resolution_decision):
 *   - files        -> file-earmark-fill  (solid document stack, ✓ exists)
 *   - journal-text -> journal-fill       (MISSING — journal-fill not in v1.13.1; stays outline)
 *   - pencil-square-> pencil-fill        (solid pencil, ✓ exists)
 *   - images       -> image-fill         (solid image/photo, ✓ exists)
 *   - folder2-open -> folder-fill        (solid folder, ✓ exists; "open" nuance acceptable)
 *   - cart3        -> cart-fill          (solid cart, ✓ exists)
 *   - person-circle-> person-fill        (solid person silhouette, ✓ exists)
 *   - person-lock  -> person-fill-lock   (solid person+lock, ✓ exists)
 *   - graph-up     -> graph-up-arrow     (only outline; graph-up-arrow-fill MISSING; stays outline)
 */
export const SYNONYM_FILL = {
	'files': 'file-earmark-fill',
	'pencil-square': 'pencil-fill',
	'images': 'image-fill',
	'folder2-open': 'folder-fill',
	'cart3': 'cart-fill',
	'person-circle': 'person-fill',
	'person-lock': 'person-fill-lock',
};

// Validate every synonym target at module load — fail fast rather than shipping broken output.
for ( const [ src, target ] of Object.entries( SYNONYM_FILL ) ) {
	const file = resolve( ICON_DIR, target + '.svg' );
	if ( ! existsSync( file ) ) {
		throw new Error(
			`SYNONYM_FILL["${ src }"] = "${ target }" — target SVG not found at ${ file }. ` +
			'Update SYNONYM_FILL to use an existing Bootstrap Icons file.'
		);
	}
}

/**
 * Resolve a CURATED icon name to its preferred source file.
 *
 * Priority:
 *   1. <name>-fill.svg   — direct fill variant (source: 'fill')
 *   2. SYNONYM_FILL[name] — validated solid synonym (source: 'synonym')
 *   3. <name>.svg         — retained outline (source: 'outline')
 *
 * Returns { file: absolutePath, source: 'fill'|'synonym'|'outline' }.
 * Never returns null; never throws for a CURATED name (all outlines exist).
 *
 * @param {string} name A CURATED icon name.
 * @returns {{ file: string, source: 'fill'|'synonym'|'outline' }}
 */
export function resolveIcon( name ) {
	// 1. Prefer <name>-fill
	const fillFile = resolve( ICON_DIR, name + '-fill.svg' );
	if ( existsSync( fillFile ) ) {
		return { file: fillFile, source: 'fill' };
	}

	// 2. Apply synonym map
	if ( SYNONYM_FILL[ name ] ) {
		const synFile = resolve( ICON_DIR, SYNONYM_FILL[ name ] + '.svg' );
		// Target existence is validated at module load, but guard defensively.
		if ( existsSync( synFile ) ) {
			return { file: synFile, source: 'synonym' };
		}
	}

	// 3. Retain outline
	const outlineFile = resolve( ICON_DIR, name + '.svg' );
	return { file: outlineFile, source: 'outline' };
}

/**
 * Read the resolved SVG for `name`, bake in menu-grey (#a7aaad), strip
 * width/height/class attributes, collapse whitespace, and return a
 * `data:image/svg+xml;base64,` data-URI.
 *
 * This is the same transform as the original generator; extracted so tests
 * can assert on the baked output without running the full file-write loop.
 *
 * @param {string} name A CURATED icon name.
 * @returns {string} Base64 data-URI.
 */
export function bakeDataUri( name ) {
	const { file } = resolveIcon( name );
	let svg = readFileSync( file, 'utf8' );
	// Drop fixed width/height and the bi-* class; keep viewBox so it scales.
	svg = svg
		.replace( /\s(width|height|class)="[^"]*"/g, '' )
		.replace( /fill="currentColor"/g, `fill="${ MENU_GREY }"` )
		.replace( />\s+</g, '><' )
		.trim();
	// Ensure a fill attribute is present (a few icons rely on the SVG root fill).
	if ( ! /fill="/.test( svg ) ) {
		svg = svg.replace( '<svg ', `<svg fill="${ MENU_GREY }" ` );
	}
	return 'data:image/svg+xml;base64,' + Buffer.from( svg, 'utf8' ).toString( 'base64' );
}

// ---------------------------------------------------------------------------
// CLI entry point — only runs when this file is executed directly.
// Importing this module (e.g. from tests) is side-effect-free.
// ---------------------------------------------------------------------------
/**
 * Readable label for a CURATED name: "file-earmark-text" -> "File Earmark Text".
 *
 * @param {string} name A CURATED icon name.
 * @returns {string}
 */
export function labelFor( name ) {
	return name.split( '-' ).map( ( w ) => w.charAt( 0 ).toUpperCase() + w.slice( 1 ) ).join( ' ' );
}

/**
 * Build the picker's icon list, one entry per CURATED name, in order.
 *
 * `terms` are the extra search words the picker matches besides the label.
 *
 * @returns {{ label: string, terms: string, src: string }[]}
 */
export function buildIcons() {
	const seen = new Set();
	const icons = [];
	for ( const group of GROUPS ) {
		for ( const name of group.names ) {
			if ( seen.has( name ) ) {
				throw new Error( `"${ name }" is listed twice in GROUPS.` );
			}
			seen.add( name );
			icons.push( { label: labelFor( name ), terms: group.terms, src: bakeDataUri( name ) } );
		}
	}
	return icons;
}

function main() {
	const version = JSON.parse(
		readFileSync( resolve( __dirname, '../node_modules/bootstrap-icons/package.json' ), 'utf8' )
	).version;

	const icons = buildIcons();
	const retainedOutline = CURATED.filter( ( name ) => resolveIcon( name ).source === 'outline' );

	// One icon per line keeps diffs readable when the set changes.
	const json = '{"source":"Bootstrap Icons v' + version + ' (MIT)","icons":[\n'
		+ icons.map( ( icon ) => JSON.stringify( icon ) ).join( ',\n' )
		+ '\n]}\n';

	writeFileSync( OUT, json, 'utf8' );
	console.log( `Wrote ${ icons.length } icons to ${ OUT }` );
	if ( retainedOutline.length ) {
		console.log( `Retained as outline (${ retainedOutline.length }): ${ retainedOutline.join( ', ' ) }` );
	}
}

if ( process.argv[ 1 ] === fileURLToPath( import.meta.url ) ) {
	main();
}
