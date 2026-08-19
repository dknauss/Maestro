/**
 * Shared post-preservation guard for block-editor screens.
 *
 * Maestro's admin-bar toggle is a plain link in both directions: entering edit
 * mode navigates, and so does leaving it. From the post editor with unsaved
 * changes either one trips core's beforeunload handler, and the user gets the
 * browser's generic "Leave site? Changes you made may not be saved" in response
 * to what looks like a mode switch.
 *
 * Both directions need the same answer, so both use this rather than each
 * growing its own copy — entry via maestro-entry.js, exit via maestro.js's
 * bindAdminBarExit(). #166 fixed only entry, and the asymmetry was immediately
 * visible to anyone who kept typing after entering edit mode.
 *
 * autosave(), deliberately NOT savePost(): on a published post savePost would
 * push in-progress edits live, which is a far worse bug than the prompt. Autosave
 * writes a revision without publishing, and is what WordPress already does on its
 * own timer, so it introduces no behaviour the user has not already accepted.
 *
 * Loaded only on block-editor screens. Every other admin screen keeps the
 * pre-existing zero-JS path, and consumers feature-detect this rather than
 * depending on it.
 */
( function () {
	function editor() {
		try {
			return window.wp.data.select( 'core/editor' );
		} catch ( e ) {
			return null;
		}
	}

	window.maestroPostGuard = {
		/**
		 * Is there unsaved work that we can actually preserve?
		 *
		 * False when the post is clean — autosaving then would litter drafts for
		 * anyone merely passing through the editor. False when it is not
		 * autosaveable (no permission, nothing saveable), in which case the
		 * caller should let the browser's own warning stand as the safety net.
		 *
		 * @return {boolean} True when save() is worth awaiting.
		 */
		needsSave: function () {
			var store = editor();

			if ( ! store || typeof store.isEditedPostDirty !== 'function' ) {
				return false;
			}

			if ( ! store.isEditedPostDirty() ) {
				return false;
			}

			if (
				typeof store.isEditedPostAutosaveable === 'function' &&
				! store.isEditedPostAutosaveable()
			) {
				return false;
			}

			return true;
		},

		/**
		 * Preserve the post. Always resolves — never rejects.
		 *
		 * A failure is not swallowed: the post stays dirty, so beforeunload still
		 * fires on the navigation that follows and the browser prompt appears.
		 * That is the correct outcome when preserving did not work.
		 *
		 * @return {Promise} Resolves once the attempt has finished.
		 */
		save: function () {
			return new Promise( function ( resolve ) {
				try {
					window.wp.data
						.dispatch( 'core/editor' )
						.autosave()
						.then( resolve, resolve );
				} catch ( e ) {
					resolve();
				}
			} );
		}
	};
} )();
