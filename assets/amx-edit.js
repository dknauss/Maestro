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
	// Null-prototype so a menu slug like "__proto__" (plugins register arbitrary
	// strings) can't pollute the prototype or shadow built-ins on lookup.
	var model = Object.create( null );
	var selectedSlug = null;
	var panel = {};        // references into the shared panel
	var statusEl = null;   // status indicator span
	var saveTimer = null;
	var saveInFlight = false;  // a full-replace POST is currently running
	var savePending = false;   // another change arrived mid-flight; save again on land
	var inFlight = null;       // promise that settles when the whole save chain is done

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
		var sets = D.iconSets || [];

		var pop = el( 'div', 'amx-popover amx-icon-popover' );
		pop.setAttribute( 'role', 'dialog' );
		pop.setAttribute( 'aria-modal', 'true' );
		pop.setAttribute( 'aria-label', I.iconDialog );

		// --- choose an icon, persist, close ---
		function choose( iconId ) {
			model[ slug ].icon = iconId;
			var li = liForSlug( slug );
			if ( li ) { applyIconPreview( li, iconId || 'none' ); }
			closePopovers();
			anchorBtn.focus();
			scheduleAutosave();
		}

		// --- search ---
		var search = el( 'input', 'amx-icon-search' );
		search.type = 'search';
		search.setAttribute( 'aria-label', I.iconSearch );
		search.placeholder = I.iconSearch;
		pop.appendChild( search );

		// --- "no icon" escape hatch ---
		var noneBtn = el( 'button', 'button amx-icon-none', I.iconNone );
		noneBtn.type = 'button';
		noneBtn.title = I.iconNoneHint;
		if ( ! model[ slug ].icon ) { noneBtn.setAttribute( 'aria-pressed', 'true' ); }
		noneBtn.addEventListener( 'click', function ( e ) { e.preventDefault(); choose( '' ); } );
		pop.appendChild( noneBtn );

		// --- tabs ---
		var tablist = el( 'div', 'amx-icon-tabs' );
		tablist.setAttribute( 'role', 'tablist' );
		tablist.setAttribute( 'aria-label', I.iconDialog );
		pop.appendChild( tablist );

		var panels = [];
		var tabs   = [];

		sets.forEach( function ( set, si ) {
			var tabId   = 'amx-tab-' + set.id;
			var panelId = 'amx-panel-' + set.id;

			var tab = el( 'button', 'amx-icon-tab', set.label );
			tab.type = 'button';
			tab.id = tabId;
			tab.setAttribute( 'role', 'tab' );
			tab.setAttribute( 'aria-controls', panelId );
			tab.setAttribute( 'aria-selected', si === 0 ? 'true' : 'false' );
			tab.tabIndex = si === 0 ? 0 : -1;
			tablist.appendChild( tab );
			tabs.push( tab );

			var panel = el( 'div', 'amx-icon-grid' );
			panel.id = panelId;
			panel.setAttribute( 'role', 'tabpanel' );
			panel.setAttribute( 'aria-labelledby', tabId );
			panel.hidden = si !== 0;

			set.icons.forEach( function ( ic ) {
				var b = el( 'button', 'amx-icon-cell' + ( set.type === 'class' ? ' dashicons ' + ic.class : ' amx-icon-img' ) );
				b.type = 'button';
				b.title = ic.label;
				b.setAttribute( 'aria-label', ic.label );
				b.dataset.amxName = ( ic.label || '' ).toLowerCase();
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
			if ( ! e.target.classList || ! e.target.classList.contains( 'amx-icon-cell' ) ) { return; }
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
				var hit = ! q || ( c.dataset.amxName || '' ).indexOf( q ) !== -1;
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

		if ( /^dashicons-/.test( icon ) ) {
			// Dashicon glyph: font class, no background image.
			keep.push( 'dashicons-before', icon );
			img.className = keep.join( ' ' );
			clearBg();
		} else if ( /^data:image\//.test( icon ) ) {
			// Base64 image data-URI: borrow core's ".svg" sizing and paint it.
			keep.push( 'svg' );
			img.className = keep.join( ' ' );
			setBg();
		} else if ( /^(https?:\/\/|\/\/|\/)/.test( icon ) ) {
			// URL icon: core would render an <img>; approximate via background.
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
			// Always refresh — when the pristine icon is empty this clears any
			// stale dashicon preview rather than leaving it until reload.
			if ( li ) { applyIconPreview( li, m.icon ); }
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
		// Null-prototype slug-keyed maps: a slug of "__proto__" must not mutate
		// Object.prototype or break JSON serialisation of the payload.
		var cfg = { items: Object.create( null ), top_order: [], sub_order: Object.create( null ) };

		var topLis = document.querySelectorAll( '#adminmenu > li.menu-top.amx-item[data-amx-slug]' );

		// Top-level slugs own their identity. A submenu item sharing one of these
		// slugs (WP self-link convention) must not emit a conflicting items entry.
		var topSlugs = Object.create( null );
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
		}
		return doAutosave();
	}

	// The endpoint is a full replace, so two POSTs in flight at once can arrive
	// out of order and let an older snapshot overwrite newer edits. Serialise:
	// never overlap requests. If a change lands while a save is running, set a
	// pending flag and fire exactly one more save when the current one settles —
	// that trailing POST carries the latest buildConfig(). The returned promise
	// resolves only after the whole chain (including the trailing save) is done,
	// so onExit can safely await it.
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
		return null;
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
