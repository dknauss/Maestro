/**
 * Maestro — stale editor files check (v1.11 Phase 34).
 *
 * Printed inline after maestro.js, so it always comes with the page and is
 * never stale itself. Each editor file states its own version:
 * maestro.js and maestro-logic.js set window.maestroBuild /
 * window.maestroLogicBuild, and maestro.css sets --maestro-build on :root.
 * When one differs from the server's version (or is missing, as in 1.10 and
 * older), the browser is running cached files from an older release, which
 * happens when something strips ?ver= from admin asset URLs and the host
 * caches static files for years. Show a notice with a Reload button that
 * refetches those files past the cache, then reloads the page.
 *
 * Kept free of maestro.js and jQuery on purpose: a stale maestro.js may not
 * run at all.
 *
 * Expects window.maestroBuildCheck = { version, title, reload, reloading }.
 */
( function () {
	'use strict';

	var C = window.maestroBuildCheck;
	if ( ! C || ! C.version || ! document.body ) {
		return;
	}

	function cssBuild() {
		var v = window.getComputedStyle( document.documentElement ).getPropertyValue( '--maestro-build' );
		return String( v || '' ).trim().replace( /^["']|["']$/g, '' );
	}

	// Each file's loaded URL, read from the page: that is the copy the browser
	// cached, whatever a plugin did to its query string.
	function srcOf( selector, attr ) {
		var node = document.querySelector( selector );
		return node ? node[ attr ] : '';
	}

	var stale = [];
	if ( window.maestroBuild !== C.version ) {
		stale.push( srcOf( 'script[src*="/assets/maestro.js"]', 'src' ) );
	}
	if ( window.maestroLogicBuild !== C.version ) {
		stale.push( srcOf( 'script[src*="/assets/maestro-logic.js"]', 'src' ) );
	}
	if ( cssBuild() !== C.version ) {
		stale.push( srcOf( 'link[href*="/assets/maestro.css"]', 'href' ) );
	}
	stale = stale.filter( Boolean );
	if ( ! stale.length ) {
		return;
	}

	if ( window.console && window.console.warn ) {
		window.console.warn( 'Maestro: these editor files are from an older version than ' + C.version + ':', stale );
	}

	var notice = document.createElement( 'div' );
	notice.className = 'notice notice-warning maestro-stale-notice';
	var p = document.createElement( 'p' );
	p.appendChild( document.createTextNode( C.title + ' ' ) );
	var btn = document.createElement( 'button' );
	btn.type = 'button';
	btn.className = 'button button-small maestro-stale-reload';
	btn.textContent = C.reload;
	p.appendChild( btn );
	notice.appendChild( p );

	btn.addEventListener( 'click', function () {
		btn.disabled = true;
		btn.textContent = C.reloading;
		// cache: 'reload' replaces the browser's cached copy; a plain
		// location.reload() no longer bypasses the cache in current browsers.
		Promise.all( stale.map( function ( url ) {
			return window.fetch( url, { cache: 'reload', credentials: 'same-origin' } ).catch( function () {} );
		} ) ).then( function () {
			window.location.reload();
		} );
	} );

	// Core's common.js moves notices below the page heading on DOM ready.
	var host = document.getElementById( 'wpbody-content' ) || document.body;
	host.insertBefore( notice, host.firstChild );
}() );
