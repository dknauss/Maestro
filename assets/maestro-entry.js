/**
 * Entry guard for the block editor.
 *
 * Entering edit mode from the post editor is a navigation, so with unsaved
 * changes it trips core's beforeunload handler. Preserve the work first, then
 * go. The decision of what "preserve" means — and why autosave rather than
 * savePost — lives in maestro-post-guard.js, shared with the exit path so the
 * two cannot drift apart again.
 *
 * Loaded only on block-editor screens, and only outside edit mode. The exit
 * case is handled by maestro.js, which is what loads in edit mode.
 */
( function () {
	var toggle = document.getElementById( 'wp-admin-bar-maestro-toggle' );
	var link = toggle && toggle.querySelector( 'a' );
	var guard = window.maestroPostGuard;

	if ( ! link || ! guard ) {
		return;
	}

	link.addEventListener( 'click', function ( event ) {
		if ( ! guard.needsSave() ) {
			return;
		}

		event.preventDefault();

		var href = link.href;

		guard.save().then( function () {
			window.location.assign( href );
		} );
	} );
} )();
