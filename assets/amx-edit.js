/**
 * Inline Admin Menu Editor (AMX) — in-place editor.
 *
 * PHP localises amxData with the precise DOM model (the <li> id for each
 * top-level item, ordered submenu slugs, pristine titles/icons). The editor
 * uses a click-to-select model: per item, only a hover-revealed drag handle
 * and a selection target — no per-item button clusters. A single shared
 * controls panel in the bottom toolbar reflects the selected item. Every
 * change (reorder, rename commit, icon pick, visibility toggle, per-item
 * reset) schedules a debounced full-config POST.
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

	if ( typeof window.amxData === 'undefined' ) {
		return;
	}

	var D = window.amxData;
	var I = D.i18n;

	// Flat working model: slug -> { title, icon, hiddenRoles, isSub, parent? }.
	var model = {};
	var selectedSlug = null;
	var panel = {};        // references into the shared panel
	var statusEl = null;   // status indicator span
	var saveTimer = null;
	var lastEnqueuedSave = 0;

	/* ---------- helpers ---------------------------------------------------- */

	function pristineTop( slug ) {
		return ( D.pristine.top && D.pristine.top[ slug ] ) || { title: '', icon: '' };
	}
	function pristineSub( slug ) {
		return ( D.pristine.sub && D.pristine.sub[ slug ] ) || { title: '' };
	}
	function el( tag, cls, html ) {
		var n = document.createElement( tag );
		if ( cls ) { n.className = cls; }
		if ( html != null ) { n.innerHTML = html; }
		return n;
	}
	function closePopovers() {
		document.querySelectorAll( '.amx-popover' ).forEach( function ( p ) { p.remove(); } );
	}
	function cssEscape( s ) {
		if ( window.CSS && window.CSS.escape ) { return window.CSS.escape( s ); }
		return String( s ).replace( /(["\\\]])/g, '\\$1' );
	}
	function liForSlug( slug ) {
		return document.querySelector( '[data-amx-slug="' + cssEscape( slug ) + '"]' );
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
		document.body.classList.add( 'amx-editing' );
		forceUnfold();

		D.menu.forEach( function ( node ) {
			model[ node.slug ] = {
				title: node.title,
				icon: node.icon,
				hiddenRoles: node.hiddenRoles.slice(),
				isSub: false
			};

			var li = node.liId ? document.getElementById( node.liId ) : null;
			if ( ! li ) { return; }
			li.dataset.amxSlug = node.slug;
			li.classList.add( 'amx-item' );
			if ( node.hiddenRoles.length ) { li.classList.add( 'amx-has-hidden' ); }

			decorateTop( li );

			// Submenu children: skip the .wp-submenu-head, then zip by index.
			var subLis = li.querySelectorAll( '.wp-submenu > li:not(.wp-submenu-head)' );
			node.submenu.forEach( function ( child, idx ) {
				// A submenu item can share its slug with the top-level parent —
				// WordPress's self-link convention (Posts + All Posts both map
				// to edit.php). The stored config is slug-keyed, so they are one
				// identity; the top-level entry (which carries the icon) must
				// win. Only create a model entry for a genuinely distinct slug.
				if ( ! model[ child.slug ] ) {
					model[ child.slug ] = {
						title: child.title,
						icon: '',
						hiddenRoles: child.hiddenRoles.slice(),
						isSub: true,
						parent: node.slug
					};
				}
				var sli = subLis[ idx ];
				if ( ! sli ) { return; }
				sli.dataset.amxSlug = child.slug;
				sli.classList.add( 'amx-subitem' );
				if ( child.hiddenRoles.length ) { sli.classList.add( 'amx-has-hidden' ); }
				decorateSub( sli );
			} );
		} );

		buildToolbar();
		bindMenuSelection();
		initSortables();
	}

	function decorateTop( li ) {
		var handle = el( 'span', 'amx-handle dashicons dashicons-move' );
		handle.title = I.drag;
		li.insertBefore( handle, li.firstChild );
	}

	function decorateSub( sli ) {
		var handle = el( 'span', 'amx-subhandle dashicons dashicons-move' );
		handle.title = I.drag;
		sli.insertBefore( handle, sli.firstChild );
	}

	/* ---------- click-to-select ------------------------------------------- */

	function bindMenuSelection() {
		var menu = document.getElementById( 'adminmenu' );
		if ( ! menu ) { return; }

		menu.addEventListener( 'click', function ( e ) {
			// Suppress navigation on every menu click while editing.
			var a = e.target.closest( 'a' );
			if ( a ) { e.preventDefault(); }

			// Drag handle is for dragging only — don't select.
			if ( e.target.closest( '.amx-handle, .amx-subhandle' ) ) {
				return;
			}
			// Popovers may be placed over the menu region — let them handle their own clicks.
			if ( e.target.closest( '.amx-popover' ) ) {
				return;
			}

			var li = e.target.closest( 'li.amx-item, li.amx-subitem' );
			if ( ! li ) { return; }
			selectItem( li );
		}, true );
	}

	function selectItem( li ) {
		var slug = li.dataset.amxSlug;
		if ( ! slug || ! model[ slug ] ) { return; }

		document.querySelectorAll( '.amx-selected' ).forEach( function ( n ) {
			n.classList.remove( 'amx-selected' );
		} );
		selectedSlug = slug;
		li.classList.add( 'amx-selected' );
		populatePanel( slug );
		closePopovers();
	}

	/* ---------- toolbar + shared controls panel --------------------------- */

	function buildToolbar() {
		var bar = el( 'div', 'amx-toolbar' );

		statusEl = el( 'span', 'amx-status amx-status-idle' );
		statusEl.textContent = I.idle;
		bar.appendChild( statusEl );

		// Shared panel — empty/hidden until something is selected.
		var p = el( 'div', 'amx-panel' );
		p.hidden = true;

		var label = el( 'span', 'amx-panel-label' );

		var renameField = el( 'label', 'amx-panel-field' );
		renameField.appendChild( document.createTextNode( I.rename + ' ' ) );
		var rename = el( 'input', 'amx-rename-input' );
		rename.type = 'text';
		rename.addEventListener( 'keydown', function ( e ) {
			if ( e.key === 'Enter' ) {
				e.preventDefault();
				rename.blur();
			} else if ( e.key === 'Escape' ) {
				if ( selectedSlug ) { rename.value = model[ selectedSlug ].title; }
				rename.blur();
			}
		} );
		rename.addEventListener( 'blur', commitRename );
		renameField.appendChild( rename );

		var iconBtn = el( 'button', 'button amx-icon-btn' );
		iconBtn.type = 'button';
		iconBtn.textContent = I.icon;
		iconBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			openIconPicker( iconBtn );
		} );

		var visBtn = el( 'button', 'button amx-vis-btn' );
		visBtn.type = 'button';
		visBtn.textContent = I.visibility;
		visBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			openVisibilityPicker( visBtn );
		} );

		var resetItemBtn = el( 'button', 'button amx-reset-item' );
		resetItemBtn.type = 'button';
		resetItemBtn.textContent = I.resetItem;
		resetItemBtn.addEventListener( 'click', resetSelected );

		p.appendChild( label );
		p.appendChild( renameField );
		p.appendChild( iconBtn );
		p.appendChild( visBtn );
		p.appendChild( resetItemBtn );
		bar.appendChild( p );

		panel = {
			root:     p,
			label:    label,
			rename:   rename,
			iconBtn:  iconBtn,
			visBtn:   visBtn,
			resetBtn: resetItemBtn,
		};

		var right = el( 'div', 'amx-toolbar-right' );

		var resetAll = el( 'button', 'button amx-reset-all', I.resetAll );
		resetAll.type = 'button';
		resetAll.addEventListener( 'click', doResetAll );

		var exit = el( 'a', 'button amx-exit', I.exit );
		exit.href = D.exitUrl;
		exit.addEventListener( 'click', onExit );

		right.appendChild( resetAll );
		right.appendChild( exit );
		bar.appendChild( right );

		document.body.appendChild( bar );
	}

	function populatePanel( slug ) {
		var m = model[ slug ];
		if ( ! m ) { return; }
		panel.root.hidden = false;

		var crumb = m.isSub
			? ( ( model[ m.parent ] ? model[ m.parent ].title : m.parent ) + ' › ' + m.title )
			: m.title;
		panel.label.textContent = crumb;

		panel.rename.value = m.title;

		// Icon picker is top-level only; submenu items have no icon column.
		panel.iconBtn.style.display = m.isSub ? 'none' : '';
	}

	/* ---------- rename (single, idempotent) -------------------------------- */

	function commitRename() {
		if ( ! selectedSlug ) { return; }
		var m = model[ selectedSlug ];
		var raw = panel.rename.value.trim();
		var next = raw || m.title;
		if ( next === m.title ) {
			panel.rename.value = m.title;
			return;
		}
		m.title = next;
		updateMenuLabel( selectedSlug );
		populatePanel( selectedSlug ); // refresh breadcrumb for renamed parents
		scheduleAutosave();
	}

	function updateMenuLabel( slug ) {
		var li = liForSlug( slug );
		if ( ! li ) { return; }
		var m = model[ slug ];
		var target = m.isSub
			? li.querySelector( 'a' )
			: li.querySelector( '.wp-menu-name' );
		if ( target ) { target.textContent = m.title; }
	}

	/* ---------- icon picker (top-level only) ------------------------------- */

	function openIconPicker( anchorBtn ) {
		closePopovers();
		if ( ! selectedSlug || model[ selectedSlug ].isSub ) { return; }

		var slug = selectedSlug;
		var pop  = el( 'div', 'amx-popover amx-icon-popover' );
		var grid = el( 'div', 'amx-icon-grid' );

		D.dashicons.forEach( function ( dc ) {
			var b = el( 'button', 'amx-icon-cell dashicons ' + dc );
			b.type = 'button';
			b.title = dc;
			if ( model[ slug ].icon === dc ) { b.classList.add( 'is-current' ); }
			b.addEventListener( 'click', function ( e ) {
				e.preventDefault();
				model[ slug ].icon = dc;
				var li = liForSlug( slug );
				if ( li ) { applyIconPreview( li, dc ); }
				closePopovers();
				scheduleAutosave();
			} );
			grid.appendChild( b );
		} );

		pop.appendChild( grid );
		placePopover( pop, anchorBtn );
	}

	function applyIconPreview( li, dc ) {
		var img = li.querySelector( '.wp-menu-image' );
		if ( ! img ) { return; }
		// Drop every dashicons-* token (including dashicons-before), then re-add
		// the marker class plus the chosen icon. Splitting on whitespace avoids
		// the earlier regex that also matched "dashicons-before".
		var keep = img.className.split( /\s+/ ).filter( function ( c ) {
			return c && c.indexOf( 'dashicons-' ) !== 0;
		} );
		keep.push( 'dashicons-before', dc );
		img.className = keep.join( ' ' );
		img.style.backgroundImage = ''; // clear any custom SVG/url icon.
	}

	/* ---------- visibility picker ----------------------------------------- */

	function openVisibilityPicker( anchorBtn ) {
		closePopovers();
		if ( ! selectedSlug ) { return; }

		var slug = selectedSlug;
		var pop  = el( 'div', 'amx-popover amx-vis-popover' );
		pop.appendChild( el( 'p', 'amx-vis-head', I.hideFrom ) );

		Object.keys( D.roles ).forEach( function ( roleKey ) {
			var row = el( 'label', 'amx-vis-row' );
			var cb  = el( 'input' );
			cb.type = 'checkbox';
			cb.value = roleKey;
			cb.checked = model[ slug ].hiddenRoles.indexOf( roleKey ) !== -1;
			cb.addEventListener( 'change', function () {
				var set = model[ slug ].hiddenRoles;
				if ( cb.checked ) {
					if ( set.indexOf( roleKey ) === -1 ) { set.push( roleKey ); }
				} else {
					model[ slug ].hiddenRoles = set.filter( function ( r ) { return r !== roleKey; } );
				}
				var li = liForSlug( slug );
				if ( li ) {
					li.classList.toggle( 'amx-has-hidden', model[ slug ].hiddenRoles.length > 0 );
				}
				scheduleAutosave();
			} );
			row.appendChild( cb );
			row.appendChild( document.createTextNode( ' ' + D.roles[ roleKey ] ) );
			pop.appendChild( row );
		} );

		placePopover( pop, anchorBtn );
	}

	/* ---------- per-item reset -------------------------------------------- */

	function resetSelected() {
		if ( ! selectedSlug ) { return; }
		var m   = model[ selectedSlug ];
		var def = m.isSub ? pristineSub( selectedSlug ) : pristineTop( selectedSlug );

		m.title       = def.title || '';
		m.hiddenRoles = [];

		var li = liForSlug( selectedSlug );
		if ( li ) { li.classList.remove( 'amx-has-hidden' ); }

		if ( ! m.isSub ) {
			m.icon = def.icon || '';
			if ( li && def.icon ) { applyIconPreview( li, def.icon ); }
		}
		updateMenuLabel( selectedSlug );
		populatePanel( selectedSlug );
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
		$( '#adminmenu' ).sortable( {
			items:     '> li.menu-top.amx-item',
			handle:    '.amx-handle',
			axis:      'y',
			tolerance: 'pointer',
			cursor:    'grabbing',
			stop:      scheduleAutosave
		} );

		$( '#adminmenu .wp-submenu' ).each( function () {
			$( this ).sortable( {
				items:     '> li.amx-subitem',
				handle:    '.amx-subhandle',
				axis:      'y',
				tolerance: 'pointer',
				cursor:    'grabbing',
				stop:      scheduleAutosave
			} );
		} );
	}

	/* ---------- build payload + autosave ---------------------------------- */

	function buildConfig() {
		var cfg = { items: {}, top_order: [], sub_order: {} };

		var topLis = document.querySelectorAll( '#adminmenu > li.menu-top.amx-item[data-amx-slug]' );

		// Top-level slugs own their identity. A submenu item sharing one of these
		// slugs (WP self-link convention) must not emit a conflicting items entry.
		var topSlugs = {};
		topLis.forEach( function ( li ) { topSlugs[ li.dataset.amxSlug ] = true; } );

		topLis.forEach( function ( li ) {
			var slug = li.dataset.amxSlug;
			cfg.top_order.push( slug );

			var m   = model[ slug ];
			var def = pristineTop( slug );
			var entry = {};
			if ( m.title && m.title !== def.title ) { entry.title = m.title; }
			if ( m.icon && m.icon !== def.icon )    { entry.icon  = m.icon; }
			if ( m.hiddenRoles.length )             { entry.hidden_roles = m.hiddenRoles; }
			if ( Object.keys( entry ).length )      { cfg.items[ slug ] = entry; }

			var subLis = li.querySelectorAll( '.wp-submenu > li.amx-subitem[data-amx-slug]' );
			if ( subLis.length ) {
				cfg.sub_order[ slug ] = [];
				subLis.forEach( function ( sli ) {
					var sslug = sli.dataset.amxSlug;
					cfg.sub_order[ slug ].push( sslug );

					// Ordering still records the slug, but a submenu that shares
					// a top-level slug carries no separate override of its own.
					if ( topSlugs[ sslug ] ) { return; }

					var sm   = model[ sslug ];
					var sdef = pristineSub( sslug );
					var se   = {};
					if ( sm.title && sm.title !== sdef.title ) { se.title = sm.title; }
					if ( sm.hiddenRoles.length )               { se.hidden_roles = sm.hiddenRoles; }
					if ( Object.keys( se ).length )            { cfg.items[ sslug ] = se; }
				} );
			}
		} );

		return cfg;
	}

	function setStatus( state ) {
		if ( ! statusEl ) { return; }
		statusEl.className = 'amx-status amx-status-' + state;
		statusEl.textContent =
			state === 'saving' ? I.saving :
			state === 'saved'  ? I.saved  :
			state === 'error'  ? I.saveError :
			I.idle;
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
			return doAutosave();
		}
		return Promise.resolve();
	}

	function doAutosave() {
		saveTimer = null;
		setStatus( 'saving' );
		var myId = ++lastEnqueuedSave;

		return fetch( D.restUrl, {
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
			.then( function () {
				if ( myId === lastEnqueuedSave ) { setStatus( 'saved' ); }
			} )
			.catch( function () {
				if ( myId === lastEnqueuedSave ) { setStatus( 'error' ); }
			} );
	}

	function doResetAll( e ) {
		e.preventDefault();
		if ( ! window.confirm( I.confirmAll ) ) { return; }
		fetch( D.restUrl, {
			method:      'DELETE',
			headers:     { 'X-WP-Nonce': D.nonce },
			credentials: 'same-origin'
		} )
			.then( function () { window.location.reload(); } )
			.catch( function () { setStatus( 'error' ); } );
	}

	function onExit( e ) {
		// If there's pending work, flush it before navigating so nothing is lost.
		if ( saveTimer ) {
			e.preventDefault();
			flushAutosave().then( function () {
				window.location.href = D.exitUrl;
			} );
		}
	}

	/* ---------- go --------------------------------------------------------- */

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}

} )( jQuery );
