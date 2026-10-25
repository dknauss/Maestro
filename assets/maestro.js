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
 * The menu is forced to a stable expanded state while editing: body.folded,
 * and body.auto-fold from 783px up (where it folds the menu), are stripped on
 * init and re-stripped if common.js puts them back. The collapse button is neutralised. This is what makes editing
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
	var statusDismiss = null; // × that hides a stuck save error (the error itself stays)
	var saveTimer = null;
	var saveInFlight = false;  // a full-replace POST is currently running
	var savePending = false;   // another change arrived mid-flight; save again on land
	var inFlight = null;       // promise that settles when the whole save chain is done
	var lastSaveOk = true;     // outcome of the last settled save (role preview waits on it)
	var savedClearTimer = null; // reverts the transient "Saved" tile back to idle
	var groupIdSeq = 0;    // monotonic counter for unique role-group heading ids
	// Core/plugin separators the user removed. A removed row is not rendered,
	// so it cannot be read back from the DOM; carry the stored list forward.
	var removedSeparators = ( ( D.config && D.config.removed_separators ) || [] ).slice();
	// Separators Maestro added that the user removed this session. Recorded so
	// the save does not carry them forward as merely unrendered.
	var droppedSeparators = [];
	// Phase 28: the one menu-wide setting so far. null means "use WordPress's
	// default"; the sparse contract never stores the default itself.
	var widthBounds = D.menuWidth || { min: 160, max: 320, default: 160, value: null };
	var menuWidth = widthBounds.value || null;
	var widthPreviewEl = null;  // <style> holding the live preview rule
	var widthControls = null;   // the open Settings dialog's inputs, if any
	var widthHandle = null;     // the drag handle at the menu edge
	// Phase 27: hiding profiles, as { id, name, users: [{ id, name }] }. Empty
	// for a viewer without `list_users`, who never sees or saves them. WHICH
	// items a profile hides lives on the model (hiddenProfiles and
	// childHiddenProfiles), exactly as hiddenRoles does; buildConfig() folds
	// it back into the map.
	var profiles = ( D.profiles || [] ).map( function ( p ) {
		return { id: p.id, name: p.name, users: ( p.users || [] ).slice() };
	} );
	// Highest p_<n> handed out or loaded, so a deleted ID is never reused.
	var profileIdFloor = window.maestroLogic.profileIdFloor( profiles );
	// Stored hides of items not on screen, per profile (Assets::profile_carry()),
	// as this session's own copy: a delete drops its entry.
	var profileCarry = window.maestroLogic.dropProfileCarry( D.profileCarry, '' );
	var profilesBtn = null;     // the toolbar button that opens the dialog
	var rowCtl = null;          // the selected row's own controls (buildRowControls)

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
		if ( text != null ) { setText( n, text ); }
		return n;
	}
	/*
	 * Set visible text with its own base direction. In an RTL admin any string
	 * without a translation arrives in English, and inheriting the page's RTL
	 * direction moves its punctuation and reorders "Step 1 of 5" around the
	 * digits. dir="auto" takes the direction from the text itself: English
	 * reads left to right, a translation (or an Arabic menu title) right to left,
	 * and an LTR admin sees no change.
	 */
	function setText( n, text ) {
		n.textContent = text;
		n.dir = 'auto';
	}
	function removePopover( pop ) {
		if ( pop.maestroCleanup ) { pop.maestroCleanup(); }
		pop.remove();
	}
	function closePopovers() {
		document.querySelectorAll( '.maestro-popover' ).forEach( removePopover );
	}
	// The row marker means "this row has a hide rule of its own", on any axis.
	function refreshHiddenMarker( key ) {
		var li = liForKey( key );
		if ( li ) { li.classList.toggle( 'maestro-has-hidden', window.maestroLogic.hasOwnHide( model[ key ] ) ); }
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
		if ( ! m || m.isSeparator ) { return; }

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
				setText( srText, I.modified );
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

	// The menu must edit in its expanded form. Strip folded on init, and
	// auto-fold where it would fold the menu; re-strip if common.js writes them
	// back, and neutralise the collapse control for the duration of the session.
	//
	// auto-fold only folds the menu to icons from 783px up. At 782px and below,
	// core's responsive code adds it and lays the open menu out under it: below
	// the admin bar, with touch-sized rows. Stripping it there put the first row
	// under the admin bar, so below 783px it stays. Core adds it there in
	// responsive.activate() regardless of user settings, but only when that mode
	// first activates, so after an edit session stripped it at a wide width,
	// narrowing again has to put it back here.
	function forceUnfold() {
		var body = document.body;
		var wide = window.matchMedia( '(min-width: 783px)' );

		function unfold() {
			body.classList.remove( 'folded' );
			if ( wide.matches ) {
				body.classList.remove( 'auto-fold' );
			} else if ( ! body.classList.contains( 'auto-fold' ) ) {
				body.classList.add( 'auto-fold' );
			}
		}
		unfold();

		var mo = new MutationObserver( function () {
			if ( body.classList.contains( 'folded' ) || ( wide.matches && body.classList.contains( 'auto-fold' ) ) ) {
				unfold();
			}
		} );
		mo.observe( body, { attributes: true, attributeFilter: [ 'class' ] } );

		// Crossing into the wide range with auto-fold already set changes no
		// class, so the observer would not see it.
		if ( wide.addEventListener ) {
			wide.addEventListener( 'change', unfold );
		} else if ( wide.addListener ) {
			wide.addListener( unfold );
		}

		var collapse = document.getElementById( 'collapse-menu' );
		if ( collapse ) {
			collapse.addEventListener( 'click', function ( e ) {
				e.preventDefault();
				e.stopImmediatePropagation();
			}, true );
		}
	}

	/*
	 * forceUnfold()'s responsive twin. Below 782px WordPress does not fold the
	 * menu, it hides it outright: #adminmenuwrap is display:none until #wpwrap
	 * gets .wp-responsive-open via the toolbar hamburger. Edit mode would
	 * otherwise decorate items nobody can see, with nothing on screen saying to
	 * tap the hamburger first.
	 *
	 * Opening goes through core's own click.wp-responsive handler rather than by
	 * setting the class directly, so the toggle's aria-expanded stays truthful
	 * and focus lands where core puts it.
	 *
	 * Only opening is handled here. Keeping it open is buildToolbar()'s job, and
	 * it does that structurally: the toolbar is attached inside #adminmenuwrap at
	 * these widths, which satisfies core's outside-click containment test so core
	 * never closes the menu in the first place. Nothing has to be re-opened,
	 * nothing has to stop propagation, and the hamburger keeps working.
	 */
	function forceResponsiveOpen() {
		var wrap   = document.getElementById( 'wpwrap' );
		var toggle = document.getElementById( 'wp-admin-bar-menu-toggle' );

		if ( ! wrap || ! toggle ) { return; }

		// The hamburger only renders in the responsive layout; when it is not
		// displayed this is a desktop width and forceUnfold() owns the menu.
		function isResponsive() {
			return toggle.offsetParent !== null;
		}

		function openMenu() {
			if ( ! isResponsive() || wrap.classList.contains( 'wp-responsive-open' ) ) {
				return;
			}

			if ( window.jQuery ) {
				window.jQuery( toggle ).trigger( 'click.wp-responsive' );
			}

			/*
			 * Verify rather than assume. Core binds click.wp-responsive from its
			 * own jQuery ready handler, and this runs from init() on
			 * DOMContentLoaded — so on a cold load the trigger above can fire
			 * before that handler exists and do nothing at all. When that
			 * happens (or jQuery is absent), set the state core would have set,
			 * accessible state included, so the toggle stays truthful and its
			 * next real click toggles from the correct position.
			 */
			if ( ! wrap.classList.contains( 'wp-responsive-open' ) ) {
				wrap.classList.add( 'wp-responsive-open' );

				var link = toggle.querySelector( 'a' );
				if ( link ) {
					link.setAttribute( 'aria-expanded', 'true' );
				}
			}
		}

		openMenu();
	}

	/*
	 * Phase 28-01: the menu column width, measured rather than assumed.
	 *
	 * The toolbar's left edge and the folded-mode backstop in maestro.css both
	 * need the width of the menu being edited. That used to be a hardcoded
	 * 160px, which is only core's width. Keel and PX widen the menu with their
	 * own !important rules, and the toolbar then sat over the menu's right edge.
	 *
	 * forceUnfold() has already run, so what #adminmenuwrap renders now is the
	 * expanded width from every source at once — core, another plugin, or a
	 * width Maestro stores later. Exposing that one number as
	 * --maestro-menu-width means nothing downstream has to know which of them
	 * set it. The ResizeObserver keeps it current when a breakpoint turns a
	 * widening rule on or off, or another plugin previews a change.
	 *
	 * A zero reading means the menu is hidden (the <782px overlay before it
	 * opens); the last good value is kept rather than collapsing the offset.
	 */
	function trackMenuWidth() {
		var wrap = document.getElementById( 'adminmenuwrap' );
		if ( ! wrap ) { return; }

		function apply() {
			var width = Math.round( wrap.getBoundingClientRect().width );
			if ( width > 0 ) {
				document.body.style.setProperty( '--maestro-menu-width', width + 'px' );
			}
			// Another plugin can resize the menu while the editor is open (Keel's
			// width slider previews live). Re-read who owns the width so the
			// handle and an open Menu settings dialog stop showing a stale one.
			syncWidthControls();
			placeRowControls( selectedKey );
		}

		apply();
		if ( window.ResizeObserver ) {
			new window.ResizeObserver( apply ).observe( wrap );
		}
	}

	/* ---------- build model + wire the DOM --------------------------------- */

	function init() {
		document.body.classList.add( 'maestro-editing' );
		forceUnfold();
		forceResponsiveOpen();
		trackMenuWidth();

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
				// Phase 27: profile IDs, already filtered to live profiles and
				// withheld from a viewer without `list_users` by the model.
				hiddenProfiles: ( node.hiddenProfiles || [] ).slice(),
				childHiddenProfiles: ( node.childHiddenProfiles || [] ).slice(),
				hasChildren: node.submenu.length > 0
			};

			var li = node.liId ? document.getElementById( node.liId ) : null;
			if ( ! li ) { return; }
			li.dataset.maestroSlug = node.slug;
			li.classList.add( 'maestro-item' );
			// Seeded from EVERY own-hide axis, matching what the popover's setSet
			// toggles it to. Seeding from roles alone meant a saved person-hide
			// looked like an ordinary row after every reload, until someone
			// happened to open its popover — the marker disagreeing with the
			// rule it exists to advertise. One tested predicate, so a new axis
			// cannot be missed here again.
			if ( window.maestroLogic.hasOwnHide( model[ node.slug ] ) ) { li.classList.add( 'maestro-has-hidden' ); }

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
					hiddenProfiles: ( child.hiddenProfiles || [] ).slice(),
					isSub: true,
					parent: node.slug
				};

				var sli = findSubmenuLi( subLis, claimedSubLis, child.slug );
				if ( ! sli ) { return; }
				claimedSubLis.push( sli );
				sli.dataset.maestroSlug = child.slug; // bare: sub_order + legacy consumers
				sli.dataset.maestroKey  = key;         // qualified: model identity / selection
				sli.classList.add( 'maestro-subitem' );
				if ( window.maestroLogic.hasOwnHide( model[ key ] ) ) { sli.classList.add( 'maestro-has-hidden' ); }
			} );
		} );

		bindSeparators();
		buildToolbar();
		bindWidthHandle();
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

	/* ---------- separators ------------------------------------------------- */

	/*
	 * Core prints a separator as an id-less li.wp-menu-separator, so pair the
	 * rendered rows with D.separators (the same $menu, same order) by position.
	 * If the counts disagree, something rewrote the sidebar after it was printed:
	 * leave every separator unmanaged rather than bind one to the wrong slug.
	 */
	function bindSeparators() {
		var lis   = document.querySelectorAll( '#adminmenu > li.wp-menu-separator' );
		var slugs = D.separators || [];
		if ( lis.length !== slugs.length ) { return; }
		Array.prototype.forEach.call( lis, function ( li, i ) {
			decorateSeparator( li, slugs[ i ] );
		} );
	}

	function decorateSeparator( li, slug ) {
		li.dataset.maestroSlug = slug;
		li.classList.add( 'maestro-item', 'maestro-separator' );
		// Core hides separators from screen readers; while editing, one is a
		// row you can select, move, and remove, so it needs a name and focus.
		li.removeAttribute( 'aria-hidden' );
		li.setAttribute( 'aria-label', I.separator );
		li.tabIndex = 0;
		model[ slug ] = {
			title: I.separator,
			icon: '',
			hiddenRoles: [],
			childHiddenRoles: [],
			hiddenUsers: [],
			childHiddenUsers: [],
			hiddenProfiles: [],
			childHiddenProfiles: [],
			isSub: false,
			hasChildren: false,
			isSeparator: true
		};
	}

	function isAddedSeparator( slug ) {
		return slug.indexOf( D.separatorPrefix ) === 0;
	}

	// Top-level rows (items and separators) in their current DOM order.
	function topRows() {
		return Array.prototype.slice.call(
			document.querySelectorAll( '#adminmenu > li.maestro-item[data-maestro-slug]' )
		);
	}

	// Core drops a separator that directly follows another one or ends the
	// menu, so one added in either place would vanish on the next load.
	function canAddSeparatorBelow( key ) {
		var rows = topRows();
		var next = rows[ rows.indexOf( liForKey( key ) ) + 1 ];
		return !! ( next && ! next.classList.contains( 'maestro-separator' ) );
	}

	function addSeparatorBelow() {
		var m = selectedKey && model[ selectedKey ];
		if ( ! m || m.isSub || m.isSeparator || ! canAddSeparatorBelow( selectedKey ) ) { return; }
		var anchor = liForKey( selectedKey );
		if ( ! anchor ) { return; }

		// Base36 time plus a random tail: unique per click, and inside the
		// [a-z0-9]{1,20} suffix the server accepts.
		var id = D.separatorPrefix + Date.now().toString( 36 ) + Math.floor( Math.random() * 1296 ).toString( 36 );
		var li = el( 'li', 'wp-not-current-submenu wp-menu-separator' );
		li.appendChild( el( 'div', 'separator' ) );
		anchor.parentNode.insertBefore( li, anchor.nextSibling );
		decorateSeparator( li, id );

		selectItem( li, { focusPanel: true } );
		speak( I.separatorAdded );
		scheduleAutosave();
	}

	function removeSelectedSeparator() {
		var slug = selectedKey;
		var m    = slug && model[ slug ];
		if ( ! m || ! m.isSeparator ) { return; }

		var li   = liForKey( slug );
		var rows = topRows();
		var prev = li ? rows[ rows.indexOf( li ) - 1 ] || rows[ rows.indexOf( li ) + 1 ] : null;

		// One Maestro added simply stops being listed; an existing row has to be
		// named so replay drops it on later loads.
		if ( isAddedSeparator( slug ) ) {
			droppedSeparators.push( slug );
		} else if ( removedSeparators.indexOf( slug ) === -1 ) {
			removedSeparators.push( slug );
		}
		if ( li ) { li.remove(); }
		delete model[ slug ];
		selectedKey = null;
		panel.root.hidden = true;
		placeRowControls( null );

		// Keep focus in the menu, on the row that took its place.
		if ( prev ) {
			selectItem( prev );
			( prev.querySelector( 'a' ) || prev ).focus( { preventScroll: true } );
		}
		speak( I.separatorRemoved );
		scheduleAutosave();
	}

	/* ---------- click-to-select ------------------------------------------- */

	function bindMenuSelection() {
		var menu = document.getElementById( 'adminmenu' );
		if ( ! menu ) { return; }

		menu.addEventListener( 'click', function ( e ) {
			// Suppress navigation on every menu click while editing.
			var a = e.target.closest( 'a' );
			if ( a ) { e.preventDefault(); }

			// Popovers may be placed over the menu region, and the selected row
			// carries its own controls — let them handle their own clicks.
			if ( e.target.closest( '.maestro-popover, .maestro-row-ctl' ) ) {
				return;
			}

			var li = e.target.closest( 'li.maestro-item, li.maestro-subitem' );
			if ( ! li ) { return; }
			selectItem( li, { focusPanel: true } );
		}, true );

		menu.addEventListener( 'keydown', function ( e ) {
			var renameKey = !! rowCtl && ( e.key === 'F2' || e.key === 'Enter' );
			// Enter selects rows in both modes, including anchorless separators.
			if ( ! renameKey && e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar' ) {
				return;
			}
			if ( e.target.closest( '.maestro-popover, .maestro-row-ctl' ) ) {
				return;
			}

			var li = e.target.closest( 'li.maestro-item, li.maestro-subitem' );
			if ( ! li ) { return; }
			e.preventDefault();
			// Enter on the row that is already selected renames it, as F2 does
			// anywhere in the menu. F2 needs fn on most Mac keyboards, so Enter
			// is the primary keyboard path and F2 the familiar extra.
			if ( renameKey && ( e.key === 'F2' || li.classList.contains( 'maestro-selected' ) ) ) {
				if ( ! li.classList.contains( 'maestro-selected' ) ) { selectItem( li ); }
				startInlineRename();
				return;
			}
			if ( e.key === 'F2' ) { return; }
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
				menu.querySelectorAll( ':scope > li.maestro-item[data-maestro-slug]' ),
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
					: ':scope > li.maestro-item[data-maestro-slug]'
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

		// The move may have put a separator next to the selection (or taken one
		// away), which decides whether Add separator is available.
		populatePanel( selectedKey );

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

		// Sortable can defer blur until click selection has already changed.
		// Commit against the old selected key before moving the shared controls.
		if ( rowCtl && rowCtl.editing ) { finishInlineRename( true, false ); }

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
		// A separator has no rename field; its first real control is Remove.
		// With row controls on, any other row carries its own controls, so
		// focus stays on the row and Tab reaches them next: nothing jumps to
		// the toolbar, and a tap on a phone does not raise the keyboard.
		var focusTarget = model[ key ].isSeparator ? panel.removeSepBtn : ( rowCtl ? ( li.querySelector( 'a' ) || li ) : panel.rename );
		if ( opts.focusPanel && rowCtl && ! model[ key ].isSeparator ) {
			speak( I.rowSelected.replace( '%s', function () { return model[ key ].title; } ) );
		}
		if ( opts.focusPanel && focusTarget ) {
			try {
				focusTarget.focus( { preventScroll: true } );
			} catch ( err ) {
				focusTarget.focus();
			}
		}
	}

	/* ---------- selected-row controls (prototype) ------------------------- */

	/*
	 * DESKTOP-UX-NEXT-PASS prototype: rename, move and icon controls on the
	 * selected row itself rather than in the bottom toolbar. One set of nodes
	 * is re-parented into whichever row is selected:
	 *
	 *   - the icon button covers the row's own icon column (top level only),
	 *     so an icon becomes "Change icon" only once its row is selected; the
	 *     first click on any row always just selects it;
	 *   - a strip under the row holds Rename (pencil), Move up and Move down;
	 *   - Rename swaps the label for a field over it until Enter, Escape or
	 *     blur.
	 *
	 * They are children of the <li>, never of its <a>, so they neither
	 * navigate nor nest interactive content, and a press on a <button> or
	 * <input> never starts a sortable drag (`cancel`). Inside #adminmenu they
	 * are also inside #adminmenuwrap, so on phones core never counts a tap on
	 * them as a click outside the open menu.
	 *
	 * Separators keep their toolbar controls for now, as do Visibility, Reset
	 * item and Add separator for every row.
	 */
	// Opt-in while it is a prototype, so the shipped toolbar flow (and every
	// spec written against it) is unchanged: ?maestro_rows=1 turns it on and
	// remembers that in this browser, ?maestro_rows=0 turns it back off.
	function rowControlsEnabled() {
		var flag = new window.URLSearchParams( window.location.search ).get( 'maestro_rows' );
		try {
			if ( flag === '1' || flag === '0' ) { window.localStorage.setItem( 'maestroRowControls', flag ); }
			return window.localStorage.getItem( 'maestroRowControls' ) === '1';
		} catch ( err ) {
			return flag === '1';
		}
	}


	// Menu labels are content, never credentials. Keep native autocomplete off
	// and offer extension-specific ignore hints without changing field semantics
	// or blocking focus/paste. Browsers and extensions may override these hints.
	function discourageCredentialAutofill( input ) {
		input.setAttribute( 'autocomplete', 'off' );
		[ 'data-1p-ignore', 'data-lpignore', 'data-bwignore', 'data-protonpass-ignore' ].forEach( function ( attr ) {
			input.setAttribute( attr, 'true' );
		} );
	}

	function buildRowControls() {
		if ( ! rowControlsEnabled() ) { return; }
		document.body.classList.add( 'maestro-row-controls' );
		var strip = el( 'div', 'maestro-row-strip maestro-row-ctl' );
		strip.setAttribute( 'role', 'group' );

		function stripButton( cls, glyph, label, onClick ) {
			var b = el( 'button', 'maestro-row-btn maestro-row-ctl ' + cls );
			b.type = 'button';
			iconButton( b, glyph, label );
			b.addEventListener( 'click', function ( e ) {
				e.preventDefault();
				onClick( b );
			} );
			strip.appendChild( b );
			return b;
		}

		// A move re-inserts the row, which detaches the focused button inside
		// it; put focus back so repeated presses chain.
		function moveAndKeepFocus( dir ) {
			return function ( b ) {
				moveSelected( dir );
				b.focus( { preventScroll: true } );
			};
		}

		var renameBtn = stripButton( 'maestro-row-rename', 'dashicons-edit', I.renamePlaceholder, startInlineRename );
		var moveUp    = stripButton( 'maestro-row-up', 'dashicons-arrow-up-alt2', I.moveUp, moveAndKeepFocus( 'up' ) );
		var moveDown  = stripButton( 'maestro-row-down', 'dashicons-arrow-down-alt2', I.moveDown, moveAndKeepFocus( 'down' ) );

		// The icon button draws nothing of its own: the row's real icon shows
		// through it, framed while the row is selected (maestro.css).
		var iconBtn = el( 'button', 'maestro-row-icon maestro-row-ctl' );
		iconBtn.type = 'button';
		iconBtn.setAttribute( 'aria-haspopup', 'dialog' );
		iconBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			openIconPicker( iconBtn );
		} );

		var input = el( 'input', 'maestro-row-rename-input maestro-row-ctl' );
		input.type = 'text';
		discourageCredentialAutofill( input );
		input.dir = 'auto';
		// Same accessible name as the toolbar field it stands in for (WCAG
		// 2.5.3: the placeholder is the only visible label).
		input.placeholder = I.renamePlaceholder;
		input.setAttribute( 'aria-label', I.renamePlaceholder );

		// The strip sits on the menu's own background, so take its colour from
		// an ordinary (not current, not selected) label in the active scheme.
		var menu = document.getElementById( 'adminmenu' );
		var plain = menu && menu.querySelector( 'li.menu-top:not(.current):not(.wp-has-current-submenu) .wp-menu-name' );
		if ( plain ) { menu.style.setProperty( '--maestro-row-fg', window.getComputedStyle( plain ).color ); }
		window.addEventListener( 'resize', function () { placeRowControls( selectedKey ); } );

		rowCtl = { strip: strip, renameBtn: renameBtn, moveUp: moveUp, moveDown: moveDown, iconBtn: iconBtn, input: input, editing: null, composing: false };

		input.addEventListener( 'compositionstart', function () { rowCtl.composing = true; } );
		input.addEventListener( 'compositionend', function () { rowCtl.composing = false; } );
		input.addEventListener( 'keydown', function ( e ) {
			// IME confirmation/cancellation belongs to the composition, not the edit.
			// WebKit can clear isComposing on the final key but still report 229.
			if ( e.isComposing || rowCtl.composing || e.keyCode === 229 ) { return; }
			if ( e.key === 'Enter' ) {
				e.preventDefault();
				finishInlineRename( true, true );
			} else if ( e.key === 'Escape' ) {
				e.preventDefault();
				e.stopPropagation();
				finishInlineRename( false, true );
			}
		} );
		input.addEventListener( 'blur', function () { finishInlineRename( true, false ); } );
	}

	// Put the row controls into the selected row, or take them out (key null,
	// or a separator). Called from populatePanel(), so it also follows a move
	// or a drag.
	function placeRowControls( key ) {
		if ( ! rowCtl ) { return; }
		var m  = key ? model[ key ] : null;
		var li = m && ! m.isSeparator ? liForKey( key ) : null;
		var a  = li ? li.querySelector( 'a' ) : null;
		if ( ! a ) {
			[ rowCtl.iconBtn, rowCtl.strip ].forEach( function ( n ) { if ( n.parentNode ) { n.parentNode.removeChild( n ); } } );
			return;
		}
		// Row first, then Change icon, then the strip: the Tab order follows the
		// row's reading order, and the submenu (if any) comes after them all.
		// Keep the focused editor directly after the link while repositioning.
		var leading = rowCtl.editing === key && rowCtl.input.parentNode === li ? rowCtl.input : a;
		var hasIcon = ! m.isSub && li.querySelector( '.wp-menu-image' );
		if ( hasIcon ) {
			if ( rowCtl.iconBtn.previousSibling !== leading ) { li.insertBefore( rowCtl.iconBtn, leading.nextSibling ); }
			// Cover the icon column; coarse pointers get a real 44px target inside
			// the row. CSS reserves label space and chooses the inline side for RTL.
			var ir = hasIcon.getBoundingClientRect();
			var lr = li.getBoundingClientRect();
			var touchTarget = window.matchMedia( '(pointer: coarse)' ).matches;
			rowCtl.iconBtn.style.top    = ( touchTarget ? 0 : ir.top - lr.top ) + 'px';
			rowCtl.iconBtn.style.width  = Math.max( touchTarget ? 44 : 0, ir.width ) + 'px';
			rowCtl.iconBtn.style.height = Math.max( touchTarget ? 44 : 0, ir.height ) + 'px';
			var label = I.changeIconOf.replace( '%s', function () { return m.title; } );
			rowCtl.iconBtn.setAttribute( 'aria-label', label );
			rowCtl.iconBtn.title = label;
		} else if ( rowCtl.iconBtn.parentNode ) {
			rowCtl.iconBtn.parentNode.removeChild( rowCtl.iconBtn );
		}
		var after = hasIcon ? rowCtl.iconBtn : leading;
		if ( rowCtl.strip.previousSibling !== after ) { li.insertBefore( rowCtl.strip, after.nextSibling ); }
		rowCtl.strip.setAttribute( 'aria-label', m.title );
		var renameLabel = I.renameItem.replace( '%s', function () { return m.title; } );
		rowCtl.renameBtn.setAttribute( 'aria-label', renameLabel );
		rowCtl.renameBtn.title = renameLabel;
		if ( rowCtl.editing === key ) { positionInlineRename(); }
	}

	function startInlineRename() {
		if ( ! rowCtl || ! selectedKey || ! model[ selectedKey ] || model[ selectedKey ].isSeparator ) { return; }
		var m  = model[ selectedKey ];
		var li = liForKey( selectedKey );
		var a  = li && li.querySelector( 'a' );
		if ( ! a ) { return; }
		closePopovers();

		var input = rowCtl.input;
		input.value = m.title;

		rowCtl.editing = selectedKey;
		li.classList.add( 'maestro-renaming' );
		li.insertBefore( input, a.nextSibling );
		positionInlineRename();
		input.focus( { preventScroll: true } );
		input.select();
	}

	// Width owners can resize without a window resize. Re-measure only geometry:
	// never replace the field or reset its value, focus, or selection.
	function positionInlineRename() {
		var key = rowCtl && rowCtl.editing;
		var m = key && model[ key ];
		var li = m && liForKey( key );
		var a = li && li.querySelector( 'a' );
		if ( ! a ) { return; }
		// Cover the label, not the icon column. Measured, so RTL, a widened
		// menu and a wrapped long label all line up without per-case CSS.
		var target = ( ! m.isSub && a.querySelector( '.wp-menu-name' ) ) || a;
		var lr = li.getBoundingClientRect();
		var tr = target.getBoundingClientRect();
		var ar = a.getBoundingClientRect();
		var input = rowCtl.input;
		input.style.top    = ( ar.top - lr.top ) + 'px';
		input.style.height = ar.height + 'px';
		var ts = window.getComputedStyle( target );
		var padStart = parseFloat( ts.paddingLeft ) || 0;   // core pads the label past the icon
		var padEnd   = parseFloat( ts.paddingRight ) || 0;
		input.style.left   = ( tr.left + padStart - lr.left ) + 'px';
		input.style.width  = Math.max( 60, tr.width - padStart - padEnd ) + 'px';
	}

	// Enter and blur commit, Escape cancels. Only the keyboard paths move
	// focus (back to the pencil); a blur has already put it where the user
	// wanted it.
	function finishInlineRename( commit, refocus ) {
		var key = rowCtl && rowCtl.editing;
		if ( ! key ) { return; }
		rowCtl.editing = null; // first, so the blur from removing the field is a no-op
		rowCtl.composing = false;
		var input = rowCtl.input;
		var li = liForKey( key );
		if ( li ) { li.classList.remove( 'maestro-renaming' ); }
		if ( input.parentNode ) { input.parentNode.removeChild( input ); }
		if ( commit && key === selectedKey ) {
			panel.rename.value = input.value;
			commitRename();
		}
		if ( refocus && key === selectedKey && rowCtl.renameBtn.parentNode ) {
			rowCtl.renameBtn.focus( { preventScroll: true } );
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
		// Read core's active menu colours after the user's colour scheme loads.
		var current = document.querySelector( '#adminmenu li.current > a, #adminmenu li.wp-has-current-submenu > a' );
		if ( current ) {
			var scheme = window.getComputedStyle( current );
			bar.style.setProperty( '--maestro-menu-accent', scheme.backgroundColor );
			bar.style.setProperty( '--maestro-menu-accent-text', scheme.color );
		}

		// Transient save-status — aria-live, empty at idle so no announcement fires.
		// Floats above the toolbar: visible state text and a shape cue, announced
		// through the live region without reserving an empty toolbar column.
		statusEl = el( 'span', 'maestro-status maestro-status-idle' );
		statusEl.setAttribute( 'role', 'status' );
		statusEl.setAttribute( 'aria-live', 'polite' );
		statusEl.setAttribute( 'aria-atomic', 'true' );
		statusEl.appendChild( el( 'span', 'maestro-status-text' ) );
		bar.appendChild( statusEl );

		// A failed save stays up until a later save succeeds, so it can cover
		// the page corner for a long time. The × hides the bubble only: the
		// error state and lastSaveOk stand, so Preview still refuses, and the
		// next setStatus() (another edit, or another failure) shows it again.
		// A sibling, not a child, so the live region never announces it.
		statusDismiss = el( 'button', 'button-link maestro-status-dismiss', '\u00d7' );
		statusDismiss.type = 'button';
		statusDismiss.hidden = true;
		statusDismiss.setAttribute( 'aria-label', I.dismissSaveError );
		statusDismiss.title = I.dismissSaveError;
		statusDismiss.addEventListener( 'click', function () {
			statusEl.classList.add( 'maestro-status-dismissed' );
			statusDismiss.hidden = true;
			var target = bar.querySelector( 'button:not([disabled]):not([hidden]):not(.maestro-status-dismiss)' );
			if ( target ) { target.focus(); }
		} );
		bar.appendChild( statusDismiss );

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
		setText( renameLabel, I.renamePlaceholder );
		var rename = el( 'input', 'maestro-rename-input' );
		rename.type = 'text';
		discourageCredentialAutofill( rename );
		rename.id = 'maestro-rename-field';
		rename.placeholder = I.renamePlaceholder;
		rename.dir = 'auto'; // a typed or translated title sets its own direction
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

		var addSepBtn = el( 'button', 'button maestro-add-separator' );
		addSepBtn.type = 'button';
		iconButton( addSepBtn, 'dashicons-minus', I.addSeparator );
		addSepBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			addSeparatorBelow();
		} );

		var removeSepBtn = el( 'button', 'button maestro-remove-separator' );
		removeSepBtn.type = 'button';
		iconButton( removeSepBtn, 'dashicons-trash', I.removeSeparator );
		removeSepBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			removeSelectedSeparator();
		} );

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
		p.appendChild( addSepBtn );
		p.appendChild( removeSepBtn );
		bar.appendChild( p );
		buildRowControls();

		panel = {
			root:         p,
			label:        label,
			rename:       rename,
			moveUp:       moveUp,
			moveDown:     moveDown,
			iconBtn:      iconBtn,
			visBtn:       visBtn,
			resetBtn:     resetItemBtn,
			addSepBtn:    addSepBtn,
			removeSepBtn: removeSepBtn,
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

		// Menu-wide settings (Phase 28-03; DECISION-settings-surface.md). The
		// right zone already holds the one global control, Reset All, so a
		// global setting reads as global here rather than as a property of the
		// selected row.
		var settings = el( 'button', 'button maestro-settings-btn' );
		settings.type = 'button';
		settings.setAttribute( 'aria-haspopup', 'dialog' );
		iconButton( settings, 'dashicons-admin-settings', I.settings );
		settings.addEventListener( 'click', function () { openSettings( settings ); } );

		// Hiding profiles (Phase 27) are menu-wide too, so they sit beside
		// Settings. Gated like the people groups: without `list_users` there
		// is nothing to show and the save keeps the stored profiles.
		if ( D.canPickUsers ) {
			profilesBtn = el( 'button', 'button maestro-profiles-btn' );
			profilesBtn.type = 'button';
			profilesBtn.setAttribute( 'aria-haspopup', 'dialog' );
			iconButton( profilesBtn, 'dashicons-groups', I.profiles );
			profilesBtn.addEventListener( 'click', function () { openProfiles( profilesBtn ); } );
			right.appendChild( profilesBtn );
		}
		var preview = buildPreviewPicker();
		if ( preview ) { right.appendChild( preview ); }
		right.appendChild( settings );
		right.appendChild( help );
		right.appendChild( resetAll );
		bar.appendChild( right );

		/*
		 * At narrow widths the toolbar lives INSIDE #adminmenuwrap rather than on
		 * <body>, which is not cosmetic — it is what keeps the menu open.
		 *
		 * Core closes the responsive menu on any click outside
		 * #wp-admin-bar-menu-toggle and #adminmenuwrap (wp-admin/js/common.js).
		 * A toolbar on <body> is outside both, so every editing control closed
		 * the menu being edited. Being a descendant of the sidebar satisfies
		 * core's own containment test instead of fighting it: core never closes
		 * the menu, so nothing has to re-open it, and the hamburger keeps working
		 * normally rather than being silently neutralised.
		 *
		 * Safe because the toolbar is position:fixed — the DOM parent does not
		 * move it. Measured identical either way (375x62 at 0,750 on a 375px
		 * viewport); #adminmenuwrap sets no transform/filter/perspective that
		 * would make it a containing block, and does not clip.
		 *
		 * The tradeoff is deliberate: closing the menu now hides the toolbar with
		 * it, since it is part of that subtree. That reads correctly — no menu on
		 * screen means nothing to edit — it reverses on the next tap, and Exit
		 * stays on the admin bar, which UX-09 already made the single entry/exit.
		 */
		var menuWrap = document.getElementById( 'adminmenuwrap' );
		var hamburger = document.getElementById( 'wp-admin-bar-menu-toggle' );

		function mountToolbar() {
			var parent = menuWrap && hamburger && hamburger.offsetParent !== null ? menuWrap : document.body;
			if ( bar.parentNode !== parent ) { parent.appendChild( bar ); }
		}
		mountToolbar();
		window.addEventListener( 'resize', mountToolbar );

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
			/*
			 * Only Maestro's own unsaved work can be in play here: a debounced or
			 * in-flight menu save, flushed by waitForSaveIdle() so the navigation
			 * cannot outrun it.
			 *
			 * Until WP71-05 this also had to preserve the POST's content, because
			 * edit mode was reachable in the post editor with fullscreen off — the
			 * asymmetry UX-13 fixed on entry and this half originally missed. It is
			 * not reachable any more: Assets::enqueue() does not load this file on
			 * block-editor screens, and maestro-post-guard.js loads only on them,
			 * so the two are never present together and that branch has gone.
			 *
			 * The guard itself stays, used by maestro-entry.js for the Site Editor
			 * toggle, which still navigates away from possibly-unsaved work.
			 */
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
		setText( panel.label, crumb );

		// A separator can only be moved or removed; an item can gain one below
		// it (top level only, and not where core would drop it as a duplicate).
		var isSep = !! m.isSeparator;
		placeRowControls( key );
		panel.root.classList.toggle( 'maestro-panel-row-owned', !! rowCtl && ! isSep );
		panel.rename.style.display       = isSep ? 'none' : '';
		panel.visBtn.style.display       = isSep ? 'none' : '';
		panel.resetBtn.style.display     = isSep ? 'none' : '';
		panel.removeSepBtn.style.display = isSep ? '' : 'none';
		panel.addSepBtn.style.display    = ( isSep || m.isSub ) ? 'none' : '';
		panel.addSepBtn.disabled         = ! isSep && ! m.isSub && ! canAddSeparatorBelow( key );
		if ( isSep ) {
			panel.iconBtn.style.display = 'none';
			return;
		}

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
		if ( ! selectedKey || ! model[ selectedKey ] || model[ selectedKey ].isSeparator ) { return; }
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
		search.dir = 'auto';
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

		var reposition = placePopover( pop, anchorBtn );
		applyFilter();
		// The grid only fills in applyFilter(), so the first placement measured
		// a near-empty popover: placed above the anchor by that height, the full
		// one ran off the bottom of a short screen. Once, so later filtering
		// still does not move the grid under the pointer.
		reposition();
		search.focus();
	}

	/* ---------- menu-wide settings: menu width (Phase 28-03) -------------- */

	/*
	 * The width has two controls on purpose (DECISION-settings-surface.md): a
	 * field in the Settings dialog, which is the precise and labelled path, and
	 * a handle on the menu's edge, which is the discoverable one. Both go
	 * through setMenuWidth(), so there is one preview and one save path.
	 *
	 * The preview changes the MENU, not --maestro-menu-width: 28-01 measures the
	 * rendered menu, so the toolbar follows by itself, and a width another
	 * plugin forces with !important visibly does not change. That is also how
	 * the dialog knows to say so.
	 */
	function previewMenuWidth() {
		if ( ! widthPreviewEl ) {
			widthPreviewEl = el( 'style' );
			widthPreviewEl.id = 'maestro-menu-width-preview';
			// After the server's own rule, so at equal specificity this one wins.
			document.body.appendChild( widthPreviewEl );
		}
		widthPreviewEl.textContent = window.maestroLogic.menuWidthCss( menuWidth || widthBounds.default );
	}

	function setMenuWidth( value ) {
		var next = window.maestroLogic.clampMenuWidth( value, widthBounds );
		if ( next === menuWidth ) {
			syncWidthControls();
			return;
		}
		menuWidth = next;
		previewMenuWidth();
		syncWidthControls();
		// Debounced: the preview is immediate, the writes are not one per pixel.
		scheduleAutosave();
	}

	/**
	 * The width another plugin is holding the menu at, or null when the
	 * rendered menu is the width Maestro asked for. Only meaningful where the
	 * width applies at all: 961px and up, not folded.
	 */
	function widthOverriddenAt() {
		var wrap = document.getElementById( 'adminmenuwrap' );
		if ( ! wrap || window.innerWidth < 961 || document.body.classList.contains( 'folded' ) ) {
			return null;
		}
		var rendered = Math.round( wrap.getBoundingClientRect().width );
		return rendered && rendered !== ( menuWidth || widthBounds.default ) ? rendered : null;
	}

	function widthStateText( overridden ) {
		if ( overridden ) {
			return I.widthOverridden.replace( '%d', String( overridden ) );
		}
		return menuWidth
			? I.menuWidthCustom.replace( '%d', String( menuWidth ) )
			: I.menuWidthDefault.replace( '%d', String( widthBounds.default ) );
	}

	function syncWidthControls() {
		var current = menuWidth || widthBounds.default;
		var valueText = I.menuWidthValue.replace( '%d', String( current ) );

		if ( widthHandle ) {
			// While another plugin holds the width, the handle reports the width
			// on screen and says why it cannot change it, rather than a value
			// that moving it would not produce.
			var held = widthOverriddenAt();
			// aria-valuenow must stay within valuemin..valuemax; the exact width
			// goes in the valuetext.
			widthHandle.setAttribute( 'aria-valuenow', String( held ? Math.min( widthBounds.max, Math.max( widthBounds.min, held ) ) : current ) );
			widthHandle.setAttribute( 'aria-valuetext', held ? widthStateText( held ) : valueText );
			widthHandle.setAttribute( 'aria-disabled', held ? 'true' : 'false' );
			widthHandle.classList.toggle( 'is-overridden', !! held );
		}
		// A click outside closes the dialog without going through close().
		if ( widthControls && ! document.contains( widthControls.range ) ) {
			widthControls = null;
		}
		if ( ! widthControls ) { return; }

		var c = widthControls;
		c.range.value = String( current );
		c.range.setAttribute( 'aria-valuetext', valueText );
		// Leave the number alone while someone is typing in it: "2" on the way
		// to "240" must not snap to the minimum under their cursor.
		if ( document.activeElement !== c.number ) {
			c.number.value = String( current );
		}
		c.reset.disabled = ! menuWidth;

		// Measure after the preview has laid out.
		window.requestAnimationFrame( function () {
			if ( widthControls === c ) {
				var over = widthOverriddenAt();
				setText( c.state, widthStateText( over ) );
				c.state.classList.toggle( 'is-overridden', !! over );
			}
		} );
	}

	function openSettings( anchorBtn ) {
		if ( window.innerWidth < 961 ) { return; }
		closePopovers();

		var pop = el( 'div', 'maestro-popover maestro-settings-popover' );
		pop.setAttribute( 'role', 'dialog' );
		pop.setAttribute( 'aria-modal', 'true' );
		pop.setAttribute( 'aria-labelledby', 'maestro-settings-title' );

		var title = el( 'h2', 'maestro-settings-title', I.menuWidth );
		title.id = 'maestro-settings-title';
		pop.appendChild( title );

		var group = el( 'div', 'maestro-width-field' );
		var label = el( 'label', 'maestro-width-label screen-reader-text', I.menuWidth );
		label.htmlFor = 'maestro-width-range';
		group.appendChild( label );

		var row = el( 'div', 'maestro-width-row' );
		var range = el( 'input', 'maestro-width-range' );
		range.type = 'range';
		range.id = 'maestro-width-range';
		range.min = String( widthBounds.min );
		range.max = String( widthBounds.max );
		range.step = '1';
		range.setAttribute( 'aria-describedby', 'maestro-width-state maestro-width-hint' );
		row.appendChild( range );

		var number = el( 'input', 'maestro-width-number' );
		number.type = 'number';
		number.min = range.min;
		number.max = range.max;
		number.step = '1';
		number.setAttribute( 'aria-label', I.menuWidthPx );
		number.setAttribute( 'aria-describedby', 'maestro-width-state' );
		row.appendChild( number );

		var unit = el( 'span', 'maestro-width-unit', 'px' );
		unit.setAttribute( 'aria-hidden', 'true' );
		row.appendChild( unit );
		group.appendChild( row );

		var state = el( 'p', 'maestro-width-state' );
		state.id = 'maestro-width-state';
		group.appendChild( state );

		var hint = el( 'p', 'maestro-width-hint description', I.menuWidthHint );
		hint.id = 'maestro-width-hint';
		group.appendChild( hint );
		pop.appendChild( group );

		var actions = el( 'div', 'maestro-settings-actions' );
		var reset = el( 'button', 'button maestro-width-reset', I.widthUseDefault );
		reset.type = 'button';
		var done = el( 'button', 'button button-primary maestro-settings-done', I.tourDone );
		done.type = 'button';
		actions.appendChild( reset );
		addDialogClose( pop, done );
		pop.appendChild( actions );

		widthControls = { range: range, number: number, state: state, reset: reset };

		range.addEventListener( 'input', function () { setMenuWidth( range.value ); } );
		// While typing, apply only values already in range; settle on change.
		number.addEventListener( 'input', function () {
			var n = parseInt( number.value, 10 );
			if ( n >= widthBounds.min && n <= widthBounds.max ) { setMenuWidth( n ); }
		} );
		number.addEventListener( 'change', function () {
			// Number() so "250.5" or "1e3" round and clamp like the server does;
			// anything unparseable keeps the current width instead of resetting it.
			var n = number.value === '' ? widthBounds.default : Number( number.value );
			setMenuWidth( isFinite( n ) ? n : ( menuWidth || widthBounds.default ) );
			number.value = String( menuWidth || widthBounds.default );
		} );
		reset.addEventListener( 'click', function () {
			setMenuWidth( widthBounds.default );
			speak( I.widthDefaultSet );
			range.focus();
		} );

		function close() {
			widthControls = null;
			closePopovers();
			anchorBtn.focus();
		}
		done.addEventListener( 'click', close );

		// Escape closes and restores focus; Tab is trapped within the dialog.
		pop.addEventListener( 'keydown', function ( e ) {
			if ( e.key === 'Escape' ) {
				e.preventDefault();
				e.stopPropagation();
				return;
			}
			if ( e.key !== 'Tab' ) { return; }
			var focusable = Array.prototype.filter.call(
				pop.querySelectorAll( 'input, button' ),
				function ( n ) { return ! n.disabled && n.offsetParent !== null; }
			);
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

		// Core dismisses the responsive menu on Escape keyup. Keep the dialog
		// mounted until that event so it can consume it before returning focus.
		pop.addEventListener( 'keyup', function ( e ) {
			// The dialog owns Tab. Core otherwise queues an outside-focus
			// check against this node, which becomes detached if Escape follows.
			if ( e.key === 'Tab' ) { e.stopPropagation(); }
			if ( e.key === 'Escape' ) {
				e.stopPropagation();
				close();
			}
		} );

		placePopover( pop, anchorBtn );
		syncWidthControls();
		range.focus();
	}

	/*
	 * The Hiding profiles dialog (Phase 27): create, rename and delete
	 * profiles and choose who is in each. Which items a profile hides is set
	 * per item in the Visibility popover, so this dialog never lists items.
	 *
	 * It reuses the Settings dialog's shell (maestro-settings-popover), so it
	 * gets the same placement inside the responsive menu, the same focus trap
	 * and the same Escape handling. Every change autosaves.
	 */
	function openProfiles( anchorBtn ) {
		closePopovers();
		var limits = D.profileLimits || { profiles: 20, members: 50, name: 40 };

		var pop = el( 'div', 'maestro-popover maestro-settings-popover maestro-profiles-popover' );
		pop.setAttribute( 'role', 'dialog' );
		pop.setAttribute( 'aria-modal', 'true' );
		pop.setAttribute( 'aria-labelledby', 'maestro-profiles-title' );

		var title = el( 'h2', 'maestro-settings-title', I.profiles );
		title.id = 'maestro-profiles-title';
		pop.appendChild( title );
		var intro = el( 'p', 'maestro-profiles-intro description', I.profilesIntro );
		intro.id = 'maestro-profiles-intro';
		pop.setAttribute( 'aria-describedby', intro.id );
		pop.appendChild( intro );

		var list = el( 'div', 'maestro-profiles-list' );
		pop.appendChild( list );

		// The add row: a name field and its button, with one live message line
		// shared by the whole dialog for refusals (empty, taken, limit).
		var add = el( 'div', 'maestro-profile-add' );
		var addLabel = el( 'label', 'screen-reader-text', I.profileNewName );
		addLabel.htmlFor = 'maestro-profile-new';
		var addInput = el( 'input', 'maestro-profile-new' );
		addInput.type = 'text';
		addInput.id = 'maestro-profile-new';
		addInput.dir = 'auto';
		addInput.maxLength = limits.name;
		addInput.placeholder = I.profileNewName;
		addInput.setAttribute( 'autocomplete', 'off' );
		addInput.setAttribute( 'aria-describedby', 'maestro-profiles-msg' );
		var addBtn = el( 'button', 'button maestro-profile-add-btn', I.profileAdd );
		addBtn.type = 'button';
		add.appendChild( addLabel );
		add.appendChild( addInput );
		add.appendChild( addBtn );
		pop.appendChild( add );

		var msg = el( 'p', 'maestro-profiles-msg' );
		msg.id = 'maestro-profiles-msg';
		msg.setAttribute( 'aria-live', 'polite' );
		msg.hidden = true;
		pop.appendChild( msg );

		var done = el( 'button', 'button button-primary maestro-settings-done', I.tourDone );
		done.type = 'button';
		addDialogClose( pop, done );

		function say( text ) {
			setText( msg, text || '' );
			msg.hidden = ! text;
		}

		function problemText( problem ) {
			return 'empty' === problem ? I.profileNameEmpty : ( 'taken' === problem ? I.profileNameTaken : '' );
		}

		// Every item's profile axes, plus the stored hides of items not on
		// screen, so a delete confirmation counts what the save will drop.
		function assignments() {
			var out = Object.keys( model ).map( function ( key ) {
				return { key: key, own: model[ key ].hiddenProfiles, child: model[ key ].childHiddenProfiles };
			} );
			return window.maestroLogic.carryProfileHides( out, profileCarry );
		}

		function renderList() {
			list.textContent = '';
			profiles.forEach( function ( p ) {
				list.appendChild( buildProfileRow( p ) );
			} );
			addInput.disabled = false;
			addBtn.disabled = false;
		}

		function buildProfileRow( p ) {
			var row = el( 'section', 'maestro-profile' );
			row.dataset.profileId = p.id;

			var guidance = el( 'p', 'maestro-profile-guidance description', I.profileGuidance );
			guidance.id = 'maestro-profile-guidance-' + p.id;

			var head = el( 'div', 'maestro-profile-head' );
			var name = el( 'input', 'maestro-profile-name' );
			name.type = 'text';
			name.value = p.name;
			name.dir = 'auto';
			name.maxLength = limits.name;
			name.setAttribute( 'aria-label', I.profileName );
			name.setAttribute( 'aria-describedby', guidance.id );
			name.setAttribute( 'autocomplete', 'off' );
			head.appendChild( name );

			var del = el( 'button', 'button-link button-link-delete maestro-profile-delete' );
			del.type = 'button';
			iconButton( del, 'dashicons-trash', I.profileDelete.replace( '%s', function () { return p.name; } ) );
			head.appendChild( del );
			row.appendChild( head );
			row.appendChild( guidance );

			var picker = buildPersonPicker(
				I.profileMembers.replace( '%s', function () { return p.name; } ),
				'maestro-profile-members',
				function () { return p.users; },
				function ( arr ) { p.users = arr; },
				{
					max: limits.members,
					selfWarning: I.profileSelfWarning,
					onChange: scheduleAutosave
				}
			);
			row.appendChild( picker.el );

			// Commit each valid keystroke, so an autosave never carries a name
			// the server would refuse; an invalid one is flagged and, on
			// leaving the field, put back.
			name.addEventListener( 'input', function () {
				var problem = window.maestroLogic.profileNameProblem( name.value, profiles, p.id );
				if ( problem ) {
					name.setAttribute( 'aria-invalid', 'true' );
					name.setAttribute( 'aria-describedby', guidance.id + ' ' + msg.id );
					say( problemText( problem ) );
					return;
				}
				name.removeAttribute( 'aria-invalid' );
				name.setAttribute( 'aria-describedby', guidance.id );
				say( '' );
				p.name = name.value.trim();
				var membersHead = picker.el.querySelector( '.maestro-vis-head' );
				if ( membersHead ) { setText( membersHead, I.profileMembers.replace( '%s', function () { return p.name; } ) ); }
				var delLabel = I.profileDelete.replace( '%s', function () { return p.name; } );
				del.setAttribute( 'aria-label', delLabel );
				del.title = delLabel;
				setText( del.querySelector( '.maestro-btn-label' ), delLabel );
				scheduleAutosave();
			} );
			name.addEventListener( 'change', function () {
				if ( 'true' === name.getAttribute( 'aria-invalid' ) ) {
					name.value = p.name;
					name.removeAttribute( 'aria-invalid' );
					name.setAttribute( 'aria-describedby', guidance.id );
					say( '' );
				}
			} );

			del.addEventListener( 'click', function ( e ) {
				// renderList() detaches this button before placePopover()'s
				// outside-click handler runs, which would close the dialog.
				e.stopPropagation();
				var count = window.maestroLogic.profileItemCount( p.id, assignments() );
				// Function replacers: a name is user text, and a "$&" in it would
				// otherwise be read as a replacement pattern.
				var question = I.profileDeleteConfirm
					.replace( '%1$s', function () { return p.name; } )
					.replace( '%2$d', function () { return String( count ); } )
					.replace( '%3$d', function () { return String( p.users.length ); } );
				if ( ! window.confirm( question ) ) { return; }
				deleteProfile( p.id );
				renderList();
				say( '' );
				speak( I.profileDeleted );
				addInput.focus();
			} );

			return row;
		}

		function addProfile() {
			if ( profiles.length >= limits.profiles ) {
				say( I.profileLimit.replace( '%d', String( limits.profiles ) ) );
				return;
			}
			var problem = window.maestroLogic.profileNameProblem( addInput.value, profiles );
			if ( problem ) {
				addInput.setAttribute( 'aria-invalid', 'true' );
				say( problemText( problem ) );
				addInput.focus();
				return;
			}
			var id = window.maestroLogic.nextProfileId( profiles, profileIdFloor );
			profileIdFloor = Number( id.slice( 2 ) );
			var p = { id: id, name: addInput.value.trim(), users: [] };
			profiles.push( p );
			addInput.value = '';
			addInput.removeAttribute( 'aria-invalid' );
			list.appendChild( buildProfileRow( p ) );
			say( profiles.length >= limits.profiles ? I.profileLimit.replace( '%d', String( limits.profiles ) ) : '' );
			speak( I.profileAdded );
			scheduleAutosave();
			// Straight on to choosing who is in it.
			var search = list.lastChild.querySelector( '.maestro-user-search' );
			( search || addInput ).focus();
		}

		addBtn.addEventListener( 'click', function ( e ) {
			e.stopPropagation();
			addProfile();
		} );
		addInput.addEventListener( 'keydown', function ( e ) {
			if ( e.key === 'Enter' ) {
				e.preventDefault();
				addProfile();
			}
		} );
		addInput.addEventListener( 'input', function () {
			addInput.removeAttribute( 'aria-invalid' );
			say( '' );
		} );

		function close() {
			closePopovers();
			anchorBtn.focus();
		}
		done.addEventListener( 'click', close );

		// Escape closes and restores focus; Tab is trapped within the dialog.
		// Same handling as openSettings(), including the keyup ordering core's
		// responsive menu needs.
		pop.addEventListener( 'keydown', function ( e ) {
			if ( e.key === 'Escape' ) {
				e.preventDefault();
				e.stopPropagation();
				return;
			}
			if ( e.key !== 'Tab' ) { return; }
			var focusable = Array.prototype.filter.call(
				pop.querySelectorAll( 'input, button' ),
				function ( n ) { return ! n.hidden && ! n.disabled && n.offsetParent !== null; }
			);
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
		pop.addEventListener( 'keyup', function ( e ) {
			if ( e.key === 'Tab' ) { e.stopPropagation(); }
			if ( e.key === 'Escape' ) {
				e.stopPropagation();
				close();
			}
		} );

		renderList();
		placePopover( pop, anchorBtn );
		( profiles.length ? list.querySelector( '.maestro-profile-name' ) : addInput ).focus();
	}

	// Remove a profile and every item's reference to it. The save rebuilds
	// the map from the model, so this one pass is the whole cleanup.
	function deleteProfile( id ) {
		profiles = profiles.filter( function ( p ) { return p.id !== id; } );
		// Its unrendered hides go with it; buildProfilesPayload() would skip
		// them anyway, but only while no profile reuses the ID.
		profileCarry = window.maestroLogic.dropProfileCarry( profileCarry, id );
		Object.keys( model ).forEach( function ( key ) {
			var m = model[ key ];
			var own   = window.maestroLogic.isProfileAssigned( m.hiddenProfiles, id );
			var child = window.maestroLogic.isProfileAssigned( m.childHiddenProfiles, id );
			if ( ! own && ! child ) { return; }
			m.hiddenProfiles      = window.maestroLogic.toggleProfile( m.hiddenProfiles, id, false );
			m.childHiddenProfiles = window.maestroLogic.toggleProfile( m.childHiddenProfiles, id, false );
			refreshHiddenMarker( key );
			refreshModifiedIndicator( key );
		} );
		scheduleAutosave();
	}

	/*
	 * The edge handle follows the WAI-ARIA window-splitter pattern: a focusable
	 * role="separator" with a value, so the drag has a keyboard twin (arrows,
	 * Shift for bigger steps, Home for the default, End for the maximum) and is
	 * not a pointer-only control.
	 */
	function bindWidthHandle() {
		var wrap = document.getElementById( 'adminmenuwrap' );
		if ( ! wrap ) { return; }

		var rtl = document.body.classList.contains( 'rtl' );
		var h = el( 'div', 'maestro-width-handle' );
		h.tabIndex = 0;
		h.setAttribute( 'role', 'separator' );
		h.setAttribute( 'aria-orientation', 'vertical' );
		h.setAttribute( 'aria-label', I.menuWidthHandle );
		h.setAttribute( 'aria-valuemin', String( widthBounds.min ) );
		h.setAttribute( 'aria-valuemax', String( widthBounds.max ) );
		h.setAttribute( 'aria-controls', 'adminmenuwrap' );
		h.title = I.menuWidthHandle;
		wrap.appendChild( h );
		widthHandle = h;
		syncWidthControls();

		// When another plugin holds the width, say so instead of saving a value
		// that would change nothing on screen.
		function blockedByOverride() {
			var over = widthOverriddenAt();
			if ( over ) {
				speak( I.widthOverridden.replace( '%d', String( over ) ) );
			}
			return !! over;
		}

		var dragging = null;
		h.addEventListener( 'pointerdown', function ( e ) {
			if ( e.button !== 0 || dragging !== null ) { return; }
			e.preventDefault();
			if ( blockedByOverride() ) { return; }
			dragging = e.pointerId;
			h.setPointerCapture( e.pointerId );
			document.body.classList.add( 'maestro-resizing' );

			function move( ev ) {
				if ( ev.pointerId !== dragging ) { return; }
				// Taken over mid-drag: stop rather than save widths that no
				// longer show.
				if ( blockedByOverride() ) {
					end( ev );
					return;
				}
				var r = wrap.getBoundingClientRect();
				var w = window.maestroLogic.menuWidthFromPointer( ev.clientX, r, rtl, widthBounds );
				setMenuWidth( w === null ? widthBounds.default : w );
			}
			function end( ev ) {
				if ( ev.pointerId !== dragging ) { return; }
				dragging = null;
				document.body.classList.remove( 'maestro-resizing' );
				h.removeEventListener( 'pointermove', move );
				h.removeEventListener( 'pointerup', end );
				h.removeEventListener( 'pointercancel', end );
				h.removeEventListener( 'lostpointercapture', end );
			}
			h.addEventListener( 'pointermove', move );
			h.addEventListener( 'pointerup', end );
			h.addEventListener( 'pointercancel', end );
			h.addEventListener( 'lostpointercapture', end );
		} );
		// The click that ends a drag must not count as a click outside an open
		// popover and close it.
		h.addEventListener( 'click', function ( e ) { e.stopPropagation(); } );

		h.addEventListener( 'keydown', function ( e ) {
			var current = menuWidth || widthBounds.default;
			var step = e.shiftKey ? 20 : 4;
			var grow = rtl ? 'ArrowLeft' : 'ArrowRight';
			var shrink = rtl ? 'ArrowRight' : 'ArrowLeft';
			var next = null;
			if ( e.key === grow || e.key === 'ArrowUp' ) { next = current + step; }
			else if ( e.key === shrink || e.key === 'ArrowDown' ) { next = current - step; }
			else if ( e.key === 'Home' ) { next = widthBounds.min; }
			else if ( e.key === 'End' ) { next = widthBounds.max; }
			if ( next === null ) { return; }
			e.preventDefault();
			if ( blockedByOverride() ) { return; }
			setMenuWidth( next );
		} );
	}

	// Reflect an icon value into the rendered menu image. The picker supplies a
	// dashicon class or a bundled data-URI; reset feeds back the pristine icon,
	// which can also be a URL / "none" / "". Branch so we never push a URL as a
	// CSS class.
	function applyIconPreview( li, icon ) {
		var img = li.querySelector( '.wp-menu-image' );
		if ( ! img ) { return; }

		// A URL icon (UpdraftPlus, miniOrange SAML, ...) is printed by core as an
		// <img> inside the menu image, which would sit on top of any new icon.
		Array.prototype.forEach.call( img.querySelectorAll( 'img' ), function ( el ) {
			el.parentNode.removeChild( el );
		} );

		// A base64 SVG icon (Yoast SEO, Smush, ...) is cached by core's
		// svg-painter.js as jQuery data (`wp-ui-svg-{color}`) and repainted with
		// `!important` on every hover, bringing the old logo back. Drop the cache
		// so the painter re-reads whatever background we set below: nothing for
		// a dashicon, or the new SVG (recoloured) for a data-URI.
		if ( window.jQuery ) {
			Object.keys( window.jQuery.data( img ) ).forEach( function ( key ) {
				if ( /^wp-?ui-?svg/i.test( key ) ) {
					window.jQuery.removeData( img, key );
				}
			} );
		}

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
			var roleKeys = Object.keys( D.roles );

			// Phase 29 (UX-14): "All other roles", a tri-state checkbox above the
			// rows that ticks every role the editing user does not hold, in one
			// save. Its targets come from the tested helpers in maestro-logic.js:
			// never the user's own roles, never a locked row. Its state follows
			// the rows (none, some, all), shown with the native indeterminate
			// flag, which assistive tech reads as "mixed".
			var allRow = el( 'label', 'maestro-vis-row maestro-vis-all' );
			var allCb  = el( 'input', 'maestro-vis-all-cb' );
			allCb.type = 'checkbox';
			var allText = el( 'span', '', I.allOtherRoles );
			allText.id = 'maestro-vis-all-' + ( ++groupIdSeq );
			// Name it "<heading> All other roles": the same words appear in both
			// role groups, so the heading is what tells them apart.
			allCb.setAttribute( 'aria-labelledby', headEl.id + ' ' + allText.id );
			allRow.appendChild( allCb );
			allRow.appendChild( document.createTextNode( ' ' ) );
			allRow.appendChild( allText );
			var ownNames = ( D.userRoles || [] )
				.filter( function ( r ) { return D.roles[ r ]; } )
				.map( function ( r ) { return D.roles[ r ]; } );
			if ( ownNames.length ) {
				allRow.appendChild( document.createTextNode( ' ' ) );
				var skips = el( 'span', 'maestro-vis-all-skips', '(' + I.allOtherRolesSkips.replace( '%s', ownNames.join( ', ' ) ) + ')' );
				skips.id = 'maestro-vis-all-skips-' + groupIdSeq;
				allRow.appendChild( skips );
				allCb.setAttribute( 'aria-describedby', skips.id );
			}
			group.appendChild( allRow );
			var limitStatus = el( 'p', 'maestro-role-limit description' );
			limitStatus.id = 'maestro-role-limit-' + groupIdSeq;
			limitStatus.hidden = true;
			group.appendChild( limitStatus );
			var descriptions = allCb.getAttribute( 'aria-describedby' );
			allCb.setAttribute( 'aria-describedby', ( descriptions ? descriptions + ' ' : '' ) + limitStatus.id );

			function allTargets() {
				return window.maestroLogic.selectAllRoleTargets( roleKeys, D.userRoles, opts.isLocked );
			}

			// A select-all of fewer than two roles is noise, so the row shows only
			// when it would tick at least two. Locks can change that while the
			// popover is open, so this re-runs from refresh().
			function refreshAll() {
				var targets = allTargets();
				var state   = window.maestroLogic.selectAllState( getSet(), targets );
				allRow.hidden      = targets.length < 2;
				allCb.checked      = 'all' === state;
				allCb.indeterminate = 'some' === state;
				setText( limitStatus, '' );
				limitStatus.hidden = true;
			}

			allCb.addEventListener( 'change', function () {
				var targets = allTargets();
				var on      = 'all' !== window.maestroLogic.selectAllState( getSet(), targets );
				var next = window.maestroLogic.applySelectAll( getSet(), targets, on, Number( D.maxHiddenRoles ) );
				if ( next === null ) {
					// Refuse atomically: saving a prefix would say "all" while the
					// server silently truncates it. Keep the previous choices.
					refresh();
					var message = I.roleLimitReached.replace( '%d', String( D.maxHiddenRoles ) );
					setText( limitStatus, message );
					limitStatus.hidden = false;
					speak( message, 'polite' );
					return;
				}
				setSet( next );
				if ( opts.onToggle ) { opts.onToggle(); }
				refresh();
				refreshModifiedIndicator( slug );
				scheduleAutosave();
				speak( ( on ? I.allOtherRolesOn : I.allOtherRolesOff ).replace( '%s', heading ), 'polite' );
			} );

			roleKeys.forEach( function ( roleKey ) {
				var row = el( 'label', 'maestro-vis-row' );
				var cb  = el( 'input' );
				cb.type = 'checkbox';
				cb.value = roleKey;
				cb.addEventListener( 'change', function () {
					// Phase 25 (M2): a locked row is now aria-disabled rather than
					// natively disabled, so it stays focusable — which means it is
					// also clickable, and the browser WILL flip its checked state.
					// Refuse the change and restore the derived value. Without this
					// guard the a11y improvement would have made a display-only row
					// editable, writing a derived value into the model: worse than
					// the problem it fixes.
					if ( 'true' === cb.getAttribute( 'aria-disabled' ) ) {
						cb.checked = true; // locked rows are always derived-checked
						return;
					}
					var set = getSet();
					if ( cb.checked ) {
						if ( set.indexOf( roleKey ) === -1 ) { set.push( roleKey ); }
						setSet( set );
					} else {
						setSet( set.filter( function ( r ) { return r !== roleKey; } ) );
					}
					if ( opts.onToggle ) { opts.onToggle(); }
					refreshAll();
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
					//
					// Phase 25 (M2): the reason is now a DESCRIPTION, referenced by
					// aria-describedby, rather than part of the control's accessible
					// NAME. "Editor, checkbox, already hidden because…" conflates what
					// the control IS with why it is unavailable; a description is what
					// screen readers announce after the name, which is the right shape
					// for a reason.
					hint     = el( 'span', 'maestro-vis-locked-hint screen-reader-text' );
					hint.id  = 'maestro-vis-lockhint-' + ( ++groupIdSeq ) + '-' + roleKey.replace( /[^\w-]/g, '' );
					row.appendChild( hint );
					cb.setAttribute( 'aria-describedby', hint.id );
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
				roleKeys.forEach( function ( roleKey ) {
					var r      = rows[ roleKey ];
					var locked = !! ( opts.isLocked && opts.isLocked( roleKey ) );

					if ( locked ) {
						// Derived display only — never touches getSet()/setSet().
						r.cb.checked = true;
						// Phase 25 (M2): aria-disabled, NOT native `disabled`.
						// A natively-disabled control is removed from the tab order,
						// which means a screen-reader user in FOCUS mode never lands
						// on it and never hears why it is locked — the description
						// below would exist and never be announced. aria-disabled
						// conveys the same state while keeping the row reachable;
						// the change handler refuses the toggle, so the value still
						// cannot move.
						r.cb.disabled = false;
						r.cb.setAttribute( 'aria-disabled', 'true' );
						r.row.classList.add( 'maestro-vis-locked' );
						var reason = opts.lockedHint( roleKey );
						setText( r.hint, reason );
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
				refreshAll();
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
				// The marker covers EVERY own axis. Testing hiddenRoles alone would
				// clear it when the last role is unchecked while a person or
				// profile rule is still in force — the row would look untouched
				// until a reload rebuilt it.
				refreshHiddenMarker( slug );
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
						// Call the TESTED predicate rather than re-inlining it.
						// maestro-logic.js exports isChildRoleLockedByParent() and
						// child-role-lock.test.mjs exercises it, but the popover
						// used to duplicate the expression here — so the covered
						// implementation and the running one were separate copies
						// that could drift silently. Same pattern the rest of this
						// file already uses for diffItem/reorderMove/resetItem.
						return window.maestroLogic.isChildRoleLockedByParent(
							model[ slug ].hiddenRoles,
							roleKey
						);
					},
					lockedHint: function ( roleKey ) {
						return I.hideChildrenLocked.replace( '%s', D.roles[ roleKey ] );
					}
				}
			);
		}

		// The popover's per-user sections: the shared person picker, bound to
		// this row's model field and saving like every other popover control.
		function buildUserGroup( heading, groupClass, getSet, setSet ) {
			var picker = buildPersonPicker( heading, groupClass, getSet, setSet, {
				onChange: function () {
					refreshModifiedIndicator( slug );
					scheduleAutosave();
				}
			} );
			pop.appendChild( picker.el );
			return picker;
		}

		// Groups 3 and 4 (ROLE-02) require `list_users`. A site that points
		// `maestro_capability` at a custom role without it can still use Maestro
		// — and still gets the role groups above — but core's users collection
		// would hand that role only published authors, so a picker would quietly
		// offer an incomplete set of people. Showing nothing beats showing a
		// wrong-looking something, and we do NOT route around core's gate.
		if ( D.canPickUsers ) {

		// Group 3: "Hide this item from specific people:" — the per-user analog
		// of group 1. Valid on any row, parent or submenu.
		buildUserGroup(
			I.hideFromUsers,
			'maestro-vis-own-users',
			function () { return model[ slug ].hiddenUsers; },
			function ( arr ) {
				model[ slug ].hiddenUsers = arr;
				refreshHiddenMarker( slug );
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

		// Groups 5 and 6 (Phase 27): one checkbox per hiding profile. Behind the
		// same `list_users` gate as the people groups, because a profile IS a
		// list of people; the server withholds the registry otherwise.
		buildProfileGroup(
			I.hideForProfiles,
			'maestro-vis-own-profiles',
			function () { return model[ slug ].hiddenProfiles; },
			function ( arr ) {
				model[ slug ].hiddenProfiles = arr;
				refreshHiddenMarker( slug );
			}
		);
		if ( ! model[ slug ].isSub && model[ slug ].hasChildren ) {
			buildProfileGroup(
				I.hideChildrenProfiles,
				'maestro-vis-children-profiles',
				function () { return model[ slug ].childHiddenProfiles; },
				function ( arr ) { model[ slug ].childHiddenProfiles = arr; }
			);
		}

		// Profiles are made and filled in their own dialog; the popover only
		// assigns them. The link is offered under the groups, and in place of
		// them while there are none yet.
		var manage = el( 'div', 'maestro-vis-profiles-manage' );
		if ( ! profiles.length ) {
			manage.appendChild( el( 'p', 'maestro-vis-profiles-none description', I.profilesNone ) );
		}
		var manageBtn = el( 'button', 'button-link maestro-manage-profiles', I.manageProfiles );
		manageBtn.type = 'button';
		manageBtn.setAttribute( 'aria-haspopup', 'dialog' );
		manageBtn.addEventListener( 'click', function ( e ) {
			// The popover is replaced by the dialog, which detaches this button
			// before placePopover()'s outside-click handler sees the click.
			e.stopPropagation();
			if ( profilesBtn ) { openProfiles( profilesBtn ); }
		} );
		manage.appendChild( manageBtn );
		pop.appendChild( manage );

		} // end if ( D.canPickUsers )

		// One checkbox per profile, bound to a model axis by getSet/setSet like
		// the role groups. No derived lock: a profile hide is cosmetic and
		// per-person, so a parent hidden for a profile does not take its
		// children away for anyone else (the same reason the people groups
		// have none).
		function buildProfileGroup( heading, groupClass, getSet, setSet ) {
			if ( ! profiles.length ) { return null; }
			var group  = el( 'div', 'maestro-vis-group maestro-profile-group ' + groupClass );
			var headEl = el( 'p', 'maestro-vis-head', heading );
			headEl.id = 'maestro-vis-head-' + ( ++groupIdSeq );
			group.setAttribute( 'role', 'group' );
			group.setAttribute( 'aria-labelledby', headEl.id );
			group.appendChild( headEl );

			profiles.forEach( function ( p ) {
				var row = el( 'label', 'maestro-vis-row' );
				var cb  = el( 'input' );
				cb.type = 'checkbox';
				cb.value = p.id;
				cb.checked = window.maestroLogic.isProfileAssigned( getSet(), p.id );
				cb.addEventListener( 'change', function () {
					setSet( window.maestroLogic.toggleProfile( getSet(), p.id, cb.checked ) );
					refreshModifiedIndicator( slug );
					scheduleAutosave();
				} );
				row.appendChild( cb );
				var name = el( 'span', 'maestro-vis-profile-name', p.name );
				row.appendChild( document.createTextNode( ' ' ) );
				row.appendChild( name );
				group.appendChild( row );
			} );

			pop.appendChild( group );
			return group;
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
			// Excludes genuinely disabled controls (e.g. Reset Item on an
			// unmodified row), which never receive focus and would otherwise be
			// wrongly treated as the trap's `first`/`last` boundary, silently
			// breaking the wraparound.
			//
			// Phase 25 (M2) NOTE: a derived-LOCKED checkbox is no longer among
			// them. It is `aria-disabled` rather than natively disabled precisely
			// so it stays reachable, and it is therefore a legitimate tab stop
			// here — that is the fix working, not a leak.
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

	/*
	 * The person picker: chips for the chosen people, and a type-ahead over
	 * core's users endpoint. One shared builder for the Visibility popover's
	 * per-user sections (ROLE-02) and a profile's members (Phase 27), for the
	 * same reason buildRoleGroup() is shared: hand-rolled copies are where
	 * "toggling one group edits another's field" bugs come from.
	 *
	 * getSet/setSet bind the picker to its list of { id, name } pairs.
	 * opts.onChange runs after every add or remove (save, indicators);
	 * opts.max and opts.limitText set the cap the server enforces, and
	 * opts.selfWarning the caution shown while the editor's own account is in
	 * the list. Returns { el, refresh }; the caller places el.
	 */
	function buildPersonPicker( heading, groupClass, getSet, setSet, opts ) {
		opts = opts || {};
		var max = Number( opts.max || D.maxHiddenUsers );
		function limitMsg() {
			return ( opts.limitText || I.userLimitReached ).replace( '%d', String( max ) );
		}
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
		search.dir = 'auto';
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
			setText( status, text );
			status.hidden = ! text;
		}

		function refreshSelfWarning() {
			var isSelf = false;
			getSet().forEach( function ( t ) {
				if ( window.maestroLogic.isSelfTarget( t.id, D.userId ) ) { isSelf = true; }
			} );
			setText( warn, isSelf ? ( opts.selfWarning || I.userSelfWarning ) : '' );
			warn.hidden = ! isSelf;
		}

		function afterChange() {
			renderChips();
			refreshSelfWarning();
			if ( opts.onChange ) { opts.onChange(); }
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

		function atLimit() {
			return getSet().length >= max;
		}

		function pick( user ) {
			// Stop AT the server's cap rather than letting Config::sanitize()
			// truncate silently: without this the editor reports a successful
			// autosave and the extra targets vanish on the next reload, which
			// contradicts the round-trip guarantee the popover implies.
			if ( atLimit() ) {
				results.hidden = true;
				results.textContent = '';
				say( limitMsg() );
				return;
			}
			setSet( window.maestroLogic.addUserTarget( getSet(), user ) );
			results.hidden = true;
			results.textContent = '';
			search.value = '';
			say( atLimit() ? limitMsg() : '' );
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
				setText( btn, u.name );
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

			// Say so before the round trip rather than after a pointless one.
			if ( atLimit() ) {
				results.hidden = true;
				results.textContent = '';
				say( limitMsg() );
				return;
			}

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
				// Exclude already-chosen people SERVER-side. Filtering them
				// out of a 10-row page after the fact means that when the
				// first ten matches for a common name are all already chips,
				// the picker reports "no matching people" while valid targets
				// sit on page two, unreachable without guessing a narrower query.
				var chosen = window.maestroLogic.userTargetIds( getSet() );
				var exclude = chosen.length ? '&exclude=' + chosen.join( ',' ) : '';
				window.fetch(
					D.usersUrl + sep + 'per_page=10' + exclude + '&search=' + encodeURIComponent( q ),
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
		return { el: group, refresh: renderChips };
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
		// Phase 27: unassigns the item from every profile; the profiles
		// themselves, and their members, are untouched.
		m.hiddenProfiles      = [];
		m.childHiddenProfiles = [];

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

	function isPhoneViewport() {
		return window.innerWidth <= 782 || ( window.innerWidth < 961 && window.innerHeight <= 500 );
	}

	function placePopover( pop, anchorBtn ) {
		if ( isPhoneViewport() ) {
			return placeMobilePopover( pop, anchorBtn );
		}
		// Core treats clicks and Tab outside #adminmenuwrap as dismissal of
		// the responsive menu. Settings belongs to that menu, like its toolbar.
		var responsiveParent = anchorBtn.closest( '#adminmenuwrap' );
		( responsiveParent || document.body ).appendChild( pop );
		if ( responsiveParent ) { pop.style.position = 'fixed'; }

		function position() {
			var scrollY = responsiveParent ? 0 : window.scrollY;
			var scrollX = responsiveParent ? 0 : window.scrollX;
			var r = anchorBtn.getBoundingClientRect();
			var roomAbove = Math.floor( r.top - 14 );
			if ( pop.offsetHeight > roomAbove && roomAbove > window.innerHeight - r.bottom ) {
				pop.style.boxSizing = 'border-box';
				pop.style.maxHeight = roomAbove + 'px';
				pop.style.overflowY = 'auto';
			}
			// Toolbar lives at the bottom — prefer placing the popover above the
			// anchor so it doesn't overflow off-screen.
			var top = scrollY + r.top - pop.offsetHeight - 6;
			if ( top < scrollY + 8 ) {
				top = scrollY + r.bottom + 4;
			}
			pop.style.top  = top + 'px';
			// Anchored at its left edge, but never past the viewport's right edge:
			// a control in the toolbar's right zone would otherwise push the dialog
			// off-screen and scroll the whole page sideways.
			var left = Math.min( r.left, document.documentElement.clientWidth - pop.offsetWidth - 8 );
			pop.style.left = ( scrollX + Math.max( 8, left ) ) + 'px';
		}
		position();

		// The Visibility popover and the profiles dialog change height while
		// open (search results, chips, a profile added or deleted). Anchored by
		// its top, a dialog above the toolbar grew DOWN past the viewport, and
		// focusing a control in the overflow then scrolled the page (Phase 27,
		// measured at 1280x720). Re-anchor on resize so it grows upward instead.
		// Other popovers keep a fixed place, so filtering icons does not move
		// the grid under the pointer.
		var ro;
		var grows = pop.classList.contains( 'maestro-vis-popover' ) || pop.classList.contains( 'maestro-profiles-popover' );
		if ( grows && window.ResizeObserver ) {
			ro = new window.ResizeObserver( function () {
				if ( ! document.contains( pop ) ) { ro.disconnect(); return; }
				position();
			} );
			ro.observe( pop );
		}

		function outside( e ) {
			if ( ! pop.contains( e.target ) && ! anchorBtn.contains( e.target ) ) {
				removePopover( pop );
				if ( document.contains( anchorBtn ) ) { anchorBtn.focus(); }
			}
		}
		var outsideTimer = setTimeout( function () {
			if ( document.contains( pop ) ) { document.addEventListener( 'click', outside ); }
		}, 0 );
		function cleanup() {
			clearTimeout( outsideTimer );
			document.removeEventListener( 'click', outside );
			window.removeEventListener( 'resize', resize );
			if ( ro ) { ro.disconnect(); }
			pop.maestroCleanup = null;
		}
		function resize() {
			if ( window.innerWidth < 961 && pop.classList.contains( 'maestro-settings-popover' ) && ! pop.classList.contains( 'maestro-profiles-popover' ) && ! pop.classList.contains( 'maestro-preview-popover' ) ) {
				removePopover( pop );
				var help = document.querySelector( '.maestro-tour-help' );
				if ( help ) { help.focus(); }
			} else if ( isPhoneViewport() ) {
				cleanup();
				placeMobilePopover( pop, anchorBtn );
			} else {
				position();
			}
		}
		pop.maestroCleanup = cleanup;
		window.addEventListener( 'resize', resize );
		return position;
	}

	// Phone dialogs use a scrollable sheet and explicit dismissal. All controls
	// stay within core's responsive-menu subtree, including detached click targets.
	function placeMobilePopover( pop, anchorBtn ) {
		var previousFocus = document.activeElement;
		forceResponsiveOpen();
		var parent = anchorBtn.closest( '#adminmenuwrap' ) || document.body;
		var content = el( 'div', 'maestro-mobile-body' );
		var actions = pop.querySelector( '.maestro-settings-actions' );
		if ( actions ) { actions.remove(); }
		while ( pop.firstChild ) { content.appendChild( pop.firstChild ); }
		pop.appendChild( content );
		if ( ! actions ) {
			actions = el( 'div', 'maestro-settings-actions' );
			var done = el( 'button', 'button button-primary', I.tourDone );
			done.type = 'button';
			done.addEventListener( 'click', close );
			actions.appendChild( done );
		}
		pop.appendChild( actions );
		pop.classList.add( 'maestro-mobile-sheet' );
		parent.appendChild( pop );
		var oldBodyOverflow = document.body.style.overflow;
		var oldRootOverflow = document.documentElement.style.overflow;
		document.body.style.overflow = 'hidden';
		document.documentElement.style.overflow = 'hidden';
		var viewport = window.visualViewport;
		var frame;

		function close() {
			closePopovers();
			anchorBtn.focus( { preventScroll: true } );
		}
		function position() {
			if ( ! document.contains( pop ) ) { return; }
			var parentNow = anchorBtn.closest( '#adminmenuwrap' ) || document.body;
			if ( pop.parentNode !== parentNow ) { parentNow.appendChild( pop ); }
			forceResponsiveOpen();
			var v = window.visualViewport;
			pop.style.left = ( ( v ? v.offsetLeft : 0 ) + 8 ) + 'px';
			var bar = document.getElementById( 'wpadminbar' );
			var top = Math.max( ( v ? v.offsetTop : 0 ) + 8, bar ? bar.getBoundingClientRect().bottom + 8 : 8 );
			var bottom = ( v ? v.offsetTop + v.height : window.innerHeight ) - 8;
			pop.style.top = top + 'px';
			pop.style.width = Math.max( 0, ( v ? v.width : window.innerWidth ) - 16 ) + 'px';
			pop.style.height = Math.max( 0, bottom - top ) + 'px';
			pop.style.maxHeight = pop.style.height;
			cancelAnimationFrame( frame );
			frame = requestAnimationFrame( function () {
				var focused = document.activeElement;
				if ( content.contains( focused ) ) { focused.scrollIntoView( { block: 'nearest' } ); }
			} );
		}
		function outside( e ) {
			if ( ! pop.contains( e.target ) ) {
				e.preventDefault();
				e.stopPropagation();
			}
		}
		// A result/chip/button can remove itself before core's document handler
		// runs. Stop bubbling while the event still passes through the sheet.
		pop.addEventListener( 'click', function ( e ) { e.stopPropagation(); } );
		pop.addEventListener( 'keydown', function ( e ) {
			if ( e.key === 'Escape' ) {
				e.preventDefault(); e.stopImmediatePropagation(); return;
			}
			if ( e.key !== 'Tab' ) { return; }
			e.stopImmediatePropagation();
			var controls = Array.prototype.filter.call( pop.querySelectorAll( 'input, button, select, [tabindex]' ), function ( n ) {
				return ! n.disabled && n.tabIndex >= 0 && n.getClientRects().length;
			} );
			if ( ! controls.length ) { return; }
			var first = controls[ 0 ], last = controls[ controls.length - 1 ];
			if ( e.shiftKey && document.activeElement === first ) { e.preventDefault(); last.focus(); }
			else if ( ! e.shiftKey && document.activeElement === last ) { e.preventDefault(); first.focus(); }
		}, true );
		pop.addEventListener( 'keyup', function ( e ) {
			if ( e.key === 'Tab' ) { e.stopImmediatePropagation(); }
			if ( e.key === 'Escape' ) { e.preventDefault(); e.stopImmediatePropagation(); close(); }
		}, true );
		pop.addEventListener( 'focusin', position );
		document.addEventListener( 'click', outside, true );
		window.addEventListener( 'resize', position );
		if ( viewport ) {
			viewport.addEventListener( 'resize', position );
			viewport.addEventListener( 'scroll', position );
		}
		pop.maestroCleanup = function () {
			cancelAnimationFrame( frame );
			document.removeEventListener( 'click', outside, true );
			window.removeEventListener( 'resize', position );
			if ( viewport ) {
				viewport.removeEventListener( 'resize', position );
				viewport.removeEventListener( 'scroll', position );
			}
			document.body.style.overflow = oldBodyOverflow;
			document.documentElement.style.overflow = oldRootOverflow;
			pop.maestroCleanup = null;
		};
		position();
		if ( content.contains( previousFocus ) ) { previousFocus.focus( { preventScroll: true } ); }
		return position;
	}

	/* ---------- sortable --------------------------------------------------- */

	function initSortables() {
		// No drag handles: the whole row is draggable. A small distance threshold
		// keeps a plain click as a selection and only starts a drag on real
		// movement. `cancel` keeps a mousedown inside a submenu (or on a form
		// control) from starting a top-level drag, so child reordering is handled
		// solely by the per-submenu sortable below.
		$( '#adminmenu' ).sortable( {
			items:     '> li.maestro-item',
			cancel:    '.wp-submenu, input, button',
			distance:  6,
			axis:      'y',
			tolerance: 'pointer',
			stop:      function () {
				if ( selectedKey && model[ selectedKey ] ) { populatePanel( selectedKey ); }
				scheduleAutosave();
			}
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

		var topLis = topRows();

		var added = [];
		// Phase 27: each rendered item's profile axes, in menu order, folded
		// into the profiles map below.
		var assignments = [];

		topLis.forEach( function ( li ) {
			var slug = li.dataset.maestroSlug;
			cfg.top_order.push( slug );

			// A separator's only state is where it sits (top_order, above) and,
			// for one Maestro added, that it exists at all.
			if ( li.classList.contains( 'maestro-separator' ) ) {
				if ( isAddedSeparator( slug ) ) { added.push( slug ); }
				return;
			}

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
			// The profile axes never ride on the item: the map is their only
			// source, and Config::sanitize() compiles it back onto the items.
			assignments.push( { key: slug, own: m.hiddenProfiles, child: m.childHiddenProfiles } );

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
					assignments.push( { key: skey, own: sm.hiddenProfiles } );
				} );
			}
		} );

		// The save replaces the whole config, so a separator that is stored but
		// not rendered (core trimmed it, or the editor could not pair it) must be
		// carried forward, or it would be erased by an unrelated edit.
		var carried = window.maestroLogic.carrySeparators( {
			domOrder:    cfg.top_order,
			domAdded:    added,
			storedOrder: ( D.config && D.config.top_order ) || [],
			storedAdded: ( D.config && D.config.separators ) || [],
			known:       D.knownSeparators || [],
			removed:     removedSeparators.concat( droppedSeparators ),
			prefix:      D.separatorPrefix
		} );
		cfg.top_order = carried.order;

		// Sparse, like items: the keys appear only when there is something to say.
		if ( carried.added.length ) { cfg.separators = carried.added; }
		if ( removedSeparators.length ) { cfg.removed_separators = removedSeparators.slice(); }
		// The save is full-replace and nothing in the menu DOM holds the width,
		// so it rides along on every save or any edit would erase it (28-02).
		if ( menuWidth ) { cfg.menu_width = menuWidth; }

		// Only an editor who can see the profiles sends them. Without the key
		// the server keeps the stored map, which is also what it does for a
		// saver without `list_users` whatever they send. An empty map, by
		// contrast, deletes every profile, so it is sent only when that is
		// what the editor did.
		if ( D.canPickUsers ) {
			// A model row with no <li> (another plugin rewrote the sidebar after
			// it was printed) was not walked above, but its axes are still
			// current. Then the stored hides of items that are not rendered at
			// all (profileCarry, matched by normalized key server-side).
			var walked = Object.create( null );
			assignments.forEach( function ( a ) { walked[ a.key ] = true; } );
			Object.keys( model ).forEach( function ( key ) {
				var m = model[ key ];
				if ( walked[ key ] || m.isSeparator ) { return; }
				assignments.push( { key: key, own: m.hiddenProfiles, child: m.isSub ? [] : m.childHiddenProfiles } );
			} );
			cfg.profiles = window.maestroLogic.buildProfilesPayload(
				profiles,
				window.maestroLogic.carryProfileHides( assignments, profileCarry )
			);
		}

		return cfg;
	}

	function setStatus( state ) {
		if ( ! statusEl ) { return; }
		// Preserve the visible text child and its live-region announcements while
		// the state class supplies the spinner, success or error glyph.
		// Rebuilding className also clears maestro-status-dismissed.
		statusEl.className = 'maestro-status maestro-status-' + state;
		if ( statusDismiss ) { statusDismiss.hidden = state !== 'error'; }
		var label = window.maestroLogic.modeStatusLabel( state, I );
		var textEl = statusEl.querySelector( '.maestro-status-text' );
		if ( textEl ) { setText( textEl, label ); }
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
		lastSaveOk = ok;
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

	/*
	 * Read-only role preview (Phase 30, ROLE-03; 30-CONTEXT.md). A labelled
	 * native select and an explicit Preview button: choosing a role does
	 * nothing until the button is pressed. The preview opens on the Dashboard
	 * (see class-preview.php for why), and only once every pending save has
	 * landed, so what is previewed is what is stored. A failed save keeps the
	 * user here with the error rather than previewing stale rules.
	 */
	function buildPreviewPicker() {
		var P = D.preview;
		if ( ! P ) { return null; }
		var wrap = el( 'div', 'maestro-preview-picker' );

		// A single toolbar button opens the picker on desktop and phones.
		var toggle = el( 'button', 'button maestro-preview-toggle' );
		toggle.type = 'button';
		toggle.setAttribute( 'aria-haspopup', 'dialog' );
		iconButton( toggle, 'dashicons-welcome-view-site', I.previewAs );
		toggle.addEventListener( 'click', function () { openPreviewDialog( toggle ); } );
		wrap.appendChild( toggle );
		return wrap;
	}

	// Autosaved dialogs close without committing or cancelling changes.
	function addDialogClose( pop, button ) {
		if ( isPhoneViewport() ) {
			var actions = el( 'div', 'maestro-settings-actions' );
			actions.appendChild( button );
			pop.appendChild( actions );
			return;
		}
		button.className = 'button-link maestro-dialog-close';
		setCloseGlyph( button );
		button.setAttribute( 'aria-label', I.closeDialog );
		button.title = I.closeDialog;
		pop.appendChild( button );
	}

	function setCloseGlyph( button ) {
		button.textContent = '';
		var glyph = el( 'span', 'dashicons dashicons-no-alt' );
		glyph.setAttribute( 'aria-hidden', 'true' );
		button.appendChild( glyph );
	}

	/*
	 * The picker itself, built into `host`: a labelled native select and an
	 * explicit Preview button, or the super-admin explanation in their place.
	 */
	function previewControls( host, id ) {
		var P = D.preview;
		if ( ! P.available ) {
			host.appendChild( el( 'span', 'maestro-preview-unavailable', I.previewUnavailable ) );
			return null;
		}

		var label = el( 'label', 'maestro-preview-label screen-reader-text', I.previewAs );
		label.setAttribute( 'for', id );
		var select = el( 'select', 'maestro-preview-select' );
		select.id = id;
		Object.keys( P.roles || {} ).forEach( function ( key ) {
			var opt = el( 'option', '', P.roles[ key ] );
			opt.value = key;
			select.appendChild( opt );
		} );
		var go = el( 'button', 'button maestro-preview-btn', I.previewBtn );
		go.type = 'button';
		go.addEventListener( 'click', function () {
			if ( ! select.value ) { return; }
			go.disabled = true;
			waitForSaveIdle().then( function () {
				if ( ! lastSaveOk ) {
					go.disabled = false;
					setStatus( 'error' );
					go.title = I.previewSaveFailed;
					speak( I.previewSaveFailed, 'assertive' );
					return;
				}
				var url = P.url +
					( P.url.indexOf( '?' ) === -1 ? '?' : '&' ) +
					'maestro_preview=' + encodeURIComponent( select.value ) +
					'&maestro_preview_nonce=' + encodeURIComponent( P.nonce );
				window.location.assign( url );
			} );
		} );

		host.appendChild( label );
		host.appendChild( select );
		host.appendChild( go );
		return select;
	}

	// A desktop popover, promoted to the scrollable sheet at phone widths.
	function openPreviewDialog( anchorBtn ) {
		closePopovers();
		var pop = el( 'div', 'maestro-popover maestro-settings-popover maestro-preview-popover' );
		pop.setAttribute( 'role', 'dialog' );
		pop.setAttribute( 'aria-modal', 'true' );
		pop.setAttribute( 'aria-labelledby', 'maestro-preview-title' );
		var title = el( 'h2', 'maestro-settings-title', I.previewAs );
		title.id = 'maestro-preview-title';
		pop.appendChild( title );

		var body = el( 'div', 'maestro-preview-dialog-row' );
		var select = previewControls( body, 'maestro-preview-select-dialog' );
		pop.appendChild( body );

		var done = el( 'button', 'button button-primary maestro-settings-done', I.tourDone );
		done.type = 'button';
		addDialogClose( pop, done );

		function close() {
			closePopovers();
			anchorBtn.focus();
		}
		done.addEventListener( 'click', close );
		pop.addEventListener( 'keydown', function ( e ) {
			if ( e.key === 'Escape' ) {
				e.preventDefault();
				e.stopPropagation();
			}
			if ( e.key === 'Tab' ) {
				var buttons = pop.querySelectorAll( 'select, button:not([disabled])' );
				var first = buttons[ 0 ];
				var last = buttons[ buttons.length - 1 ];
				if ( e.shiftKey && document.activeElement === first ) {
					e.preventDefault();
					last.focus();
				} else if ( ! e.shiftKey && document.activeElement === last ) {
					e.preventDefault();
					first.focus();
				}
			}
		} );
		pop.addEventListener( 'keyup', function ( e ) {
			if ( e.key === 'Tab' ) { e.stopPropagation(); }
			if ( e.key === 'Escape' ) {
				e.stopPropagation();
				close();
			}
		} );

		placePopover( pop, anchorBtn );
		( select || done ).focus();
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

	// The anchor only if it is rendered: a control can exist yet be hidden
	// (the width handle below 961px, the separator buttons on a submenu
	// item), and pointing a coachmark at nothing is worse than skipping it.
	function tourShown( node ) {
		return node && node.getClientRects().length ? node : null;
	}

	/*
	 * Where the coachmark is mounted. At narrow widths it joins the toolbar
	 * inside #adminmenuwrap, for the toolbar's own reason (buildToolbar()):
	 * core closes the responsive menu on any click outside the hamburger and
	 * #adminmenuwrap. On <body>, the first tap on Next closed the menu, which
	 * took the toolbar with it, so every control step after that found its
	 * anchor unrendered and was skipped (1, 2, then straight to Exit). The box
	 * is position:fixed, so the parent does not move it.
	 */
	function tourHost() {
		var menuWrap = document.getElementById( 'adminmenuwrap' );
		var hamburger = document.getElementById( 'wp-admin-bar-menu-toggle' );
		return menuWrap && hamburger && hamburger.offsetParent !== null ? menuWrap : document.body;
	}

	function tourSteps() {
		// One step per editing control, in toolbar order, so every glyph the
		// editor shows has been named once. The panel steps reference controls
		// that only exist once an item is selected — so they select the first
		// item first. A step whose control is not on screen is skipped.
		return [
			{ text: I.tourStep1, placement: 'right', anchor: firstMenuItem },
		].concat( rowCtl ? [
			// With row controls on, rename, move and icon live on the selected row.
			{ text: I.tourRowRename, placement: 'right', before: tourSelectFirst, anchor: function () { return tourShown( rowCtl.renameBtn ); } },
			{ text: I.tourRowMove, placement: 'right', before: tourSelectFirst, anchor: function () { return tourShown( rowCtl.moveUp ); } },
			{ text: I.tourRowIcon, placement: 'right', before: tourSelectFirst, anchor: function () { return tourShown( rowCtl.iconBtn ); } },
		] : [
			{ text: I.tourStep2, placement: 'top', before: tourSelectFirst, anchor: function () { return tourShown( panel.rename ); } },
			{ text: I.tourStep3, placement: 'top', before: tourSelectFirst, anchor: function () { return tourShown( panel.moveUp ); } },
			{ text: I.tourStepIcon, placement: 'top', before: tourSelectFirst, anchor: function () { return tourShown( panel.iconBtn ); } },
		] ).concat( [
			{ text: I.tourStepVisibility, placement: 'top', before: tourSelectFirst, anchor: function () { return tourShown( panel.visBtn ); } },
			{ text: I.tourStepResetItem, placement: 'top', before: tourSelectFirst, anchor: function () { return tourShown( panel.resetBtn ); } },
			{ text: I.tourStepSeparator, placement: 'top', before: tourSelectFirst, anchor: function () { return tourShown( panel.addSepBtn ); } },
			// The edge handle and the Settings gear only render at 961px and
			// wider (maestro.css): the width they set does not apply below it.
			{ text: I.tourStepWidth, placement: 'right', byViewport: true, anchor: function () { return tourShown( widthHandle ); } },
			{ text: I.tourStepProfiles, placement: 'top', anchor: function () { return tourShown( profilesBtn ); } },
			// Role preview (Phase 30) sits between the groups and Settings.
			{ text: I.tourStepPreview, placement: 'top', anchor: function () { return tourShown( document.querySelector( '.maestro-preview-picker' ) ); } },
			{ text: I.tourStepSettings, placement: 'top', byViewport: true, anchor: function () { return tourShown( document.querySelector( '.maestro-settings-btn' ) ); } },
			{ text: I.tourStepHelp, placement: 'top', anchor: function () { return tourShown( document.querySelector( '.maestro-tour-help' ) ); } },
			{ text: I.tourStep4, placement: 'top', anchor: function () { return tourShown( document.querySelector( '.maestro-reset-all' ) ); } },
			// The last step anchors to the WP Toolbar (admin-bar) "Exit Menu
			// Editor" toggle — the single entry/exit (UX-09) — not a
			// bottom-toolbar control. positionTour's 'top' placement falls back
			// to below the anchor when there's no room above, which is always
			// the case this near the top of the viewport.
			{ text: I.tourStep5, placement: 'top', anchor: function () { return document.getElementById( 'wp-admin-bar-maestro-toggle' ); } },
		] );
	}

	function startTour() {
		if ( tour.active ) { return; }
		// A step the viewport hides (byViewport) is dropped before the tour
		// starts, so "3 of 11" counts only what will be shown rather than
		// jumping from 7 to 9 on a phone. A panel control hidden only for the
		// selected item cannot be known yet, so renderTourStep still skips it.
		tour.steps = tourSteps().filter( function ( step ) {
			return ! step.byViewport || step.anchor();
		} );
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

	function renderTourStep( direction ) {
		direction = direction === -1 ? -1 : 1;
		// Suppress the focus-containment redirect while we tear down/rebuild the
		// tooltip and run step.before() (which may select an item / move focus).
		tour.rendering = true;
		var step = tour.steps[ tour.idx ];
		if ( step.before ) { step.before(); }

		var anchor = step.anchor();
		// A missing anchor (unusual menu / hidden control) — skip ahead gracefully
		// in the navigation direction rather than sending Back forward again.
		if ( ! anchor ) {
			var nextIdx = tour.idx + direction;
			if ( nextIdx >= 0 && nextIdx < tour.steps.length ) {
				tour.idx = nextIdx;
				renderTourStep( direction );
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
		 * progress/text/Back/Next nodes and a header Close tour control. */
		var content = el( 'div', 'maestro-tour-content' );

		var progress = el(
			'span',
			'maestro-tour-progress',
			I.tourProgress.replace( '%1$d', tour.idx + 1 ).replace( '%2$d', tour.steps.length )
		);
		var body = el( 'p', 'maestro-tour-text', step.text );

		var isLast = tour.idx === tour.steps.length - 1;
		var controls = el( 'div', 'maestro-tour-controls' );

		var skip = el( 'button', 'button-link maestro-tour-skip maestro-dialog-close' );
		setCloseGlyph( skip );
		skip.type = 'button';
		skip.setAttribute( 'aria-label', I.closeTour );
		skip.title = I.closeTour;
		skip.addEventListener( 'click', endTour );

		var back = el( 'button', 'button maestro-tour-back', I.tourBack );
		back.type = 'button';
		back.disabled = tour.idx === 0;
		back.addEventListener( 'click', function () {
			if ( tour.idx > 0 ) {
				tour.idx--;
				renderTourStep( -1 );
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

		box.appendChild( skip );
		controls.appendChild( back );
		controls.appendChild( next );
		content.appendChild( progress );
		content.appendChild( body );
		box.appendChild( arrow );
		box.appendChild( content );
		box.appendChild( controls );
		/*
		 * Mounting inside #adminmenuwrap is not enough on its own: Next, Back,
		 * Close and Done all remove this box before their click reaches core's
		 * document handler, and a detached target is outside every container,
		 * so core still closed the menu. The tour is modal, so nothing behind
		 * it needs to hear its clicks.
		 */
		box.addEventListener( 'click', function ( e ) { e.stopPropagation(); } );
		tourHost().appendChild( box );
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

	/*
	 * WP71-05 — block-editor screens never load this file.
	 *
	 * #156 decided here, by watching for hydration to strip `is-fullscreen-mode`
	 * from <body>. That was forced: core stamps the class server-side
	 * unconditionally ("Default to is-fullscreen-mode to avoid jumps in the UI"),
	 * so at DOMContentLoaded it is present either way and reading it right then
	 * would deny the editor to exactly the users entitled to it. Hence a
	 * MutationObserver, a settle ceiling, and a give-up path no test could reach.
	 *
	 * WP71-05 moved the decision to PHP. Assets::enqueue() declines to enqueue on
	 * block-editor screens, so this file cannot be running on one — including via
	 * a bookmarked ?maestro_edit=1, since the assets never load for it. There is
	 * nothing left to wait for, so the observer, the ceiling and the give-up path
	 * are gone with it.
	 */
	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}

} )( jQuery );
