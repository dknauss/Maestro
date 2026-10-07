#!/usr/bin/env node
/**
 * npm audit wrapper with a narrow, documented dev-tooling allowlist.
 *
 * No exceptions are currently allowlisted.
 *
 * Closed exceptions, kept for the record:
 *
 * - GHSA-h67p-54hq-rp68 (js-yaml 3.x via @wordpress/env): closed by pinning
 *   js-yaml >= 3.15.2 in the lockfile.
 * - GHSA-vwc7-r8mq-g2x9 (adm-zip extraction follows destination symlinks,
 *   via @wordpress/env): closed 2026-09-21 by overriding adm-zip to 0.6.1,
 *   the first release outside its affected range. The same bump fixes
 *   GHSA-7q85-xj36-vmfc (adm-zip DoS via declared uncompressed size, < 0.6.1).
 * - GHSA-hp3w-g68c-fv3c (sprintf-js, every release affected, via
 *   @wordpress/env > js-yaml 3.x > argparse 1.x): closed 2026-10-07 by
 *   overriding js-yaml's argparse to 2.x, which has no sprintf-js dependency.
 *   Only js-yaml's own CLI (bin/js-yaml.js) uses argparse, and that CLI does
 *   not work with argparse 2.x; nothing here runs it. Drop the override once
 *   @wordpress/env moves to js-yaml 4+.
 *
 * Keep any future entry small, dev-scope only (never a runtime-shipped
 * dependency), and remove it as soon as upstream publishes a non-vulnerable
 * dependency path.
 */
import { spawnSync } from 'node:child_process';

const allowed = new Set( [] );
const result = spawnSync( 'npm', [ 'audit', '--json' ], { encoding: 'utf8' } );
const stdout = result.stdout || '{}';
let report;
try {
	report = JSON.parse( stdout );
} catch ( error ) {
	process.stdout.write( stdout );
	process.stderr.write( result.stderr || '' );
	process.exit( result.status || 1 );
}

const findings = [];
for ( const vulnerability of Object.values( report.vulnerabilities || {} ) ) {
	for ( const via of vulnerability.via || [] ) {
		if ( typeof via === 'string' ) {
			continue;
		}
		const url = via.url || '';
		const id = url.split( '/' ).pop();
		if ( ! allowed.has( id ) ) {
			findings.push( { name: vulnerability.name, title: via.title, severity: via.severity, url } );
		}
	}
}

if ( findings.length ) {
	console.error( JSON.stringify( findings, null, 2 ) );
	process.exit( 1 );
}

if ( ( report.metadata?.vulnerabilities?.total || 0 ) > 0 ) {
	console.log( 'npm audit: only allowlisted dev-tooling advisories found.' );
} else {
	console.log( 'npm audit: no vulnerabilities found.' );
}
