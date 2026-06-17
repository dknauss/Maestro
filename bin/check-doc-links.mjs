#!/usr/bin/env node
/**
 * DOC-01 doc-link checker.
 *
 * Enumerates inline-code file-path references in the in-scope docs that resolve
 * to real repo files but are not yet wrapped in a markdown link. These are the
 * offenders that plan 08-02 must convert to proper links.
 *
 * CLI: node bin/check-doc-links.mjs [--json]
 *      Exits non-zero when any offenders are found.
 *
 * Exports: findOffenders(), scanText(), IN_SCOPE, CORE_EXCLUDE, STALE_REMAP
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname( fileURLToPath( import.meta.url ) );
const DEFAULT_ROOT = resolve( __dirname, '..' );

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** In-scope documents the checker scans. readme.txt is NEVER included. */
export const IN_SCOPE = [ 'README.md', 'SPEC.md', 'TESTING.md', 'docs/user-guide.md' ];

/**
 * File-path tokens that are always excluded from the offender list.
 * - WordPress-core refs that appear in prose but are not repo files.
 * - readme.txt: excluded entirely per DOC-01 scope (wp.org convention file,
 *   not a repo doc that gets linked in markdown).
 */
export const CORE_EXCLUDE = new Set( [
	'common.js',
	'menu-header.php',
	'wp-admin/menu-header.php',
	'readme.txt',
] );

/**
 * Stale-path remaps: token whose literal path is absent but maps to a real
 * file. These ARE reported as offenders — they must become links to the
 * corrected path in plan 08-02.
 */
export const STALE_REMAP = {
	'maestro.php': 'maestro-menu-editor.php',      // README repo-layout prose
	'icon.svg': '.wordpress-org/icon.svg',          // README repo-layout prose (bare ref)
	'global-setup.ts': 'tests/e2e/global-setup.ts', // TESTING / SPEC bare ref
};

// ---------------------------------------------------------------------------
// Token pattern
// ---------------------------------------------------------------------------

/**
 * Matches an inline-code span whose content looks like a file path with an
 * extension: one or more path-segment characters followed by a dot and an
 * extension.  Backtick delimiters captured in group 1 (unused) to allow the
 * regex to handle both single and double backticks, but in practice we use
 * a single-backtick inline-code scan.
 *
 * Token shape: /^[A-Za-z0-9_./-]+\.[A-Za-z0-9]+$/
 */
const TOKEN_RE = /`([A-Za-z0-9_./-]+\.[A-Za-z0-9]+)`/g;

// ---------------------------------------------------------------------------
// Fence-stripping
// ---------------------------------------------------------------------------

/**
 * Return a copy of `text` where every line inside a fenced code block (```
 * or ~~~) is replaced by an empty line.  Line positions are preserved so that
 * line numbers in scanText remain accurate.
 */
function stripFencedBlocks( text ) {
	const lines = text.split( '\n' );
	let inFence = false;
	let fenceMarker = null;

	for ( let i = 0; i < lines.length; i++ ) {
		const trimmed = lines[ i ].trimStart();
		if ( ! inFence ) {
			// Detect opening fence: ``` or ~~~, with optional language hint
			if ( /^(`{3,}|~{3,})/.test( trimmed ) ) {
				const match = trimmed.match( /^(`{3,}|~{3,})/ );
				fenceMarker = match[ 1 ][ 0 ]; // ` or ~
				inFence = true;
				lines[ i ] = ''; // blank out the fence line itself
			}
		} else {
			// Inside a fence: blank out the line; detect closing fence
			if ( new RegExp( '^\\' + fenceMarker + '{3,}\\s*$' ).test( trimmed ) ) {
				inFence = false;
				fenceMarker = null;
			}
			lines[ i ] = '';
		}
	}
	return lines.join( '\n' );
}

// ---------------------------------------------------------------------------
// Link / image membership detection
// ---------------------------------------------------------------------------

/**
 * Return true if the backtick span at `matchIndex` in `line` sits inside a
 * markdown link `[...](...)` or image `![...](...) construct — i.e. the token
 * is already linked or is part of image syntax.
 *
 * Approach: scan the line for all `[...](...)` and `![...](...)` ranges; if
 * our match falls entirely inside one of those ranges, skip it.
 */
function isInsideLinkOrImage( line, matchIndex, matchLength ) {
	// Pattern: optional ! + [ ... ] ( ... )
	// We look for the outermost [...](...)  or ![ ... ]( ... ) constructs.
	const linkRe = /!?\[([^\]]*)\]\(([^)]*)\)/g;
	let m;
	while ( ( m = linkRe.exec( line ) ) !== null ) {
		const start = m.index;
		const end = m.index + m[ 0 ].length;
		if ( matchIndex >= start && matchIndex + matchLength <= end ) {
			return true;
		}
	}
	return false;
}

