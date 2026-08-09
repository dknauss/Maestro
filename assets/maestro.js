/**
 * Maestro — in-place editor.
 *
 * PHP localises maestroData with the precise DOM model (the <li> id for each
 * top-level item, ordered submenu slugs, pristine titles/icons). The editor
 * uses a click-to-select model with no per-item chrome: clicking a row selects
 * it (a subtle highlight) and the whole row is draggable to reorder — there are
 * no drag handles or per-item buttons. A single shared controls panel in the
 * bottom toolbar reflects the selected item. Every change (reorder, rename
 * commit, icon pick, visibility toggle, per-item reset) schedules a debounced
 * full-config POST.
 *
 * The menu is forced to a stable expanded state while editing: body.folded
 * and body.auto-fold are stripped on init and re-stripped if common.js puts
 * them back. The collapse button is neutralised. This is what makes editing
 * work in folded mode without the previous CSS layout fights.
 *
 * jQuery is used only for the sortable drag layer.
 */
( function ( $ ) {
	'use strict';

	if ( typeof window.maestroData === 'undefined' ) {
		return;
	}

	var D = window.maestroData;
	var I = D.i18n;

	// Flat working model: slug -> { title, icon, hiddenRoles, isSub, parent? }.
	// Null-prototype so a menu slug like "__proto__" (plugins register arbitrary
	// strings) can't pollute the prototype or shadow built-ins on lookup.
	var model = Object.create( null );
	var selectedKey = null;
	var panel = {};        // references into the shared panel
	var statusEl = null;   // status indicator span
	var saveTimer = null;
	var saveInFlight = false;  // a full-replace POST is currently running
	var savePending = false;   // another change arrived mid-flight; save again on land
	var inFlight = null;       // promise that settles when the whole save chain is done
	var savedClearTimer = null; // reverts the transient "Saved" tile back to idle
	var groupIdSeq = 0;    // monotonic counter for unique role-group heading ids

	/* ---------- helpers ---------------------------------------------------- */

	function pristineTop( slug ) {
		return ( D.pristine.top && D.pristine.top[ slug ] ) || { title: '', icon: '' };
	}
	function pristineSub( slug ) {
		return ( D.pristine.sub && D.pristine.sub[ slug ] ) || { title: '' };
	}
	function el( tag, cls, text ) {
		var n = document.createElement( tag );
		if ( cls ) { n.className = cls; }
		if ( text != null ) { n.textContent = text; }
		return n;
	}
	function closePopovers() {
		document.querySelectorAll( '.maestro-popover' ).forEach( function ( p ) { p.remove(); } );
	}
	function speak( message, politeness ) {
		if ( window.wp && window.wp.a11y && typeof window.wp.a11y.speak === 'function' ) {
			window.wp.a11y.speak( message, politeness );
		}
	}
	function cssEscape( s ) {
		if ( window.CSS && window.CSS.escape ) { return window.CSS.escape( s ); }
		return String( s ).replace( /(["\\\]])/g, '\\$1' );
	}
	/**
	 * Locate the <li> bound to a model key.
	 *
	 * A top-level item and a submenu it renders can share the same raw slug
	 * (WordPress's self-link convention, e.g. Posts + All Posts both map to
	 * edit.php) — `[data-maestro-slug="…"]` alone is ambiguous in that case,
	 * always resolving to whichever <li> comes first in document order (the
	 * top-level one, since it wraps the nested submenu). Submenu rows carry
	 * their qualified `parent>child` identity in a SEPARATE attribute
	 * (data-maestro-key) and the `.maestro-subitem` class, so scoping the
	 * lookup by isSub + the matching attribute/class pair disambiguates the
	 * two rows even when their slug values collide.
	 */
	function liForKey( key ) {
		var m = model[ key ];
		if ( m && m.isSub ) {
			return document.querySelector( '.wp-submenu li.maestro-subitem[data-maestro-key="' + cssEscape( key ) + '"]' );
		}
		return document.querySelector( '#adminmenu > li.maestro-item[data-maestro-slug="' + cssEscape( key ) + '"]' );
	}

	/**
	 * Resolve the rendered slug a submenu <li> actually links to, from its
	 * anchor's href — a stable, DOM-content-derived attribute — rather than
	 * trusting the child's position in `.wp-submenu`. WordPress renders each
	 * submenu href as `admin_url( $slug )`; decoding the `&amp;` entity core
	 * bakes into query-string hrefs lets a plain substring match against the
	 * raw slug PHP localized work without full URL parsing.
	 */
	function resolveSubmenuHref( li ) {
		var a = li.querySelector( 'a' );
		if ( ! a ) { return ''; }
		return ( a.getAttribute( 'href' ) || '' ).replace( /&amp;/g, '&' );
	}

	/**
	 * Match a submenu child to its rendered <li> by resolved href/slug — the
	 * minimal A1b fix — instead of zipping `node.submenu` to `.wp-submenu > li`
	 * by array index. Falls back to the next unclaimed <li> (old positional
	 * behavior) only when no href match is found, so an atypical anchor markup
	 * still gets SOME binding rather than none.
	 */
	function findSubmenuLi( candidates, claimed, slug ) {
		var i;
		for ( i = 0; i < candidates.length; i++ ) {
			if ( claimed.indexOf( candidates[ i ] ) !== -1 ) { continue; }
			var href = resolveSubmenuHref( candidates[ i ] );
			if ( href && href.indexOf( slug ) !== -1 ) {
				return candidates[ i ];
			}
		}
		for ( i = 0; i < candidates.length; i++ ) {
			if ( claimed.indexOf( candidates[ i ] ) === -1 ) {
				return candidates[ i ];
			}
		}
		return null;
	}

	/* ---------- modified-state indicator ----------------------------------- */

	/**
	 * Refresh the non-color "modified" indicator on a menu row.
	 *
	 * Driven by window.maestroLogic.diffItem (pure, unit-tested in Plan 01).
	 * When the item differs from its pristine default:
	 *   - adds class .maestro-modified to the <li>
	 *   - injects a <span class="maestro-modified-badge" aria-hidden="true">•</span>
	 *     glyph (visible, high-contrast) PLUS a sibling
	 *     <span class="screen-reader-text">(modified)</span> (AT-only)
	 * When the item matches its pristine default: removes everything.
	 *
	 * WCAG 1.4.1 (color alone): the glyph provides a perceivable non-color signal.
	 * WCAG 1.4.11 (graphical objects): neutral #c3c4c7 on #1d2327 ≈ 8.6:1 contrast
	 * (UX-12/UX-13: no amber — colour is reserved for errors + destructive actions).
	 * AT users hear "(modified)" via the screen-reader-text span.
	 */
	function refreshModifiedIndicator( key ) {
		var m = model[ key ];
		if ( ! m ) { return; }

		// Submenu pristine defaults are keyed by the RAW rendered slug
		// (D.pristine.sub), not the qualified model key — use m.slug.
		var def = m.isSub ? pristineSub( m.slug ) : pristineTop( key );
		var result = window.maestroLogic.diffItem( m, def );

		var li = liForKey( key );
		if ( ! li ) { return; }

		if ( result.modified ) {
			li.classList.add( 'maestro-modified' );

			// Append badge/sr-text to the row label — same target updateMenuLabel()
			// uses — so on top-level items with a submenu the badge sits beside the
			// label name rather than after the <ul.wp-submenu>.
			var labelTarget = m.isSub
				? li.querySelector( 'a' )
				: li.querySelector( '.wp-menu-name' );

			if ( labelTarget && ! labelTarget.querySelector( '.maestro-modified-badge' ) ) {
				var badge = el( 'span', 'maestro-modified-badge' );
				badge.setAttribute( 'aria-hidden', 'true' );
				badge.textContent = '•'; // bullet •
				labelTarget.appendChild( badge );
			}
			if ( labelTarget && ! labelTarget.querySelector( '.maestro-modified-sr' ) ) {
				var srText = el( 'span', 'screen-reader-text maestro-modified-sr' );
				srText.textContent = I.modified;
				labelTarget.appendChild( srText );
			}
		} else {
			li.classList.remove( 'maestro-modified' );
			var oldBadge = li.querySelector( '.maestro-modified-badge' );
			if ( oldBadge ) { oldBadge.remove(); }
			var oldSr = li.querySelector( '.maestro-modified-sr' );
			if ( oldSr ) { oldSr.remove(); }
		}

		// Keep the panel Reset button in sync when the change is to the selected item.
		updateResetButton( key, result.modified );
	}

	/* ---------- folded-mode override -------------------------------------- */

	// The menu must edit in its expanded form. Strip folded/auto-fold on init,
	// re-strip if common.js writes them back, and neutralise the collapse
	// control for the duration of the session.
	function forceUnfold() {
		var body = document.body;
		body.classList.remove( 'folded', 'auto-fold' );

		var mo = new MutationObserver( function () {
			if ( body.classList.contains( 'folded' ) || body.classList.contains( 'auto-fold' ) ) {
				body.classList.remove( 'folded', 'auto-fold' );
			}
		} );
		mo.observe( body, { attributes: true, attributeFilter: [ 'class' ] } );

		var collapse = document.getElementById( 'collapse-menu' );
		if ( collapse ) {
			collapse.addEventListener( 'click', function ( e ) {
				e.preventDefault();
				e.stopImmediatePropagation();
			}, true );
		}
	}

	/* ---------- build model + wire the DOM --------------------------------- */

	function init() {
		document.body.classList.add( 'maestro-editing' );
		forceUnfold();

		D.menu.forEach( function ( node ) {
			model[ node.slug ] = {
				title: node.title,
				icon: node.icon,
				hiddenRoles: node.hiddenRoles.slice(),
				isSub: false,
				// COMPAT-10 (REVISED): child_hidden_roles is a parent-only,
				// independent role list ("Hide its sub-items from:"), seeded from
				// the resolved value get_menu_model() already computes server-side.
				// hasChildren gates the second popover role group to parents that
				// actually have a submenu (20-CONTEXT.md locked UI).
				childHiddenRoles: ( node.childHiddenRoles || [] ).slice(),
				// ROLE-02: per-user axes, seeded from the resolved id+name pairs
				// get_menu_model() already computed. Held as pair objects (not bare
				// ids) so a chip can render its label without a lookup.
				hiddenUsers: ( node.hiddenUsers || [] ).slice(),
				childHiddenUsers: ( node.childHiddenUsers || [] ).slice(),
				hasChildren: node.submenu.length > 0
			};

			var li = node.liId ? document.getElementById( node.liId ) : null;
			if ( ! li ) { return; }
			li.dataset.maestroSlug = node.slug;
			li.classList.add( 'maestro-item' );
			if ( node.hiddenRoles.length ) { li.classList.add( 'maestro-has-hidden' ); }

			// Submenu children: each gets its OWN model entry keyed by its
			// qualified `parent>child` identity (from get_menu_model(),
			// COMPAT-04) — a submenu sharing its slug with the top-level
			// parent (WordPress's self-link convention, e.g. Posts + All
			// Posts both map to edit.php) is now independently addressable
			// instead of being collapsed into one shared model entry. Bound
			// to its rendered <li> by resolved anchor href/slug (a stable
			// attribute), not `.wp-submenu` array position — the minimal
			// A1b fix (full positional-association hardening is deferred).
			var subLis = Array.prototype.slice.call(
				li.querySelectorAll( '.wp-submenu > li:not(.wp-submenu-head)' )
			);
			var claimedSubLis = [];
			node.submenu.forEach( function ( child ) {
				var key = child.qualifiedKey || ( node.slug + '>' + child.slug );
				model[ key ] = {
					slug: child.slug, // raw slug: pristine-default + sub_order lookups
					title: child.title,
					icon: '',
					hiddenRoles: child.hiddenRoles.slice(),
					hiddenUsers: ( child.hiddenUsers || [] ).slice(),
					isSub: true,
					parent: node.slug
				};

				var sli = findSubmenuLi( subLis, claimedSubLis, child.slug );
				if ( ! sli ) { return; }
				claimedSubLis.push( sli );
				sli.dataset.maestroSlug = child.slug; // bare: sub_order + legacy consumers
				sli.dataset.maestroKey  = key;         // qualified: model identity / selection
				sli.classList.add( 'maestro-subitem' );
				if ( child.hiddenRoles.length ) { sli.classList.add( 'maestro-has-hidden' ); }
			} );
		} );

		buildToolbar();
		bindMenuSelection();
		initSortables();
		// First-run guided tour — after the toolbar/panel and selection wiring
		// exist, since the tour anchors to them and selects an item.
		maybeFirstRunTour();

		// Refresh indicators for any pre-existing (already-saved) overrides so
		// they show the modified badge immediately on page load, not just after
		// the first mutation.
		Object.keys( model ).forEach( function ( slug ) {
			refreshModifiedIndicator( slug );
		} );
	}

	/* ---------- click-to-select ------------------------------------------- */

	function bindMenuSelection() {
		var menu = document.getElementById( 'adminmenu' );
		if ( ! menu ) { return; }

		menu.addEventListener( 'click', function ( e ) {
			// Suppress navigation on every menu click while editing.
			var a = e.target.closest( 'a' );
			if ( a ) { e.preventDefault(); }

			// Popovers may be placed over the menu region — let them handle their own clicks.
			if ( e.target.closest( '.maestro-popover' ) ) {
				return;
			}

			var li = e.target.closest( 'li.maestro-item, li.maestro-subitem' );
			if ( ! li ) { return; }
			selectItem( li, { focusPanel: true } );
		}, true );

		menu.addEventListener( 'keydown', function ( e ) {
			if ( e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar' ) {
				return;
			}
			if ( e.target.closest( '.maestro-popover' ) ) {
				return;
			}

			var li = e.target.closest( 'li.maestro-item, li.maestro-subitem' );
			if ( ! li ) { return; }
			e.preventDefault();
			selectItem( li, { focusPanel: true } );
		}, true );

		menu.addEventListener( 'keydown', function ( e ) {
			if ( ! e.altKey || ( e.key !== 'ArrowUp' && e.key !== 'ArrowDown' ) ) {
				return;
			}
			// Guard: ignore keypresses inside a popover or form control.
			if ( e.target.closest( '.maestro-popover, input, button' ) ) {
				return;
			}
			// Require a currently selected maestro item.
			if ( ! selectedKey || ! model[ selectedKey ] ) {
				return;
			}

			e.preventDefault();

			var dir = e.key === 'ArrowUp' ? 'up' : 'down';
			moveSelected( dir, { restoreFocusToAnchor: true } );
		} );
	}

	/**
	 * Move the currently selected item one position up or down.
	 *
	 * Shared by both the ▲/▼ panel buttons and the keyboard accelerator. Reuses
	 * the existing reorderMove/insertBefore path (BUG-06 separator-preserving
	 * single-node move).
	 *
	 * opts.restoreFocusToAnchor — when true (keyboard path), restores focus to
	 * the moved row's anchor so the next keypress chains. When false/omitted
	 * (button path), focus stays on the button naturally (it is not detached by
	 * insertBefore) so repeated clicks chain.
	 *
	 * @param {'up'|'down'} dir
	 * @param {{ restoreFocusToAnchor?: boolean }} [opts]
	 */
	function moveSelected( dir, opts ) {
		opts = opts || {};
		if ( ! selectedKey || ! model[ selectedKey ] ) { return; }

		var m = model[ selectedKey ];
		var menu = document.getElementById( 'adminmenu' );
		var currentKeys, parentUl;

		if ( m.isSub ) {
			// Submenu scope: siblings under the same parent, identified by
			// their qualified key (stable even when a sibling's bare slug
			// collides with the top-level parent's).
			var parentLi = liForKey( m.parent );
			parentUl = parentLi ? parentLi.querySelector( '.wp-submenu' ) : null;
			if ( ! parentUl ) { return; }
			currentKeys = Array.prototype.map.call(
				parentUl.querySelectorAll( 'li.maestro-subitem[data-maestro-key]' ),
				function ( n ) { return n.dataset.maestroKey; }
			);
		} else {
			// Top-level scope.
			parentUl = menu;
			currentKeys = Array.prototype.map.call(
				menu.querySelectorAll( 'li.menu-top.maestro-item[data-maestro-slug]' ),
				function ( n ) { return n.dataset.maestroSlug; }
			);
		}

		var newOrder = window.maestroLogic.reorderMove( currentKeys, selectedKey, dir );

		// Detect boundary clamp: order unchanged means the item is already at the edge.
		if ( newOrder.join( '\n' ) === currentKeys.join( '\n' ) ) {
			var boundaryMsg = dir === 'up'
				? I.moveAtTop.replace( '%s', m.title )
				: I.moveAtBottom.replace( '%s', m.title );
			speak( boundaryMsg, 'assertive' );
			return;
		}

		// Physically move ONLY the selected node by one position. All other nodes —
		// including li.wp-menu-separator and any non-maestro-item children — stay put.
		var selectedNode = liForKey( selectedKey );
		var maestroChildren = Array.prototype.slice.call(
			parentUl.querySelectorAll(
				m.isSub
					? 'li.maestro-subitem[data-maestro-key]'
					: 'li.menu-top.maestro-item[data-maestro-slug]'
			)
		);
		var currentIdx = maestroChildren.indexOf( selectedNode );
		if ( dir === 'up' && currentIdx > 0 ) {
			parentUl.insertBefore( selectedNode, maestroChildren[ currentIdx - 1 ] );
		} else if ( dir === 'down' && currentIdx < maestroChildren.length - 1 ) {
			var afterNode = maestroChildren[ currentIdx + 1 ];
			parentUl.insertBefore( selectedNode, afterNode.nextSibling ); // nextSibling null => appendChild semantics
		}

		// Keyboard path: re-appending nodes detaches them, dropping focus to <body>.
		// Restore focus to the moved item's anchor so the next Alt+Arrow chains.
		// Button path: the button lives in the fixed toolbar panel (not in #adminmenu),
		// so insertBefore does not detach it — focus stays on the button naturally.
		if ( opts.restoreFocusToAnchor ) {
			var movedLi = liForKey( selectedKey );
			if ( movedLi ) {
				var focusTarget = movedLi.querySelector( 'a' ) || movedLi;
				focusTarget.focus( { preventScroll: true } );
			}
		}

		// Announce the new position politely.
		var newIndex = newOrder.indexOf( selectedKey ) + 1;
		var total = newOrder.length;
		var movedMsg = I.moved
			.replace( '%1$s', m.title )
			.replace( '%2$s', dir === 'down' ? I.dirDown : I.dirUp )
			.replace( '%3$d', String( newIndex ) )
			.replace( '%4$d', String( total ) );
		speak( movedMsg );

		// Reuse the existing debounced autosave: buildConfig() reads the new DOM order.
		scheduleAutosave();
	}

	function selectItem( li, opts ) {
		// Submenu rows are identified by their qualified key (data-maestro-key);
		// top-level rows stay bare-slug-identified (data-maestro-slug) — the two
		// attributes never collide even when the underlying slug does.
		var key = li.classList.contains( 'maestro-subitem' )
			? li.dataset.maestroKey
			: li.dataset.maestroSlug;
		if ( ! key || ! model[ key ] ) { return; }
		opts = opts || {};

		document.querySelectorAll( '.maestro-selected' ).forEach( function ( n ) {
			n.classList.remove( 'maestro-selected' );
			n.removeAttribute( 'aria-keyshortcuts' );
		} );
		selectedKey = key;
		li.classList.add( 'maestro-selected' );
		// The ▲/▼ panel buttons are the discoverable reorder affordance (OS-independent,
		// Tab-reachable). No aria-keyshortcuts advertised — Alt+Arrow was macOS-broken.
		populatePanel( key );
		closePopovers();
		if ( opts.focusPanel && panel.rename ) {
			try {
				panel.rename.focus( { preventScroll: true } );
			} catch ( err ) {
				panel.rename.focus();
			}
		}
	}

	/* ---------- toolbar + shared controls panel --------------------------- */

	/**
	 * Give a button the icon-only-ready structure required by Gap-2 compression.
	 *
	 * Appends to the button:
	 *   1. An aria-hidden dashicon <span> (the visual glyph).
	 *   2. A <span class="maestro-btn-label"> holding the visible text.
	 *
	 * Sets `aria-label` to the full human-readable label as the authoritative
	 * accessible name at ALL widths (WCAG 4.1.2). At <=600px the CSS hides
	 * .maestro-btn-label so only the dashicon shows; aria-label still provides
	 * the name to AT.
	 *
	 * @param {HTMLButtonElement} btn    The button element to populate.
	 * @param {string}            glyph  A dashicons-* class name.
	 * @param {string}            label  The full human-readable label.
	 */
	function iconButton( btn, glyph, label ) {
		btn.setAttribute( 'aria-label', label );
		// Visible hover hint for sighted users now that the text label is hidden
		// at all widths (the .maestro-btn-label span stays in the DOM for the
		// accessible name fallback, but is display:none via CSS).
		btn.setAttribute( 'title', label );

		var icon = el( 'span', 'dashicons ' + glyph );
		icon.setAttribute( 'aria-hidden', 'true' );
		btn.appendChild( icon );

		var labelSpan = el( 'span', 'maestro-btn-label', label );
		btn.appendChild( labelSpan );
	}

	function buildToolbar() {
		var bar = el( 'div', 'maestro-toolbar' );

		// Transient save-status — aria-live, empty at idle so no announcement fires.
		// Icon-only: the per-state ::before dashicon (spinner/check/warning) is the
		// visible cue; the word ("Saving…"/"Saved"/…) lives in a screen-reader-only
		// child so assistive tech still announces it via the live region.
		statusEl = el( 'span', 'maestro-status maestro-status-idle' );
		statusEl.setAttribute( 'role', 'status' );
		statusEl.setAttribute( 'aria-live', 'polite' );
		statusEl.setAttribute( 'aria-atomic', 'true' );
		statusEl.appendChild( el( 'span', 'maestro-status-text screen-reader-text' ) );
		bar.appendChild( statusEl );

		// Shared panel — empty/hidden until something is selected.
		var p = el( 'div', 'maestro-panel' );
		p.hidden = true;

		// UX-05: the selected item's name is screen-reader-only — the buttons are
		// self-explanatory and the visible breadcrumb ate horizontal space. Kept in
		// the DOM (populated in populatePanel) so SR users still get item/submenu
		// context; `screen-reader-text` is WordPress admin's always-present SR class.
		var label = el( 'span', 'maestro-panel-label screen-reader-text' );

		// Accessible name for the rename input. WCAG 2.5.3 (Label in Name): the
		// accessible name must contain the VISIBLE label text — which here is the
		// placeholder "Menu label" (the only visible hint when the field is empty) —
		// so speech-control users who say "Menu label" reach this control. A
		// placeholder alone is NOT an accessible name, so the visually-hidden <label>
		// carries the same string.
		var renameLabel = el( 'label', 'screen-reader-text' );
		renameLabel.setAttribute( 'for', 'maestro-rename-field' );
		renameLabel.textContent = I.renamePlaceholder;
		var rename = el( 'input', 'maestro-rename-input' );
		rename.type = 'text';
		rename.id = 'maestro-rename-field';
		rename.placeholder = I.renamePlaceholder;
		rename.addEventListener( 'keydown', function ( e ) {
			if ( e.key === 'Enter' ) {
				e.preventDefault();
				rename.blur();
			} else if ( e.key === 'Escape' ) {
				if ( selectedKey ) { rename.value = model[ selectedKey ].title; }
				rename.blur();
			}
		} );
		rename.addEventListener( 'blur', commitRename );

		// ▲/▼ reorder buttons — Tab-reachable from the rename input, OS-independent.
		// These are the primary reorder affordance; the existing Alt+Arrow path remains
		// in the keyboard handler for backward-compat but is no longer advertised via
		// aria-keyshortcuts (it was macOS-broken). Focus stays on the button after a
		// move (the button lives in the fixed toolbar, not in #adminmenu, so insertBefore
		// does not detach it) — repeated clicks chain correctly.
		var moveUp   = el( 'button', 'button maestro-move-up' );
		moveUp.type  = 'button';
		iconButton( moveUp, 'dashicons-arrow-up-alt2', I.moveUp );
		moveUp.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			moveSelected( 'up' );
		} );

		var moveDown   = el( 'button', 'button maestro-move-down' );
		moveDown.type  = 'button';
		iconButton( moveDown, 'dashicons-arrow-down-alt2', I.moveDown );
		moveDown.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			moveSelected( 'down' );
		} );

		var iconBtn = el( 'button', 'button maestro-icon-btn' );
		iconBtn.type = 'button';
		iconButton( iconBtn, 'dashicons-art', I.icon );
		iconBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			openIconPicker( iconBtn );
		} );

		var visBtn = el( 'button', 'button maestro-vis-btn' );
		visBtn.type = 'button';
		iconButton( visBtn, 'dashicons-visibility', I.visibility );
		visBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			openVisibilityPicker( visBtn );
		} );

		var resetItemBtn = el( 'button', 'button maestro-reset-item' );
		resetItemBtn.type = 'button';
		iconButton( resetItemBtn, 'dashicons-undo', I.resetItem );
		resetItemBtn.addEventListener( 'click', resetSelected );

		// BUG-02: the rename input comes first so its left edge is fixed and never
		// shifts as the selected item's name length changes; the breadcrumb label
		// (kept for "what is targeted" context) sits to its right.
		// Move buttons come last in DOM order — after rename input — so Tab order is:
		// rename → ▲ → ▼ → Icon → Visibility → Reset Item.
		p.appendChild( renameLabel );
		p.appendChild( rename );
		p.appendChild( label );
		p.appendChild( moveUp );
		p.appendChild( moveDown );
		p.appendChild( iconBtn );
		p.appendChild( visBtn );
		p.appendChild( resetItemBtn );
		bar.appendChild( p );

		panel = {
			root:     p,
			label:    label,
			rename:   rename,
			moveUp:   moveUp,
			moveDown: moveDown,
			iconBtn:  iconBtn,
			visBtn:   visBtn,
			resetBtn: resetItemBtn,
		};

		var right = el( 'div', 'maestro-toolbar-right' );

		// Reset All keeps its visible text label (Label mix preserved, CONTEXT
		// §WP-native styling) — unlike the five icon-only panel buttons, the CSS
		// does not hide its .maestro-btn-label span. aria-label + title still
		// carry the accessible name/hover hint; Reset All is still guarded by
		// the confirm dialog in doResetAll(). Reset All additionally carries
		// button-link-delete — core's destructive text-link idiom (red text,
		// no box). The single entry/exit lives on the admin-bar (WP Toolbar)
		// toggle now (class-admin-bar.php) — no bottom-toolbar Exit control.
		var resetAll = el( 'button', 'button maestro-reset-all button-link-delete' );
		resetAll.type = 'button';
		iconButton( resetAll, 'dashicons-backup', I.resetAll );
		resetAll.addEventListener( 'click', doResetAll );

		// Replay the guided tour (UX-11). The "?" glyph is the conventional help
		// affordance; it sits ahead of Reset All so the destructive control
		// stays at the trailing edge.
		var help = el( 'button', 'button maestro-tour-help' );
		help.type = 'button';
		iconButton( help, 'dashicons-editor-help', I.tourHelp );
		help.addEventListener( 'click', startTour );

		right.appendChild( help );
		right.appendChild( resetAll );
		bar.appendChild( right );

		document.body.appendChild( bar );

		bindAdminBarExit();
	}

	// UX-09: the WP Toolbar (admin-bar) "Exit Menu Editor" toggle is the single
	// entry/exit — it replaces the removed bottom-toolbar Exit control. The
	// admin-bar node is a plain navigation link, so its click is intercepted
	// (while editing) to flush any pending/in-flight save first — the same
	// save-flush guarantee the removed Exit control provided via onExit — then
	// navigate to the link's href. The href itself (remove_query_arg) is left
	// entirely to class-admin-bar.php; this only defers the navigation.
	function bindAdminBarExit() {
		var toggle = document.querySelector( '#wp-admin-bar-maestro-toggle > .ab-item' );
		if ( ! toggle ) { return; }
		toggle.addEventListener( 'click', function ( e ) {
			if ( ! saveTimer && ! inFlight ) { return; }
			e.preventDefault();
			var href = toggle.href;
			waitForSaveIdle().then( function () {
				window.location.href = href;
			} );
		} );
	}

	function populatePanel( key ) {
		var m = model[ key ];
		if ( ! m ) { return; }
		panel.root.hidden = false;

		var crumb = m.isSub
			? ( ( model[ m.parent ] ? model[ m.parent ].title : m.parent ) + ' › ' + m.title )
			: m.title;
		panel.label.textContent = crumb;

		panel.rename.value = m.title;

		// Icon picker is top-level only; submenu items have no icon column.
		panel.iconBtn.style.display = m.isSub ? 'none' : '';

		// Reflect modified state on the reset button: enabled when modified,
		// dimmed + disabled when there is nothing to reset (no amber — UX-12/UX-13).
		// Submenu pristine defaults are keyed by the RAW rendered slug, not the
		// qualified model key.
		var def = m.isSub ? pristineSub( m.slug ) : pristineTop( key );
		updateResetButton( key, window.maestroLogic.diffItem( m, def ).modified );
	}

	// Sync the per-item Reset button to the selected item's modified state so its
	// enabled/dimmed state means "you have changes to undo".
	function updateResetButton( key, isModified ) {
		if ( ! panel.resetBtn || key !== selectedKey ) { return; }
		panel.resetBtn.classList.toggle( 'is-modified', isModified );
		panel.resetBtn.disabled = ! isModified;
	}

	/* ---------- rename (single, idempotent) -------------------------------- */

	function commitRename() {
		if ( ! selectedKey ) { return; }
		var m = model[ selectedKey ];
		var raw = panel.rename.value.trim();
		var next = raw || m.title;
		if ( next === m.title ) {
			panel.rename.value = m.title;
			return;
		}
		m.title = next;
		updateMenuLabel( selectedKey );
		populatePanel( selectedKey ); // refresh breadcrumb for renamed parents
		refreshModifiedIndicator( selectedKey );
		scheduleAutosave();
	}

	function updateMenuLabel( key ) {
		var li = liForKey( key );
		if ( ! li ) { return; }
		var m = model[ key ];
		var target = m.isSub
			? li.querySelector( 'a' )
			: li.querySelector( '.wp-menu-name' );
		if ( target ) { target.textContent = m.title; }
	}

	/* ---------- icon picker (top-level only) ------------------------------- */

	function openIconPicker( anchorBtn ) {
		closePopovers();
		if ( ! selectedKey || model[ selectedKey ].isSub ) { return; }

		var slug = selectedKey; // top-level only here — bare slug === model key
		var sets = D.iconSets || [];

		var pop = el( 'div', 'maestro-popover maestro-icon-popover' );
		pop.setAttribute( 'role', 'dialog' );
		pop.setAttribute( 'aria-modal', 'true' );
		pop.setAttribute( 'aria-label', I.iconDialog );

		// --- choose an icon, persist, close ---
		function choose( iconId ) {
			model[ slug ].icon = iconId;
			var li = liForKey( slug );
			if ( li ) { applyIconPreview( li, iconId || 'none' ); }
			closePopovers();
			anchorBtn.focus();
			refreshModifiedIndicator( slug );
			scheduleAutosave();
		}

		// --- search ---
		var search = el( 'input', 'maestro-icon-search' );
		search.type = 'search';
		search.setAttribute( 'aria-label', I.iconSearch );
		search.placeholder = I.iconSearch;
		pop.appendChild( search );

		// --- "no icon" escape hatch ---
		var noneBtn = el( 'button', 'button maestro-icon-none', I.iconNone );
		noneBtn.type = 'button';
		noneBtn.title = I.iconNoneHint;
		if ( ! model[ slug ].icon ) { noneBtn.setAttribute( 'aria-pressed', 'true' ); }
		noneBtn.addEventListener( 'click', function ( e ) { e.preventDefault(); choose( '' ); } );
		pop.appendChild( noneBtn );

		// --- tabs ---
		var tablist = el( 'div', 'maestro-icon-tabs' );
		tablist.setAttribute( 'role', 'tablist' );
		tablist.setAttribute( 'aria-label', I.iconDialog );
		pop.appendChild( tablist );

		var panels = [];
		var tabs   = [];

		sets.forEach( function ( set, si ) {
			var tabId   = 'maestro-tab-' + set.id;
			var panelId = 'maestro-panel-' + set.id;

			var tab = el( 'button', 'maestro-icon-tab', set.label );
			tab.type = 'button';
			tab.id = tabId;
			tab.setAttribute( 'role', 'tab' );
			tab.setAttribute( 'aria-controls', panelId );
			tab.setAttribute( 'aria-selected', si === 0 ? 'true' : 'false' );
			tab.tabIndex = si === 0 ? 0 : -1;
			tablist.appendChild( tab );
			tabs.push( tab );

			var panel = el( 'div', 'maestro-icon-grid' );
			panel.id = panelId;
			panel.setAttribute( 'role', 'tabpanel' );
			panel.setAttribute( 'aria-labelledby', tabId );
			panel.hidden = si !== 0;

			set.icons.forEach( function ( ic ) {
				var b = el( 'button', 'maestro-icon-cell' + ( set.type === 'class' ? ' dashicons ' + ic.class : ' maestro-icon-img' ) );
				b.type = 'button';
				b.title = ic.label;
				b.setAttribute( 'aria-label', ic.label );
				b.dataset.maestroName = ( ic.label || '' ).toLowerCase();
				b.tabIndex = -1;
				if ( model[ slug ].icon === ic.id ) {
					b.classList.add( 'is-current' );
					b.setAttribute( 'aria-pressed', 'true' );
				}
				if ( set.type === 'data' ) {
					var im = el( 'img' );
					im.src = ic.src;
					im.alt = '';
					b.appendChild( im );
				}
				b.addEventListener( 'click', function ( e ) { e.preventDefault(); choose( ic.id ); } );
				panel.appendChild( b );
			} );

			pop.appendChild( panel );
			panels.push( panel );

			tab.addEventListener( 'click', function () { activateTab( si ); } );
		} );

		function activateTab( idx ) {
			tabs.forEach( function ( t, i ) {
				t.setAttribute( 'aria-selected', i === idx ? 'true' : 'false' );
				t.tabIndex = i === idx ? 0 : -1;
				panels[ i ].hidden = i !== idx;
			} );
			tabs[ idx ].focus();
			applyFilter();
		}

		// Arrow-key tab switching (WAI-ARIA tabs pattern).
		tablist.addEventListener( 'keydown', function ( e ) {
			var cur = tabs.findIndex( function ( t ) { return t.getAttribute( 'aria-selected' ) === 'true'; } );
			if ( e.key === 'ArrowRight' ) { e.preventDefault(); activateTab( ( cur + 1 ) % tabs.length ); }
			else if ( e.key === 'ArrowLeft' ) { e.preventDefault(); activateTab( ( cur - 1 + tabs.length ) % tabs.length ); }
		} );

		// Roving arrow-key navigation within the visible grid.
		function visibleCells() {
			var panel = panels.find( function ( p ) { return ! p.hidden; } );
			if ( ! panel ) { return []; }
			return Array.prototype.filter.call( panel.children, function ( c ) { return ! c.hidden; } );
		}
		pop.addEventListener( 'keydown', function ( e ) {
			if ( ! /^Arrow/.test( e.key ) ) { return; }
			if ( ! e.target.classList || ! e.target.classList.contains( 'maestro-icon-cell' ) ) { return; }
			var cells = visibleCells();
			var i = cells.indexOf( e.target );
			if ( i === -1 ) { return; }
			var cols = Math.max( 1, Math.floor( e.target.parentNode.clientWidth / e.target.offsetWidth ) || 8 );
			var next = i;
			if ( e.key === 'ArrowRight' ) { next = Math.min( cells.length - 1, i + 1 ); }
			else if ( e.key === 'ArrowLeft' ) { next = Math.max( 0, i - 1 ); }
			else if ( e.key === 'ArrowDown' ) { next = Math.min( cells.length - 1, i + cols ); }
			else if ( e.key === 'ArrowUp' ) { next = Math.max( 0, i - cols ); }
			if ( next !== i ) {
				e.preventDefault();
				cells[ i ].tabIndex = -1;
				cells[ next ].tabIndex = 0;
				cells[ next ].focus();
			}
		} );

		// Search filter across the active panel; first match becomes tabbable.
		function applyFilter() {
			var q = search.value.trim().toLowerCase();
			var panel = panels.find( function ( p ) { return ! p.hidden; } );
			if ( ! panel ) { return; }
			var firstShown = null;
			Array.prototype.forEach.call( panel.children, function ( c ) {
				var hit = ! q || ( c.dataset.maestroName || '' ).indexOf( q ) !== -1;
				c.hidden = ! hit;
				c.tabIndex = -1;
				if ( hit && ! firstShown ) { firstShown = c; }
			} );
			if ( firstShown ) { firstShown.tabIndex = 0; }
		}
		search.addEventListener( 'input', applyFilter );

		// Escape closes and restores focus; Tab is trapped within the dialog.
		pop.addEventListener( 'keydown', function ( e ) {
			if ( e.key === 'Escape' ) {
				e.preventDefault();
				closePopovers();
				anchorBtn.focus();
				return;
			}
			if ( e.key !== 'Tab' ) { return; }
			var focusable = pop.querySelectorAll(
				'input, button, [tabindex]:not([tabindex="-1"])'
			);
			focusable = Array.prototype.filter.call( focusable, function ( n ) {
				return ! n.hidden && n.offsetParent !== null;
			} );
			if ( ! focusable.length ) { return; }
			var first = focusable[ 0 ];
			var last  = focusable[ focusable.length - 1 ];
			if ( e.shiftKey && document.activeElement === first ) {
				e.preventDefault();
				last.focus();
			} else if ( ! e.shiftKey && document.activeElement === last ) {
				e.preventDefault();
				first.focus();
			}
		} );

		placePopover( pop, anchorBtn );
		applyFilter();
		search.focus();
	}

	// Reflect an icon value into the rendered menu image. The picker only ever
	// supplies dashicons, but reset feeds back the pristine icon, which can be a
	// URL / data-URI / "none" / "" (custom icons are out of scope for the picker
	// but still reachable on reset). Branch so we never push a URL as a CSS class.
	function applyIconPreview( li, icon ) {
		var img = li.querySelector( '.wp-menu-image' );
		if ( ! img ) { return; }

		// Drop every dashicons-* token (including dashicons-before) and the svg
		// marker, so each branch starts from a clean slate. Splitting on
		// whitespace avoids a regex that also matched dashicons-before.
		var keep = img.className.split( /\s+/ ).filter( function ( c ) {
			return c && c.indexOf( 'dashicons-' ) !== 0 && c !== 'svg';
		} );

		function clearBg() {
			img.style.backgroundImage = '';
			img.style.backgroundRepeat = '';
			img.style.backgroundPosition = '';
			img.style.backgroundSize = '';
		}
		function setBg() {
			img.style.backgroundImage = 'url("' + icon.replace( /"/g, '%22' ) + '")';
			img.style.backgroundRepeat = 'no-repeat';
			img.style.backgroundPosition = 'center';
			img.style.backgroundSize = '20px auto';
		}

		// Core gives its own items a menu-icon-* class whose CSS sets
		// background-image:none !important, which hides a custom image icon. Drop
		// it for data-URI/URL icons (mirrors the Replay engine server-side).
		// menu-header.php prints that class on BOTH the <li> and its <a>, so the
		// `.menu-icon-* div.wp-menu-image` rule matches via either ancestor —
		// strip it from both.
		function stripMenuIconClass() {
			[ li, li.querySelector( 'a' ) ].forEach( function ( node ) {
				if ( node ) {
					node.className = node.className.replace( /\bmenu-icon-[\w-]+/g, '' ).replace( /\s+/g, ' ' ).trim();
				}
			} );
		}

		if ( /^dashicons-/.test( icon ) ) {
			// Dashicon glyph: font class, no background image.
			keep.push( 'dashicons-before', icon );
			img.className = keep.join( ' ' );
			clearBg();
		} else if ( /^data:image\//.test( icon ) ) {
			// Base64 image data-URI: borrow core's ".svg" sizing and paint it.
			stripMenuIconClass();
			keep.push( 'svg' );
			img.className = keep.join( ' ' );
			setBg();
		} else if ( /^(https?:\/\/|\/\/|\/)/.test( icon ) ) {
			// URL icon: core would render an <img>; approximate via background.
			stripMenuIconClass();
			img.className = keep.join( ' ' );
			setBg();
		} else {
			// Empty / "none" / "div": no faithful client-side reconstruction, so
			// clear the stale preview. The authoritative icon returns on Exit reload.
			img.className = keep.join( ' ' );
			clearBg();
		}
	}

	/* ---------- visibility picker ----------------------------------------- */

	function openVisibilityPicker( anchorBtn ) {
		closePopovers();
		if ( ! selectedKey ) { return; }

		var slug = selectedKey; // model key: bare top slug or qualified submenu key
		var pop  = el( 'div', 'maestro-popover maestro-vis-popover' );
		pop.setAttribute( 'role', 'dialog' );
		pop.setAttribute( 'aria-modal', 'true' );
		pop.setAttribute( 'aria-label', I.visibility );
		pop.tabIndex = -1;

		// Forward reference: Group 1's onToggle (below) refreshes Group 2's
		// derived-lock rows live. Declared before Group 1 is built so the
		// closure captures the binding, not a value — assigned once Group 2
		// itself is built (or left null on a childless item / submenu row).
		var childrenGroup = null;

		// One independent role-checkbox group per role set. `getSet`/`setSet`
		// read/write the model field this group is bound to. `opts.onToggle`
		// runs any extra per-group side-effect (e.g. the item's own
		// maestro-has-hidden class, which only reflects hiddenRoles, never
		// childHiddenRoles). `opts.isLocked`/`opts.lockedHint` (COMPAT-10) let a
		// role row render checked+disabled as a DERIVED display state — see
		// `refresh()` below; this NEVER writes the derived value into the
		// model (payload purity: buildConfig() only ever reads the real,
		// unioned model field, never DOM checkbox state).
		function buildRoleGroup( heading, groupClass, getSet, setSet, opts ) {
			opts = opts || {};
			var group = el( 'div', 'maestro-vis-group ' + groupClass );
			// WCAG 1.3.1 (A): expose each role-checkbox group as a programmatic
			// group with an accessible name. Both groups ("Hide this item from:"
			// and "Hide its sub-items from:") list the SAME role names, so without
			// a group name an AT user can't tell which axis a checkbox controls.
			// role="group" + aria-labelledby points at the heading; the heading id
			// is uniquified via a module-level counter so it stays unique even if
			// multiple popovers ever coexist. Layout is untouched (no fieldset).
			var headEl = el( 'p', 'maestro-vis-head', heading );
			headEl.id = 'maestro-vis-head-' + ( ++groupIdSeq );
			group.setAttribute( 'role', 'group' );
			group.setAttribute( 'aria-labelledby', headEl.id );
			group.appendChild( headEl );
			var rows = {}; // roleKey -> { cb, row, hint }

			Object.keys( D.roles ).forEach( function ( roleKey ) {
				var row = el( 'label', 'maestro-vis-row' );
				var cb  = el( 'input' );
				cb.type = 'checkbox';
				cb.value = roleKey;
				cb.addEventListener( 'change', function () {
					var set = getSet();
					if ( cb.checked ) {
						if ( set.indexOf( roleKey ) === -1 ) { set.push( roleKey ); }
						setSet( set );
					} else {
						setSet( set.filter( function ( r ) { return r !== roleKey; } ) );
					}
					if ( opts.onToggle ) { opts.onToggle(); }
					refreshModifiedIndicator( slug );
					scheduleAutosave();
				} );
				row.appendChild( cb );
				row.appendChild( document.createTextNode( ' ' + D.roles[ roleKey ] ) );

				var hint = null;
				if ( opts.isLocked ) {
					// AT-only explanation (WP admin's always-present screen-reader-text
					// class): a bare disabled checkbox conveys nothing to assistive
					// tech, so the "already hidden via the parent" reason is exposed
					// programmatically, not just visually via the title tooltip.
					hint = el( 'span', 'maestro-vis-locked-hint screen-reader-text' );
					row.appendChild( hint );
				}

				group.appendChild( row );
				rows[ roleKey ] = { cb: cb, row: row, hint: hint };
			} );

			pop.appendChild( group );

			// Re-derive every role row's checked/disabled/locked state from the
			// CURRENT model. Called once at build time and again, live, whenever
			// a role is toggled in the OTHER group this group's lock derivation
			// depends on (COMPAT-10: toggling "Hide this item from:" re-derives
			// "Hide its sub-items from:"'s locked rows without closing the popover).
			function refresh() {
				Object.keys( D.roles ).forEach( function ( roleKey ) {
					var r      = rows[ roleKey ];
					var locked = !! ( opts.isLocked && opts.isLocked( roleKey ) );

					if ( locked ) {
						// Derived display only — never touches getSet()/setSet().
						r.cb.checked  = true;
						r.cb.disabled = true;
						r.cb.setAttribute( 'aria-disabled', 'true' );
						r.row.classList.add( 'maestro-vis-locked' );
						var reason = opts.lockedHint( roleKey );
						r.hint.textContent = ' ' + reason;
						r.row.title = reason;
					} else {
						r.cb.checked  = getSet().indexOf( roleKey ) !== -1;
						r.cb.disabled = false;
						r.cb.removeAttribute( 'aria-disabled' );
						r.row.classList.remove( 'maestro-vis-locked' );
						if ( r.hint ) { r.hint.textContent = ''; }
						r.row.removeAttribute( 'title' );
					}
				} );
			}

			refresh();
			return { refresh: refresh };
		}

		// Group 1: "Hide this item from:" — the existing hidden_roles, hides
		// THIS item (parent or submenu row). Always shown.
		buildRoleGroup(
			I.hideFrom,
			'maestro-vis-own',
			function () { return model[ slug ].hiddenRoles; },
			function ( arr ) {
				model[ slug ].hiddenRoles = arr;
				var li = liForKey( slug );
				if ( li ) {
					li.classList.toggle( 'maestro-has-hidden', model[ slug ].hiddenRoles.length > 0 );
				}
			},
			{
				onToggle: function () {
					// Live reactivity: a role just hidden (or un-hidden) for THIS
					// item may need Group 2's corresponding row locked (or unlocked).
					if ( childrenGroup ) { childrenGroup.refresh(); }
				}
			}
		);

		// Group 2 (COMPAT-10, REVISED): "Hide its sub-items from:" — a NEW,
		// INDEPENDENT role list that hides ALL of this parent's live children,
		// with the parent left visible. Shown ONLY on a top-level parent that
		// actually has children (never on a childless item or a submenu row).
		// Independent of group 1's STORED value: toggling it never touches
		// hiddenRoles. A role already checked in group 1 renders here as a
		// DERIVED locked (checked+disabled) row — WordPress core already
		// removes that role's whole rendered subtree, so this group's own
		// entry for it would be redundant — but the lock is display-only and
		// is refreshed live by group 1's onToggle above.
		if ( ! model[ slug ].isSub && model[ slug ].hasChildren ) {
			childrenGroup = buildRoleGroup(
				I.hideChildrenFrom,
				'maestro-vis-children',
				function () { return model[ slug ].childHiddenRoles; },
				function ( arr ) { model[ slug ].childHiddenRoles = arr; },
				{
					isLocked: function ( roleKey ) {
						return model[ slug ].hiddenRoles.indexOf( roleKey ) !== -1;
					},
					lockedHint: function ( roleKey ) {
						return I.hideChildrenLocked.replace( '%s', D.roles[ roleKey ] );
					}
				}
			);
		}

		// ROLE-02: one shared builder for BOTH per-user sections, for the same
		// reason buildRoleGroup() is shared — four hand-rolled groups in one
		// popover is where "toggling one group edits another's model field"
		// bugs come from. getSet/setSet bind the section to its model field.
		function buildUserGroup( heading, groupClass, getSet, setSet, opts ) {
			opts = opts || {};
			var group = el( 'div', 'maestro-vis-group maestro-user-group ' + groupClass );

			// Same programmatic-group treatment the role groups get (WCAG 1.3.1):
			// all four groups list similar-looking controls, so without a name an
			// AT user cannot tell which axis they are operating.
			var headEl = el( 'p', 'maestro-vis-head', heading );
			headEl.id = 'maestro-vis-head-' + ( ++groupIdSeq );
			group.setAttribute( 'role', 'group' );
			group.setAttribute( 'aria-labelledby', headEl.id );
			group.appendChild( headEl );

			var chips = el( 'ul', 'maestro-user-chips' );
			group.appendChild( chips );

			var searchId = 'maestro-user-search-' + groupIdSeq;
			var srLabel  = el( 'label', 'screen-reader-text', I.userSearch );
			srLabel.setAttribute( 'for', searchId );
			var search = el( 'input', 'maestro-user-search' );
			search.type = 'search';
			search.id = searchId;
			search.placeholder = I.userSearch;
			search.setAttribute( 'autocomplete', 'off' );
			group.appendChild( srLabel );
			group.appendChild( search );

			// Results are a list of real buttons rather than a datalist so they
			// stay keyboard-operable and styleable across browsers.
			var results = el( 'ul', 'maestro-user-results' );
			results.hidden = true;
			group.appendChild( results );

			var status = el( 'p', 'maestro-user-status' );
			status.setAttribute( 'aria-live', 'polite' );
			status.hidden = true;
			group.appendChild( status );

			var warn = el( 'p', 'maestro-user-selfwarn' );
			warn.hidden = true;
			group.appendChild( warn );

			function say( text ) {
				status.textContent = text;
				status.hidden = ! text;
			}

			function refreshSelfWarning() {
				var isSelf = false;
				getSet().forEach( function ( t ) {
					if ( window.maestroLogic.isSelfTarget( t.id, D.userId ) ) { isSelf = true; }
				} );
				warn.textContent = isSelf ? I.userSelfWarning : '';
				warn.hidden = ! isSelf;
			}

			function afterChange() {
				renderChips();
				refreshSelfWarning();
				if ( opts.onChange ) { opts.onChange(); }
				refreshModifiedIndicator( slug );
				scheduleAutosave();
			}

			function renderChips() {
				chips.textContent = '';
				getSet().forEach( function ( target ) {
					var li = el( 'li', 'maestro-user-chip' );
					li.appendChild( document.createTextNode( target.name ) );

					var rm = el( 'button', 'maestro-user-chip-remove' );
					rm.type = 'button';
					rm.textContent = '×';
					// The visible label is a bare glyph, so the accessible name has
					// to carry WHO is being removed — otherwise a screen-reader user
					// hears a list of identical "remove" buttons.
					rm.setAttribute( 'aria-label', I.userRemove.replace( '%s', target.name ) );
					rm.addEventListener( 'click', function ( e ) {
						// MUST stop propagation. placePopover()'s outside-click
						// handler closes the popover when the clicked node is not
						// inside it — and re-rendering the chips below detaches
						// THIS button before that handler runs, so the click would
						// read as "outside" and close the whole popover.
						e.stopPropagation();
						setSet( window.maestroLogic.removeUserTarget( getSet(), target.id ) );
						afterChange();
						search.focus();
					} );
					li.appendChild( rm );
					chips.appendChild( li );
				} );
			}

			function pick( user ) {
				setSet( window.maestroLogic.addUserTarget( getSet(), user ) );
				results.hidden = true;
				results.textContent = '';
				search.value = '';
				say( '' );
				afterChange();
				search.focus();
			}

			function renderResults( users ) {
				results.textContent = '';
				var shown = users.filter( function ( u ) {
					return ! window.maestroLogic.isUserTargeted( getSet(), u.id );
				} );
				if ( ! shown.length ) {
					results.hidden = true;
					say( I.userSearchNone );
					return;
				}
				shown.forEach( function ( u ) {
					var li  = el( 'li' );
					var btn = el( 'button', 'maestro-user-result' );
					btn.type = 'button';
					btn.textContent = u.name;
					// Same detach-before-outside-click hazard as the chip remove
					// button above: pick() empties this list synchronously.
					btn.addEventListener( 'click', function ( e ) {
						e.stopPropagation();
						pick( u );
					} );
					li.appendChild( btn );
					results.appendChild( li );
				} );
				results.hidden = false;
				say( '' );
			}

			var timer    = null;
			var inflight = null;

			search.addEventListener( 'input', function () {
				var q = search.value.trim();
				if ( timer ) { window.clearTimeout( timer ); }

				// Abort any in-flight request. Without this a fast typist can get
				// results for a stale prefix whenever an earlier response lands
				// after a later one.
				if ( inflight ) { inflight.abort(); inflight = null; }

				if ( q.length < 2 ) {
					results.hidden = true;
					results.textContent = '';
					say( '' );
					return;
				}

				timer = window.setTimeout( function () {
					var ctrl = ( typeof AbortController !== 'undefined' ) ? new AbortController() : null;
					inflight = ctrl;
					// On a site with plain permalinks rest_url() already carries a
					// query string (index.php?rest_route=/wp/v2/users), so the
					// separator has to be chosen, not assumed — appending a second
					// "?" silently 404s the search on exactly those sites.
					var sep = ( D.usersUrl.indexOf( '?' ) === -1 ) ? '?' : '&';
					window.fetch(
						D.usersUrl + sep + 'per_page=10&search=' + encodeURIComponent( q ),
						{
							credentials: 'same-origin',
							headers: { 'X-WP-Nonce': D.nonce },
							signal: ctrl ? ctrl.signal : undefined
						}
					).then( function ( r ) {
						if ( ! r.ok ) { throw new Error( 'search failed' ); }
						return r.json();
					} ).then( function ( json ) {
						inflight = null;
						renderResults( json.map( function ( u ) {
							return { id: u.id, name: u.name };
						} ) );
					} ).catch( function ( err ) {
						if ( err && err.name === 'AbortError' ) { return; }
						inflight = null;
						results.hidden = true;
						// An explicit failure message: a picker that silently shows
						// nothing is indistinguishable from a broken one.
						say( I.userSearchError );
					} );
				}, 250 );
			} );

			renderChips();
			refreshSelfWarning();
			pop.appendChild( group );
			return { refresh: renderChips };
		}

		// Group 3 (ROLE-02): "Hide this item from specific people:" — the
		// per-user analog of group 1. Valid on any row, parent or submenu.
		buildUserGroup(
			I.hideFromUsers,
			'maestro-vis-own-users',
			function () { return model[ slug ].hiddenUsers; },
			function ( arr ) {
				model[ slug ].hiddenUsers = arr;
				var li = liForKey( slug );
				if ( li ) {
					// The row badge means "this row has a hide rule of its own",
					// which is now satisfied by either axis.
					li.classList.toggle(
						'maestro-has-hidden',
						model[ slug ].hiddenRoles.length > 0 || model[ slug ].hiddenUsers.length > 0
					);
				}
			}
		);

		// Group 4 (ROLE-02): "Hide its sub-items from specific people:" — the
		// per-user analog of group 2, gated to parents with children exactly as
		// that group is. No derived-lock affordance here: the role lock exists
		// because core drops a hidden parent's whole subtree for that ROLE, and
		// that has no per-user equivalent — a parent hidden from one person is
		// still rendered for everyone else, so its children are not implied gone.
		if ( ! model[ slug ].isSub && model[ slug ].hasChildren ) {
			buildUserGroup(
				I.hideChildrenUsers,
				'maestro-vis-children-users',
				function () { return model[ slug ].childHiddenUsers; },
				function ( arr ) { model[ slug ].childHiddenUsers = arr; }
			);
		}

		pop.addEventListener( 'keydown', function ( e ) {
			if ( e.key === 'Escape' ) {
				e.preventDefault();
				closePopovers();
				anchorBtn.focus();
				return;
			}
			if ( e.key !== 'Tab' ) { return; }
			var focusable = pop.querySelectorAll(
				'input, button, [tabindex]:not([tabindex="-1"])'
			);
			// COMPAT-10: a derived-locked checkbox is disabled and never actually
			// receives focus, so it must be excluded here too — otherwise it would
			// be wrongly treated as the tab-trap's `first`/`last` boundary and the
			// wraparound would silently fail to fire.
			focusable = Array.prototype.filter.call( focusable, function ( n ) {
				return ! n.hidden && ! n.disabled && n.offsetParent !== null;
			} );
			if ( ! focusable.length ) { return; }
			var first = focusable[ 0 ];
			var last  = focusable[ focusable.length - 1 ];
			if ( e.shiftKey && document.activeElement === first ) {
				e.preventDefault();
				last.focus();
			} else if ( ! e.shiftKey && document.activeElement === last ) {
				e.preventDefault();
				first.focus();
			}
		} );

		placePopover( pop, anchorBtn );
		var initialFocus = pop.querySelector( 'input:not([disabled])' ) || pop;
		initialFocus.focus();
	}

	/* ---------- per-item reset -------------------------------------------- */

	function resetSelected() {
		if ( ! selectedKey ) { return; }
		var m   = model[ selectedKey ];
		// Submenu pristine defaults are keyed by the RAW rendered slug, not
		// the qualified model key.
		var def = m.isSub ? pristineSub( m.slug ) : pristineTop( selectedKey );

		m.title            = def.title || '';
		m.hiddenRoles      = [];
		// childHiddenRoles (COMPAT-10 REVISED) has no WP-native pristine state —
		// reset always clears it to []; harmless no-op on a submenu entry (field
		// unused there).
		m.childHiddenRoles = [];
		// ROLE-02: same reasoning — a per-user hide has no WP-native pristine
		// state, so Reset Item clears both user axes to the sparse empty list.
		m.hiddenUsers      = [];
		m.childHiddenUsers = [];

		var li = liForKey( selectedKey );
		if ( li ) { li.classList.remove( 'maestro-has-hidden' ); }

		if ( ! m.isSub ) {
			m.icon = def.icon || '';
			// Always refresh — when the pristine icon is empty this clears any
			// stale dashicon preview rather than leaving it until reload.
			if ( li ) { applyIconPreview( li, m.icon ); }
		}
		updateMenuLabel( selectedKey );
		populatePanel( selectedKey );
		refreshModifiedIndicator( selectedKey );
		scheduleAutosave();
	}

	/* ---------- popover placement ----------------------------------------- */

	function placePopover( pop, anchorBtn ) {
		document.body.appendChild( pop );
		var r = anchorBtn.getBoundingClientRect();
		// Toolbar lives at the bottom — prefer placing the popover above the
		// anchor so it doesn't overflow off-screen.
		var top = window.scrollY + r.top - pop.offsetHeight - 6;
		if ( top < window.scrollY + 8 ) {
			top = window.scrollY + r.bottom + 4;
		}
		pop.style.top  = top + 'px';
		pop.style.left = ( window.scrollX + r.left ) + 'px';

		setTimeout( function () {
			document.addEventListener( 'click', function handler( e ) {
				if ( ! pop.contains( e.target ) && e.target !== anchorBtn ) {
					pop.remove();
					document.removeEventListener( 'click', handler );
				}
			} );
		}, 0 );
	}

	/* ---------- sortable --------------------------------------------------- */

	function initSortables() {
		// No drag handles: the whole row is draggable. A small distance threshold
		// keeps a plain click as a selection and only starts a drag on real
		// movement. `cancel` keeps a mousedown inside a submenu (or on a form
		// control) from starting a top-level drag, so child reordering is handled
		// solely by the per-submenu sortable below.
		$( '#adminmenu' ).sortable( {
			items:     '> li.menu-top.maestro-item',
			cancel:    '.wp-submenu, input, button',
			distance:  6,
			axis:      'y',
			tolerance: 'pointer',
			stop:      scheduleAutosave
		} );

		$( '#adminmenu .wp-submenu' ).each( function () {
			$( this ).sortable( {
				items:     '> li.maestro-subitem',
				distance:  6,
				axis:      'y',
				tolerance: 'pointer',
				stop:      scheduleAutosave
			} );
		} );
	}

	/* ---------- build payload + autosave ---------------------------------- */

	function buildConfig() {
		// Null-prototype slug-keyed maps: a slug of "__proto__" must not mutate
		// Object.prototype or break JSON serialisation of the payload.
		var cfg = { items: Object.create( null ), top_order: [], sub_order: Object.create( null ) };

		var topLis = document.querySelectorAll( '#adminmenu > li.menu-top.maestro-item[data-maestro-slug]' );

		topLis.forEach( function ( li ) {
			var slug = li.dataset.maestroSlug;
			cfg.top_order.push( slug );

			var m    = model[ slug ];
			var def  = pristineTop( slug );
			var diff = window.maestroLogic.diffItem( m, def );
			var entry = {};
			if ( diff.fields.indexOf( 'title' ) !== -1 )       { entry.title = m.title; }
			if ( diff.fields.indexOf( 'icon' ) !== -1 )        { entry.icon  = m.icon; }
			if ( diff.fields.indexOf( 'hiddenRoles' ) !== -1 ) { entry.hidden_roles = m.hiddenRoles; }
			// COMPAT-10 (REVISED): parent-only, independent child_hidden_roles.
			// diffItem() flags it whenever non-empty (no pristine concept, mirrors
			// hiddenRoles), so a child_hidden_roles-only toggle with no other
			// change still produces a diff.modified entry and persists.
			if ( diff.fields.indexOf( 'childHiddenRoles' ) !== -1 ) { entry.child_hidden_roles = m.childHiddenRoles; }
			// ROLE-02: the model holds { id, name } pairs so chips can render
			// without a lookup, but the wire format is the bare id list the
			// server stores. Emitted only when non-empty, so the sparse contract
			// (reset = absent key) holds on this side too.
			if ( diff.fields.indexOf( 'hiddenUsers' ) !== -1 )      { entry.hidden_users = window.maestroLogic.userTargetIds( m.hiddenUsers ); }
			if ( diff.fields.indexOf( 'childHiddenUsers' ) !== -1 ) { entry.child_hidden_users = window.maestroLogic.userTargetIds( m.childHiddenUsers ); }
			if ( diff.modified )                                     { cfg.items[ slug ] = entry; }

			var subLis = li.querySelectorAll( '.wp-submenu > li.maestro-subitem[data-maestro-slug]' );
			if ( subLis.length ) {
				cfg.sub_order[ slug ] = [];
				subLis.forEach( function ( sli ) {
					var sslug = sli.dataset.maestroSlug;
					cfg.sub_order[ slug ].push( sslug ); // sub_order stays bare-slug-keyed (unchanged)

					// Every submenu override is stored under its qualified
					// `parent>child` key (COMPAT-04) — including one that shares
					// its slug with the top-level parent, which used to be
					// skipped here entirely (the client half of the shared-slug
					// collision). The server resolves qualified-first with a
					// legacy bare-key fallback (20-02), so this is additive:
					// re-saving a config only starts qualifying a row once it
					// is actually edited.
					var skey = sli.dataset.maestroKey || sslug;
					var sm   = model[ skey ];
					if ( ! sm ) { return; }
					var sdef  = pristineSub( sslug );
					var sdiff = window.maestroLogic.diffItem( sm, sdef );
					var se    = {};
					if ( sdiff.fields.indexOf( 'title' ) !== -1 )       { se.title = sm.title; }
					if ( sdiff.fields.indexOf( 'hiddenRoles' ) !== -1 ) { se.hidden_roles = sm.hiddenRoles; }
					if ( sdiff.fields.indexOf( 'hiddenUsers' ) !== -1 ) { se.hidden_users = window.maestroLogic.userTargetIds( sm.hiddenUsers ); }
					if ( sdiff.modified )                                { cfg.items[ skey ] = se; }
				} );
			}
		} );

		return cfg;
	}

	function setStatus( state ) {
		if ( ! statusEl ) { return; }
		// Class change drives the visible ::before glyph; the word goes into the
		// SR-only child (not statusEl.textContent, which would wipe that child and
		// render the word visibly). The live region still announces the change.
		statusEl.className = 'maestro-status maestro-status-' + state;
		var label = window.maestroLogic.modeStatusLabel( state, I );
		var textEl = statusEl.querySelector( '.maestro-status-text' );
		if ( textEl ) { textEl.textContent = label; }
		statusEl.setAttribute( 'title', label ); // hover hint reflects state ('' at idle)
		if ( state === 'saved' || state === 'error' ) {
			speak( label );
		}
	}

	function scheduleAutosave() {
		setStatus( 'saving' );
		if ( saveTimer ) { clearTimeout( saveTimer ); }
		saveTimer = setTimeout( doAutosave, 500 );
	}

	function flushAutosave() {
		if ( saveTimer ) {
			clearTimeout( saveTimer );
			saveTimer = null;
		}
		return doAutosave();
	}

	// The endpoint is a full replace, so two POSTs in flight at once can arrive
	// out of order and let an older snapshot overwrite newer edits. Serialise:
	// never overlap requests. If a change lands while a save is running, set a
	// pending flag and fire exactly one more save when the current one settles —
	// that trailing POST carries the latest buildConfig(). The returned promise
	// resolves only after the whole chain (including the trailing save) is done,
	// so bindAdminBarExit's click intercept can safely await it.
	function doAutosave() {
		saveTimer = null;

		if ( saveInFlight ) {
			savePending = true;
			return inFlight || Promise.resolve();
		}

		saveInFlight = true;
		setStatus( 'saving' );

		inFlight = fetch( D.restUrl, {
			method:      'POST',
			headers:     {
				'Content-Type': 'application/json',
				'X-WP-Nonce':   D.nonce
			},
			credentials: 'same-origin',
			body:        JSON.stringify( { config: buildConfig() } )
		} )
			.then( function ( r ) {
				if ( ! r.ok ) { throw new Error( 'HTTP ' + r.status ); }
				return r.json();
			} )
			.then( function () { return settleSave( true ); } )
			.catch( function () { return settleSave( false ); } );

		return inFlight;
	}

	function settleSave( ok ) {
		saveInFlight = false;
		if ( savePending ) {
			savePending = false;
			return doAutosave(); // captures edits made while the last POST was in flight
		}
		setStatus( ok ? 'saved' : 'error' );
		inFlight = null;
		// The "Saved" tile is transient — fade it back to idle so the toolbar
		// settles to just the persistent mode indicator. An error stays put until
		// the next change. A new save (which sets 'saving') cancels this via the
		// state guard inside the callback.
		if ( savedClearTimer ) { clearTimeout( savedClearTimer ); }
		if ( ok ) {
			savedClearTimer = setTimeout( function () {
				if ( statusEl && statusEl.classList.contains( 'maestro-status-saved' ) ) {
					setStatus( 'idle' );
				}
			}, 2000 );
		}
		return null;
	}

	function waitForSaveIdle() {
		if ( saveTimer ) {
			return flushAutosave();
		}
		return inFlight || Promise.resolve();
	}

	function cancelQueuedAutosave() {
		if ( saveTimer ) {
			clearTimeout( saveTimer );
			saveTimer = null;
		}
		savePending = false;
	}

	function doResetAll( e ) {
		e.preventDefault();
		if ( ! window.confirm( I.confirmAll ) ) { return; }

		var button = e.currentTarget;
		if ( button ) { button.disabled = true; }
		setStatus( 'saving' );
		cancelQueuedAutosave();

		( inFlight || Promise.resolve() )
			.then( function () {
				return fetch( D.restUrl, {
					method:      'DELETE',
					headers:     { 'X-WP-Nonce': D.nonce },
					credentials: 'same-origin'
				} );
			} )
			.then( function ( r ) {
				if ( ! r.ok ) { throw new Error( 'HTTP ' + r.status ); }
				window.location.reload();
			} )
			.catch( function () {
				if ( button ) { button.disabled = false; }
				setStatus( 'error' );
			} );
	}

	/* ---------- guided tour (coachmarks) ---------------------------------- */

	// UX-11: a stepped, anchored coachmark tour replaces the old one-shot pulse
	// (an ambient flash that conveyed no instruction). Hand-rolled, accessible
	// (role=dialog, focus-managed, Esc/Tab-trapped, wp.a11y.speak announcements,
	// reduced-motion-safe via CSS). Auto-launches once on first run; replayable
	// anytime via the toolbar "?" button.
	var tour = { active: false, idx: 0, lastFocus: null, root: null, steps: null, rendering: false };

	function firstMenuItem() {
		return document.querySelector( '#adminmenu > li.menu-top.maestro-item' );
	}

	function tourSelectFirst() {
		var li = firstMenuItem();
		if ( li && li.dataset.maestroSlug && model[ li.dataset.maestroSlug ] ) {
			selectItem( li );
		}
	}

	function tourSteps() {
		// Steps 2–4 reference the controls panel / move buttons, which only exist
		// once an item is selected — so those steps select the first item first.
		return [
			{ text: I.tourStep1, placement: 'right', anchor: firstMenuItem },
			{ text: I.tourStep2, placement: 'top', before: tourSelectFirst, anchor: function () { return panel.rename; } },
			{ text: I.tourStep3, placement: 'top', before: tourSelectFirst, anchor: function () { return document.querySelector( '.maestro-move-up' ); } },
			{ text: I.tourStep4, placement: 'top', anchor: function () { return document.querySelector( '.maestro-reset-all' ); } },
			// Step 5 anchors to the WP Toolbar (admin-bar) "Exit Menu Editor"
			// toggle — the single entry/exit (UX-09) — not a bottom-toolbar
			// control. positionTour's 'top' placement falls back to below the
			// anchor when there's no room above, which is always the case this
			// near the top of the viewport.
			{ text: I.tourStep5, placement: 'top', anchor: function () { return document.getElementById( 'wp-admin-bar-maestro-toggle' ); } },
		];
	}

	function startTour() {
		if ( tour.active ) { return; }
		tour.steps = tourSteps();
		tour.active = true;
		tour.idx = 0;
		tour.lastFocus = document.activeElement;
		// Focus containment: the tooltip is aria-modal, so keep focus inside it.
		// The Tab handler only cycles WITHIN the tour buttons; this catches focus
		// escaping any other way (a click on the still-visible page behind it, the
		// rename input gaining focus on selection) and pulls it back in.
		document.addEventListener( 'focusin', onTourFocusIn, true );
		renderTourStep();
	}

	function endTour() {
		tour.active = false;
		if ( tour.root ) { tour.root.remove(); tour.root = null; }
		document.removeEventListener( 'keydown', onTourKeydown, true );
		document.removeEventListener( 'focusin', onTourFocusIn, true );
		// Mark seen so the first-run auto-launch never fires again. Replay stays
		// available via the toolbar "?" button. Storage may throw — ignore.
		try {
			window.localStorage.setItem( 'maestroFirstRunDone', '1' );
		} catch ( storageErr ) {} // eslint-disable-line no-empty
		var f = tour.lastFocus;
		tour.lastFocus = null;
		if ( f && typeof f.focus === 'function' ) {
			try {
				f.focus( { preventScroll: true } );
			} catch ( focusErr ) {
				f.focus();
			}
		}
	}

	// Pull focus back into the modal coachmark if it escapes to the page behind it.
	function onTourFocusIn( e ) {
		if ( ! tour.active || tour.rendering || ! tour.root ) { return; }
		if ( tour.root.contains( e.target ) ) { return; }
		var btn = tour.root.querySelector( '.maestro-tour-next' ) || tour.root.querySelector( 'button' );
		if ( btn ) {
			try {
				btn.focus( { preventScroll: true } );
			} catch ( focusErr ) {
				btn.focus();
			}
		}
	}

	function onTourKeydown( e ) {
		if ( ! tour.active || ! tour.root ) { return; }
		if ( e.key === 'Escape' || e.key === 'Esc' ) {
			e.preventDefault();
			endTour();
			return;
		}
		if ( e.key === 'Tab' ) {
			var btns = tour.root.querySelectorAll( 'button:not([disabled])' );
			if ( ! btns.length ) { return; }
			var first = btns[ 0 ];
			var last = btns[ btns.length - 1 ];
			if ( e.shiftKey && document.activeElement === first ) {
				e.preventDefault();
				last.focus();
			} else if ( ! e.shiftKey && document.activeElement === last ) {
				e.preventDefault();
				first.focus();
			}
		}
	}

	function renderTourStep() {
		// Suppress the focus-containment redirect while we tear down/rebuild the
		// tooltip and run step.before() (which may select an item / move focus).
		tour.rendering = true;
		var step = tour.steps[ tour.idx ];
		if ( step.before ) { step.before(); }

		var anchor = step.anchor();
		// A missing anchor (unusual menu / hidden control) — skip ahead gracefully
		// rather than dead-ending the tour.
		if ( ! anchor ) {
			if ( tour.idx < tour.steps.length - 1 ) {
				tour.idx++;
				renderTourStep();
			} else {
				endTour();
			}
			return;
		}

		if ( tour.root ) { tour.root.remove(); }

		var box = el( 'div', 'maestro-tour' );
		box.setAttribute( 'role', 'dialog' );
		box.setAttribute( 'aria-modal', 'true' );
		box.setAttribute( 'aria-label', I.tourTitle );

		/* wp-pointer look, replicated locally: a directional arrow drawn as a
		 * rotated square that overlaps the card edge (see .maestro-tour-arrow in
		 * maestro.css). aria-hidden — purely decorative; the card is the dialog.
		 * positionTour sets data-pointer-edge to the resolved edge so CSS draws
		 * the arrow on the correct side. No effect on steps/copy/anchors/trap. */
		var arrow = el( 'span', 'maestro-tour-arrow' );
		arrow.setAttribute( 'aria-hidden', 'true' );

		/* The card body holds the pointer content (progress + text); controls
		 * live in a footer band below, mirroring wp-pointer-content /
		 * wp-pointer-buttons. Grouping is presentational only — the same
		 * progress/text/Skip/Back/Next nodes and classes as before. */
		var content = el( 'div', 'maestro-tour-content' );

		var progress = el(
			'span',
			'maestro-tour-progress',
			I.tourProgress.replace( '%1$d', tour.idx + 1 ).replace( '%2$d', tour.steps.length )
		);
		var body = el( 'p', 'maestro-tour-text', step.text );

		var isLast = tour.idx === tour.steps.length - 1;
		var controls = el( 'div', 'maestro-tour-controls' );

		var skip = el( 'button', 'button-link maestro-tour-skip', I.tourSkip );
		skip.type = 'button';
		skip.addEventListener( 'click', endTour );

		var back = el( 'button', 'button maestro-tour-back', I.tourBack );
		back.type = 'button';
		back.disabled = tour.idx === 0;
		back.addEventListener( 'click', function () {
			if ( tour.idx > 0 ) {
				tour.idx--;
				renderTourStep();
			}
		} );

		var next = el( 'button', 'button button-primary maestro-tour-next', isLast ? I.tourDone : I.tourNext );
		next.type = 'button';
		next.addEventListener( 'click', function () {
			if ( isLast ) {
				endTour();
			} else {
				tour.idx++;
				renderTourStep();
			}
		} );

		controls.appendChild( skip );
		controls.appendChild( back );
		controls.appendChild( next );
		content.appendChild( progress );
		content.appendChild( body );
		box.appendChild( arrow );
		box.appendChild( content );
		box.appendChild( controls );
		document.body.appendChild( box );
		tour.root = box;

		positionTour( box, anchor, step.placement );

		document.addEventListener( 'keydown', onTourKeydown, true );
		try {
			next.focus( { preventScroll: true } );
		} catch ( focusErr ) {
			next.focus();
		}
		tour.rendering = false;
		if ( window.wp && window.wp.a11y && window.wp.a11y.speak ) {
			window.wp.a11y.speak( step.text );
		}
	}

	function positionTour( box, anchor, placement ) {
		var r = anchor.getBoundingClientRect();
		var w = box.offsetWidth;
		var h = box.offsetHeight;
		var pad = 12;
		var vw = window.innerWidth;
		var vh = window.innerHeight;
		var top;
		var left;
		// The card edge the arrow sits on (points back at the anchor). Mirrors
		// the wp-pointer .wp-pointer-{top,bottom,left,right} edge classes.
		var edge;
		if ( placement === 'right' ) {
			left = r.right + pad;
			top = r.top;
			edge = 'left'; // card is to the right → arrow on the card's left edge
			if ( left + w > vw - 8 ) {
				// No room to the right — drop below the anchor instead.
				left = r.left;
				top = r.bottom + pad;
				edge = 'top';
			}
		} else {
			// 'top' — sit above the anchor (toolbar controls live at the bottom).
			left = r.left;
			top = r.top - h - pad;
			edge = 'bottom'; // card is above → arrow on the card's bottom edge
			if ( top < 8 ) {
				top = r.bottom + pad;
				edge = 'top';
			}
		}
		left = Math.max( 8, Math.min( left, vw - w - 8 ) );
		top = Math.max( 8, Math.min( top, vh - h - 8 ) );
		box.style.left = left + 'px';
		box.style.top = top + 'px';

		/* Point the arrow at the anchor's centre along the shared edge, clamped
		 * so it stays within the card's rounded corners. Presentational only —
		 * the anchor, placement source, and step logic are unchanged. */
		box.setAttribute( 'data-pointer-edge', edge );
		var arrow = box.querySelector( '.maestro-tour-arrow' );
		if ( arrow ) {
			var inset = 16; // keep the arrow clear of the 4px-radius corners
			if ( edge === 'left' || edge === 'right' ) {
				var anchorCy = r.top + r.height / 2;
				var offY = Math.max( inset, Math.min( anchorCy - top, h - inset ) );
				arrow.style.top = offY + 'px';
				arrow.style.left = '';
			} else {
				var anchorCx = r.left + r.width / 2;
				var offX = Math.max( inset, Math.min( anchorCx - left, w - inset ) );
				arrow.style.left = offX + 'px';
				arrow.style.top = '';
			}
		}
	}

	/**
	 * First-run: auto-launch the guided tour once (replaces the old pulse). Gated
	 * on the localStorage seen-flag via the maestroLogic.firstRunSeen seam; storage
	 * access is wrapped because blocked/partitioned storage throws on the getter
	 * itself. Treat any throw as "seen" so init never aborts.
	 */
	function maybeFirstRunTour() {
		var seen;
		try {
			seen = window.maestroLogic.firstRunSeen( window.localStorage );
		} catch ( storageErr ) {
			seen = true;
		}
		if ( seen ) { return; }
		startTour();
	}

	/* ---------- go --------------------------------------------------------- */

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}

} )( jQuery );
