#!/usr/bin/env node
/**
 * Builds ux-gallery/index.html from the gallery capture: states.json (the states
 * and sizes) and one record per shot in ux-gallery/shots/*.json.
 *
 * Usage: node bin/build-ux-gallery.mjs [ux-gallery]
 * (bin/ux-gallery.sh runs it after the capture.)
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dir = resolve( process.argv[ 2 ] || 'ux-gallery' );
const { viewports, states } = JSON.parse( readFileSync( join( dir, 'states.json' ), 'utf8' ) );
const shots = new Map(
	readdirSync( join( dir, 'shots' ) )
		.filter( ( name ) => name.endsWith( '.json' ) )
		.map( ( name ) => {
			const shot = JSON.parse( readFileSync( join( dir, 'shots', name ), 'utf8' ) );
			return [ `${ shot.state }--${ shot.viewport }`, shot ];
		} )
);

const escape = ( text ) =>
	String( text ).replace( /[&<>"]/g, ( c ) => ( { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } )[ c ] );

const commit = process.env.GITHUB_SHA || '';
const generated = new Date().toISOString().replace( 'T', ' ' ).slice( 0, 16 ) + ' UTC';
let problems = 0;

const sections = states
	.map( ( state ) => {
		const cells = viewports
			.map( ( viewport ) => {
				const label = `<span class="size">${ escape( viewport.label ) } <span class="px">${ viewport.width }×${ viewport.height }</span></span>`;
				if ( state.absent && state.absent.viewports.includes( viewport.id ) ) {
					return `<figure class="cell absent ${ viewport.id }">${ label }<p>${ escape( state.absent.reason ) }</p></figure>`;
				}
				const shot = shots.get( `${ state.id }--${ viewport.id }` );
				if ( ! shot ) {
					problems++;
					return `<figure class="cell absent ${ viewport.id }">${ label }<p class="error">No capture: the run stopped before this one.</p></figure>`;
				}
				if ( shot.error ) {
					problems++;
				}
				const alt = `${ state.title }, ${ viewport.label.toLowerCase() } size`;
				return `<figure class="cell ${ viewport.id }">${ label }<a href="${ escape( shot.file ) }"><img src="${ escape( shot.file ) }" alt="${ escape( alt ) }" loading="lazy"></a>${
					shot.error ? `<p class="error">Could not reach this state: ${ escape( shot.error ) }</p>` : ''
				}</figure>`;
			} )
			.join( '' );
		return `<section id="${ escape( state.id ) }"><h2><a href="#${ escape( state.id ) }">${ escape( state.title ) }</a></h2><p>${ escape( state.note ) }</p><div class="row">${ cells }</div></section>`;
	} )
	.join( '\n' );

const nav = states.map( ( state ) => `<a href="#${ escape( state.id ) }">${ escape( state.title ) }</a>` ).join( '' );

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Maestro UX Gallery</title>
<style>
:root { --bg: #f6f7f7; --fg: #1d2327; --muted: #50575e; --card: #fff; --line: #dcdcde; --accent: #2271b1; --error: #b32d2e; }
@media (prefers-color-scheme: dark) { :root { --bg: #1d2327; --fg: #f0f0f1; --muted: #a7aaad; --card: #2c3338; --line: #3c434a; --accent: #72aee6; --error: #f86368; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
header, main { max-width: 1400px; margin: 0 auto; padding: 0 16px; }
header { padding-top: 24px; }
h1 { margin: 0 0 4px; font-size: 26px; }
header p { margin: 0 0 12px; color: var(--muted); max-width: 70ch; }
nav { display: flex; flex-wrap: wrap; gap: 6px 14px; padding: 10px 0 18px; border-bottom: 1px solid var(--line); }
a { color: var(--accent); }
section { padding: 22px 0; border-bottom: 1px solid var(--line); }
h2 { margin: 0; font-size: 20px; }
h2 a { color: inherit; text-decoration: none; }
section > p { margin: 2px 0 12px; color: var(--muted); }
.row { display: grid; grid-template-columns: 1.75fr 1fr 0.55fr; gap: 16px; align-items: start; }
.cell { margin: 0; background: var(--card); border: 1px solid var(--line); border-radius: 6px; padding: 8px; }
.size { display: block; font-weight: 600; margin-bottom: 6px; }
.px { font-weight: 400; color: var(--muted); font-size: 13px; }
.cell img { display: block; width: 100%; height: auto; border-radius: 3px; }
.absent p { color: var(--muted); font-size: 14px; margin: 0; }
.error { color: var(--error) !important; font-size: 14px; margin: 6px 0 0; }
footer { max-width: 1400px; margin: 0 auto; padding: 18px 16px 40px; color: var(--muted); font-size: 13px; }
@media (max-width: 800px) { .row { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<header>
<h1>Maestro UX gallery</h1>
<p>Every editor state in the Maestro UX lab, at desktop, tablet, and phone sizes. The lab is a WordPress site with a long list of plugin menus, image icons, a ten-item submenu, a custom role, named users in every role, and saved settings. Select a picture for full size.${
	problems ? ` <strong class="error">${ problems } capture${ problems === 1 ? '' : 's' } had a problem; see the red notes.</strong>` : ''
}</p>
<p><a href="https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/dknauss/Maestro/main/playground/blueprint-ux-lab.json">Open the UX lab in Playground</a> to try any of these yourself.</p>
<nav aria-label="States">${ nav }</nav>
</header>
<main>
${ sections }
</main>
<footer>Built ${ escape( generated ) }${
	commit ? ` from <a href="https://github.com/dknauss/Maestro/commit/${ escape( commit ) }">${ escape( commit.slice( 0, 7 ) ) }</a>` : ''
} by <code>npm run ux:gallery</code>.</footer>
</body>
</html>
`;

writeFileSync( join( dir, 'index.html' ), html );
console.log( `Wrote ${ join( dir, 'index.html' ) }: ${ states.length } states, ${ shots.size } shots, ${ problems } problem(s).` );