// ---------------------------------------------------------------------------
// Core scanner (pure, unit-testable)
// ---------------------------------------------------------------------------

/**
 * Scan the text of a single document for bare inline-code file-path refs that
 * are not yet markdown links.
 *
 * @param {string} text     - Document content.
 * @param {string} docPath  - Absolute path of the document (for relative resolution).
 * @param {string} repoRoot - Absolute path of the repository root.
 * @returns {Offender[]}
 *
 * @typedef {{ file: string, line: number, token: string, resolvedPath: string, reason: string }} Offender
 */
export function scanText( text, docPath, repoRoot ) {
	const offenders = [];
	const docDir = dirname( docPath );

	// Strip fenced code blocks before scanning
	const stripped = stripFencedBlocks( text );
	const lines = stripped.split( '\n' );

	for ( let i = 0; i < lines.length; i++ ) {
		const line = lines[ i ];
		TOKEN_RE.lastIndex = 0;
		let m;
		while ( ( m = TOKEN_RE.exec( line ) ) !== null ) {
			const token = m[ 1 ];

			// Skip CORE_EXCLUDE tokens
			if ( CORE_EXCLUDE.has( token ) ) {
				continue;
			}

			// Skip if this backtick span is inside a markdown link or image
			if ( isInsideLinkOrImage( line, m.index, m[ 0 ].length ) ) {
				continue;
			}

			// Resolve: try token relative to the doc's directory first
			let resolvedPath = null;
			let reason = 'bare-path';

			const directPath = resolve( docDir, token );
			if ( existsSync( directPath ) ) {
				resolvedPath = directPath;
			} else {
				// Also try relative to repo root for tokens like 'docs/user-guide.md'
				const rootRelPath = resolve( repoRoot, token );
				if ( existsSync( rootRelPath ) ) {
					resolvedPath = rootRelPath;
				} else if ( STALE_REMAP[ token ] !== undefined ) {
					// Stale remap: literal path absent but remapped path exists
					const remapPath = resolve( repoRoot, STALE_REMAP[ token ] );
					if ( existsSync( remapPath ) ) {
						resolvedPath = remapPath;
						reason = 'stale-path';
					}
				}
			}

			// Not a resolvable file path — skip
			if ( resolvedPath === null ) {
				continue;
			}

			offenders.push( {
				file: docPath,
				line: i + 1, // 1-based
				token,
				resolvedPath,
				reason,
			} );
		}
	}

	return offenders;
}

// ---------------------------------------------------------------------------
// Top-level: scan all in-scope documents
// ---------------------------------------------------------------------------

/**
 * Scan all in-scope documents from the given repo root and return every
 * offender found.
 *
 * @param {string} [repoRoot] - Absolute path to the repository root. Defaults
 *   to the parent directory of this file.
 * @returns {Offender[]}
 */
export function findOffenders( repoRoot = DEFAULT_ROOT ) {
	const allOffenders = [];

	for ( const relPath of IN_SCOPE ) {
		const absPath = join( repoRoot, relPath );
		if ( ! existsSync( absPath ) ) {
			continue; // doc not present — skip silently
		}
		const text = readFileSync( absPath, 'utf8' );
		const docOffenders = scanText( text, absPath, repoRoot );
		allOffenders.push( ...docOffenders );
	}

	return allOffenders;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function formatOffender( o ) {
	return `${ o.file }:${ o.line }  \`${ o.token }\` -> ${ o.resolvedPath }  (${ o.reason })`;
}

if ( process.argv[ 1 ] === fileURLToPath( import.meta.url ) ) {
	const repoRoot = DEFAULT_ROOT;
	const jsonMode = process.argv.includes( '--json' );

	const offenders = findOffenders( repoRoot );

	if ( jsonMode ) {
		process.stdout.write( JSON.stringify( offenders, null, 2 ) + '\n' );
	} else {
		if ( offenders.length === 0 ) {
			process.stdout.write( 'No bare path refs found — all in-scope docs are link-clean.\n' );
		} else {
			for ( const o of offenders ) {
				process.stdout.write( formatOffender( o ) + '\n' );
			}
			process.stdout.write( `\n${ offenders.length } offender(s) found.\n` );
		}
	}

	process.exit( offenders.length > 0 ? 1 : 0 );
}
