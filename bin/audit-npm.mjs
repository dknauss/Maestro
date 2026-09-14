#!/usr/bin/env node
/**
 * npm audit wrapper with a narrow, documented dev-tooling allowlist.
 *
 * One exception is currently allowlisted:
 *
 * - GHSA-vwc7-r8mq-g2x9 (adm-zip extraction follows destination symlinks):
 *   pulled in by @wordpress/env's own adm-zip dependency, which this repo
 *   already overrides up to the newest release, 0.6.0 (see the `overrides`
 *   block in package.json). That is the top of the still-vulnerable range;
 *   no patched adm-zip exists upstream as of 2026-09. adm-zip is dev-only
 *   tooling (wp-env archive extraction), never shipped in the plugin
 *   runtime ZIP. Remove this entry as soon as upstream publishes a fixed
 *   version and bump the override to it.
 *
 * A prior exception (GHSA-h67p-54hq-rp68, js-yaml 3.x via @wordpress/env)
 * was closed by pinning js-yaml >= 3.15.2 in the lockfile. Keep any future
 * entry small, dev-scope only (never a runtime-shipped dependency), and
 * remove it as soon as upstream publishes a non-vulnerable dependency path.
 */
import { spawnSync } from 'node:child_process';

const allowed = new Set( [ 'GHSA-vwc7-r8mq-g2x9' ] );
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
