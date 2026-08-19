/**
 * Entry guard for the block editor.
 *
 * Maestro's admin-bar toggle is a plain link, so entering edit mode from the
 * post editor is a navigation. With unsaved changes that trips core's
 * beforeunload handler and the user gets the browser's generic "Leave site?
 * Changes you made may not be saved" — an alarming, uninformative prompt in
 * response to what looks like a mode switch.
 *
 * This preserves the work first, then goes.
 *
 * autosave(), deliberately NOT savePost(): on a published post savePost would
 * push the user's in-progress edits live, which would be a far worse bug than
 * the one being fixed. autosave() writes a revision without publishing, and is
 * what WordPress already does on its own timer, so it introduces no behaviour
 * the user has not already agreed to.
 *
 * Loaded only on block-editor screens, and only outside edit mode — the entry
 * case is the only one that navigates away from unsaved content.
 */
( function () {
	var toggle = document.getElementById( 'wp-admin-bar-maestro-toggle' );
	var link = toggle && toggle.querySelector( 'a' );

	if ( ! link ) {
		return;
	}

	link.addEventListener( 'click', function ( event ) {
		var editor;

		try {
			editor = window.wp.data.select( 'core/editor' );
		} catch ( e ) {
			return; // No editor store: nothing to preserve, behave as before.
		}

		if ( ! editor || typeof editor.isEditedPostDirty !== 'function' ) {
			return;
		}

		// Nothing unsaved: never write on the way out. Autosaving a clean post
		// would litter drafts for anyone who merely passes through the editor.
		if ( ! editor.isEditedPostDirty() ) {
			return;
		}

		// Cannot autosave (no permission, nothing saveable): let the navigation
		// proceed so the browser's own warning still stands as the safety net.
		if (
			typeof editor.isEditedPostAutosaveable === 'function' &&
			! editor.isEditedPostAutosaveable()
		) {
			return;
		}

		event.preventDefault();

		var href = link.href;
		var go = function () {
			window.location.assign( href );
		};

		/*
		 * Navigate on failure too. The work is not lost silently: beforeunload
		 * still fires for a programmatic navigation, so a post that is still
		 * dirty still raises the browser prompt — which is the correct outcome
		 * when preserving it did not work.
		 */
		try {
			window.wp.data.dispatch( 'core/editor' ).autosave().then( go, go );
		} catch ( e ) {
			go();
		}
	} );
} )();
