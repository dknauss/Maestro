/**
 * Maestro pure-logic helpers.
 *
 * Side-effect-free functions used by both the browser (via window.maestroLogic)
 * and the node:test unit suite (via require() / createRequire in .mjs tests).
 *
 * Dual-export guard at the bottom:
 *   - CJS (node:test): module.exports = api
 *   - Browser:         window.maestroLogic = api
 *
 * No build step required. Loaded by class-assets.php as the 'maestro-logic'
 * script handle, which is registered as a dependency of 'maestro' so it lands
 * on the page before maestro.js executes.
 *
 * @package Maestro
 */

/* global module, window */

/**
 * Pure reorder: shift a slug one position in a menu order array.
 *
 * Returns a NEW array (input is never mutated). If the slug is not found, or
 * the move would exceed a boundary, returns a copy of the original unchanged.
 *
 * @param {string[]} order     Current slug order array.
 * @param {string}   slug      The slug to move.
 * @param {string}   direction 'up' (toward index 0) or 'down' (toward end).
 * @return {string[]} New array with the slug shifted one step, or a copy if clamped.
 */
function reorderMove( order, slug, direction ) {
	var arr = order.slice();
	var idx = arr.indexOf( slug );

	if ( idx === -1 ) {
		return arr;
	}

	if ( direction === 'up' ) {
		if ( idx === 0 ) {
			return arr;
		}
		arr[ idx ]       = arr[ idx - 1 ];
		arr[ idx - 1 ]   = slug;
	} else if ( direction === 'down' ) {
		if ( idx === arr.length - 1 ) {
			return arr;
		}
		arr[ idx ]       = arr[ idx + 1 ];
		arr[ idx + 1 ]   = slug;
	}

	return arr;
}

/**
 * Pure diff: report whether a working model item differs from its pristine default.
 *
 * Mirrors the inline diff logic already used in buildConfig() in maestro.js:
 *   - title is modified iff current.title is truthy AND !== pristine.title
 *   - icon is modified iff current.icon is truthy AND !== pristine.icon
 *     (skipped when pristine has no icon key, i.e. submenu items)
 *   - hiddenRoles is modified iff current.hiddenRoles.length > 0
 *   - childHiddenRoles (COMPAT-10 REVISED, parent-only) is modified iff
 *     current.childHiddenRoles.length > 0 — same length-only rule as
 *     hiddenRoles, fully independent of it.
 *
 * @param {{ title: string, icon?: string, hiddenRoles: string[], childHiddenRoles?: string[] }} current  Working model item.
 * @param {{ title: string, icon?: string }}                        pristine Pristine default.
 * @return {{ modified: boolean, fields: string[] }}
 */
function diffItem( current, pristine ) {
	var fields = [];

	if ( current.title && current.title !== pristine.title ) {
		fields.push( 'title' );
	}

	// Only compare icon when the pristine entry has an icon key (top-level items).
	// Submenu items have no icon column — pristine.icon will be undefined.
	if ( 'icon' in pristine && current.icon && current.icon !== pristine.icon ) {
		fields.push( 'icon' );
	}

	if ( current.hiddenRoles && current.hiddenRoles.length > 0 ) {
		fields.push( 'hiddenRoles' );
	}

	if ( current.childHiddenRoles && current.childHiddenRoles.length > 0 ) {
		fields.push( 'childHiddenRoles' );
	}

	// ROLE-02: the per-user axes mark an item modified on exactly the same terms
	// as the role axes — a non-empty list is a rule, an empty one is not.
	if ( current.hiddenUsers && current.hiddenUsers.length > 0 ) {
		fields.push( 'hiddenUsers' );
	}

	if ( current.childHiddenUsers && current.childHiddenUsers.length > 0 ) {
		fields.push( 'childHiddenUsers' );
	}

	// Phase 27: the profile axes, on the same terms again. buildConfig() does
	// not write these onto the item (the profiles map carries them), but the
	// item still reads as modified, so Reset Item is offered for it.
	if ( current.hiddenProfiles && current.hiddenProfiles.length > 0 ) {
		fields.push( 'hiddenProfiles' );
	}

	if ( current.childHiddenProfiles && current.childHiddenProfiles.length > 0 ) {
		fields.push( 'childHiddenProfiles' );
	}

	return { modified: fields.length > 0, fields: fields };
}

/**
 * Pure save-state label: map a transient save-state to display text.
 *
 * Returns the matching string from the injected strings object, or ''
 * for 'idle' (and any unrecognised state) so the save-status element
 * renders nothing. The persistent "Edit Mode" mode label is built
 * separately in the DOM — this function does NOT produce it.
 *
 * @param {string} state   One of 'idle'|'saving'|'saved'|'error'.
 * @param {{ saving: string, saved: string, saveError: string }} strings i18n strings.
 * @return {string} Display text, or '' when idle/unknown.
 */
function modeStatusLabel( state, strings ) {
	if ( state === 'saving' ) { return strings.saving; }
	if ( state === 'saved' )  { return strings.saved; }
	if ( state === 'error' )  { return strings.saveError; }
	return '';
}

/**
 * Pure reset: recompute an item to its pristine state.
 *
 * Returns a NEW object with title, hiddenRoles, and (for top-level items) icon
 * restored to pristine values. Does NOT mutate the input. Does NOT touch the DOM.
 *
 * Mirrors the inline reset logic in resetSelected() in maestro.js:
 *   m.title            = def.title || '';
 *   m.hiddenRoles      = [];
 *   if ( ! m.isSub ) m.icon = def.icon || '';
 *   m.childHiddenRoles = [];
 *   m.hiddenUsers      = [];
 *   m.childHiddenUsers = [];
 *   m.hiddenProfiles      = [];
 *   m.childHiddenProfiles = [];
 *
 * None of the six visibility axes has a WP-native pristine state — reset
 * always clears them to [], top-level or submenu (the child_* fields are simply
 * unused for submenu items).
 *
 * KEEP THIS IN STEP WITH resetSelected(). The docblock above claims to mirror
 * it, and that claim is the only thing making this the readable spec for the
 * operation — production resets inline, so nothing here fails when the two
 * drift. The round-trip test does not catch it either: diffItem() short-circuits
 * on ABSENT keys, so a reset result missing an axis passes vacuously.
 *
 * @param {{ title: string, icon?: string, hiddenRoles: string[], childHiddenRoles?: string[], hiddenUsers?: object[], childHiddenUsers?: object[] }} item     Current item state.
 * @param {{ title: string, icon?: string }}                        pristine Pristine default.
 * @param {boolean}                                                 isSub    True for submenu items.
 * @return {{ title: string, hiddenRoles: string[], icon: string, childHiddenRoles: string[], hiddenUsers: object[], childHiddenUsers: object[] }}
 */
function resetItem( item, pristine, isSub ) {
	var result = {
		title:            pristine.title || '',
		hiddenRoles:      [],
		icon:             isSub ? '' : ( pristine.icon || '' ),
		childHiddenRoles: [],
		hiddenUsers:      [],
		childHiddenUsers: [],
		hiddenProfiles:      [],
		childHiddenProfiles: [],
	};
	return result;
}

/**
 * Pure localStorage gate: has the first-run cue already been seen?
 *
 * Accepts an injected storage stub (e.g. window.localStorage) so the
 * function remains pure and testable without a DOM. Returns true when
 * storage is unavailable (throws) so a blocked storage safely suppresses
 * the cue rather than re-showing it on every load.
 *
 * @param {{ getItem: function(string): string|null }} storage localStorage-like object.
 * @return {boolean} true if the cue has been seen or storage is blocked.
 */
function firstRunSeen( storage ) {
	try {
		return storage.getItem( 'maestroFirstRunDone' ) === '1';
	} catch ( e ) {
		return true;
	}
}

/**
 * Pure DERIVED-lock predicate for the "Hide its sub-items from:" (COMPAT-10)
 * role group in the visibility popover: a role is "locked" — rendered
 * checked+disabled, a display-only state, never a real persisted rule —
 * exactly when that SAME role is checked in "Hide this item from:" (the
 * item's own `hiddenRoles`). WordPress core already removes a hidden
 * parent's whole rendered subtree for that role, so "Hide its sub-items
 * from:"'s own entry for it would be redundant.
 *
 * PAYLOAD PURITY CONTRACT: this function only ever reads `hiddenRoles` — it
 * never reads or writes `childHiddenRoles`. The caller (maestro.js's
 * buildRoleGroup#refresh) uses this ONLY to decide the checkbox's rendered
 * checked/disabled attributes; it must never feed the result back into
 * `childHiddenRoles`/`setSet`. This is what guarantees the round-trip
 * property: hiding the parent from a role (which locks that role's
 * sub-items checkbox) can never itself add that role to the persisted
 * `child_hidden_roles`, so un-hiding the parent from that role always
 * restores the children to whatever `childHiddenRoles` genuinely held
 * before — see tests/js/child-role-lock.test.mjs's round-trip case.
 *
 * @param {string[]} hiddenRoles Parent's own hidden_roles (Group 1's current state).
 * @param {string} roleKey Role slug to test.
 * @return {boolean} true if roleKey is locked (already hidden via the parent's own hide).
 */
function isChildRoleLockedByParent( hiddenRoles, roleKey ) {
	return hiddenRoles.indexOf( roleKey ) !== -1;
}

/* ---------- ROLE-02 per-user target axes -------------------------------- */

/**
 * Is this user id already targeted on the given axis?
 *
 * The axis is a list of { id, name } pairs as the editor model emits them, so
 * membership is an id comparison — never an object identity one, which would
 * silently fail after any re-render replaced the objects.
 *
 * @param {Array<{id:number}>} targets Current axis list.
 * @param {number} userId User id to test.
 * @return {boolean} true if the user is already targeted.
 */
function isUserTargeted( targets, userId ) {
	var i;
	for ( i = 0; i < targets.length; i++ ) {
		if ( Number( targets[ i ].id ) === Number( userId ) ) {
			return true;
		}
	}
	return false;
}

/**
 * Add a user to an axis, returning a NEW list. Adding an already-targeted user
 * is a no-op rather than a duplicate — the server dedupes too, but a duplicate
 * chip in the popover would be visible long before the save round-trip.
 *
 * @param {Array<{id:number,name:string}>} targets Current axis list.
 * @param {{id:number,name:string}} user User to add.
 * @return {Array<{id:number,name:string}>} New axis list.
 */
function addUserTarget( targets, user ) {
	if ( isUserTargeted( targets, user.id ) ) {
		return targets.slice();
	}
	return targets.concat( [ { id: Number( user.id ), name: String( user.name ) } ] );
}

/**
 * Remove a user from an axis, returning a NEW list.
 *
 * Removing the last entry yields an empty array, which buildConfig() must then
 * omit from the payload entirely — the sparse contract (reset = absent key)
 * lives on both sides of the wire.
 *
 * @param {Array<{id:number}>} targets Current axis list.
 * @param {number} userId User id to remove.
 * @return {Array} New axis list.
 */
function removeUserTarget( targets, userId ) {
	var out = [];
	var i;
	for ( i = 0; i < targets.length; i++ ) {
		if ( Number( targets[ i ].id ) !== Number( userId ) ) {
			out.push( targets[ i ] );
		}
	}
	return out;
}

/**
 * Reduce an axis list to the bare id array the server stores.
 *
 * @param {Array<{id:number}>} targets Axis list.
 * @return {number[]} User ids.
 */
function userTargetIds( targets ) {
	var out = [];
	var i;
	for ( i = 0; i < targets.length; i++ ) {
		out.push( Number( targets[ i ].id ) );
	}
	return out;
}

/**
 * Does this row carry a hide rule of its own, on ANY of the three own-item
 * axes? This is what the `.maestro-has-hidden` marker means. Every seed and
 * toggle site calls this one predicate, because the inline copies drifted
 * twice (roles-only, then roles-and-users) as axes were added.
 *
 * @param {{ hiddenRoles?: string[], hiddenUsers?: object[], hiddenProfiles?: string[] }} m Model item.
 * @return {boolean}
 */
function hasOwnHide( m ) {
	return !! m && (
		( m.hiddenRoles || [] ).length > 0 ||
		( m.hiddenUsers || [] ).length > 0 ||
		( m.hiddenProfiles || [] ).length > 0
	);
}

/**
 * Is profile `id` on this axis list? Sparse-safe: an absent list is empty.
 *
 * @param {string[]|undefined} list Profile IDs.
 * @param {string} id Profile ID.
 * @return {boolean}
 */
function isProfileAssigned( list, id ) {
	return ( list || [] ).indexOf( String( id ) ) !== -1;
}

/**
 * Turn profile `id` on or off for an axis, returning a NEW list. Turning on
 * an assigned profile, or off an unassigned one, is a no-op.
 *
 * @param {string[]|undefined} list Profile IDs.
 * @param {string} id Profile ID.
 * @param {boolean} on Assign (true) or unassign (false).
 * @return {string[]}
 */
function toggleProfile( list, id, on ) {
	var cur = ( list || [] ).slice();
	id = String( id );
	if ( on ) {
		return cur.indexOf( id ) === -1 ? cur.concat( [ id ] ) : cur;
	}
	return cur.filter( function ( p ) { return p !== id; } );
}

/**
 * The next free stable profile ID, `p_<n>` with n one above the highest in use.
 * Never reuses a deleted profile's number within a session, so a stale
 * reference can never point at a different, newer profile.
 *
 * @param {Array<{id:string}>} profiles Current profiles.
 * @param {number} [floor] Highest number already handed out this session.
 * @return {string}
 */
function nextProfileId( profiles, floor ) {
	var max = Number( floor ) || 0;
	( profiles || [] ).forEach( function ( p ) {
		var m = /^p_([1-9][0-9]*)$/.exec( String( p.id ) );
		if ( m && Number( m[ 1 ] ) > max ) { max = Number( m[ 1 ] ); }
	} );
	return 'p_' + ( max + 1 );
}

/**
 * The highest p_<n> number among the profiles the editor loaded, as the
 * starting floor for nextProfileId(). Starting from 0 would let deleting a
 * loaded profile and creating another reuse its ID, and the new profile would
 * inherit whatever the old one still had pointing at it (a carried hide).
 *
 * @param {Array<{id:string}>} profiles Profiles loaded with the page.
 * @return {number}
 */
function profileIdFloor( profiles ) {
	return Number( nextProfileId( profiles ).slice( 2 ) ) - 1;
}

/**
 * The carry list without a deleted profile's entry, as a new map, so that
 * profile's unrendered hides are not written back on the next save.
 *
 * @param {Object<string, object>|undefined} carry Unrendered hides per profile.
 * @param {string} id Deleted profile ID.
 * @return {Object<string, object>}
 */
function dropProfileCarry( carry, id ) {
	var out = Object.create( null );
	Object.keys( carry || {} ).forEach( function ( key ) {
		if ( key !== String( id ) ) { out[ key ] = carry[ key ]; }
	} );
	return out;
}

/**
 * Why a profile name cannot be used, or '' when it can. Mirrors
 * Config::clean_profiles(): trimmed, non-empty, unique ignoring case.
 *
 * @param {string} name Proposed name.
 * @param {Array<{id:string,name:string}>} profiles Current profiles.
 * @param {string} [exceptId] The profile being renamed, which may keep its own name.
 * @return {''|'empty'|'taken'}
 */
function profileNameProblem( name, profiles, exceptId ) {
	var n = String( name || '' ).trim();
	if ( ! n ) { return 'empty'; }
	var fold = n.toLowerCase();
	var taken = ( profiles || [] ).some( function ( p ) {
		return String( p.id ) !== String( exceptId ) && String( p.name ).trim().toLowerCase() === fold;
	} );
	return taken ? 'taken' : '';
}

/**
 * How many items a profile hides, counted from the editor's assignments: an
 * item hidden through both its own and its sub-items axis counts once.
 *
 * @param {string} id Profile ID.
 * @param {Array<{key:string, own?:string[], child?:string[]}>} assignments Per-item profile axes.
 * @return {number}
 */
function profileItemCount( id, assignments ) {
	var n = 0;
	( assignments || [] ).forEach( function ( a ) {
		if ( isProfileAssigned( a.own, id ) || isProfileAssigned( a.child, id ) ) { n++; }
	} );
	return n;
}

/**
 * Build the `profiles` map the server stores, from the editor's profile list
 * and the per-item assignments in menu order.
 *
 * The item axes are the editor's source of truth for WHAT a profile hides,
 * exactly as hiddenRoles is: the hide-lists are rebuilt from them on every
 * save. Config::sanitize() then compiles the map back onto the items. Lists
 * are sparse (omitted when empty), and an empty profile list yields an empty
 * map, which is how the last profile is deleted (a missing key keeps the
 * stored map).
 *
 * @param {Array<{id:string, name:string, users?:Array<{id:number}>}>} profiles Editor profiles.
 * @param {Array<{key:string, own?:string[], child?:string[]}>} assignments Per-item profile axes.
 * @return {Object<string, {name:string, users?:number[], hides?:string[], child_hides?:string[]}>}
 */
function buildProfilesPayload( profiles, assignments ) {
	var out = Object.create( null );
	( profiles || [] ).forEach( function ( p ) {
		var entry = { name: String( p.name ) };
		var users = userTargetIds( p.users || [] );
		var hides = [];
		var childHides = [];
		( assignments || [] ).forEach( function ( a ) {
			if ( isProfileAssigned( a.own, p.id ) ) { hides.push( a.key ); }
			if ( isProfileAssigned( a.child, p.id ) ) { childHides.push( a.key ); }
		} );
		if ( users.length ) { entry.users = users; }
		if ( hides.length ) { entry.hides = hides; }
		if ( childHides.length ) { entry.child_hides = childHides; }
		out[ String( p.id ) ] = entry;
	} );
	return out;
}

/**
 * Add the stored hides of items the editor did not render, so a save keeps
 * them.
 *
 * buildConfig() gathers assignments from the menu on screen, and the save is a
 * full replace. A profile hiding a page whose plugin is switched off for now
 * would otherwise lose that hide on the next unrelated edit, and get it back
 * never. The server lists those hides (Assets::profile_carry(), which matches
 * by normalized key); this appends them. A key the assignments already hold
 * is skipped, since the model is current for it, the same way
 * carrySeparators() keeps only a stored separator core trimmed.
 *
 * @param {Array<{key:string, own?:string[], child?:string[]}>} assignments Assignments from the rendered menu.
 * @param {Object<string, {hides?:string[], child_hides?:string[]}>|undefined} stored Unrendered hides per profile.
 * @return {Array<{key:string, own:string[], child:string[]}>} A new list: the input, then the carried keys.
 */
function carryProfileHides( assignments, stored ) {
	var seen = Object.create( null );
	var out = ( assignments || [] ).map( function ( a ) {
		seen[ a.key ] = true;
		return { key: a.key, own: ( a.own || [] ).slice(), child: ( a.child || [] ).slice() };
	} );
	var extra = Object.create( null );
	var order = [];
	function slot( key ) {
		if ( ! extra[ key ] ) {
			extra[ key ] = { key: key, own: [], child: [] };
			order.push( key );
		}
		return extra[ key ];
	}
	Object.keys( stored || {} ).forEach( function ( id ) {
		var p = stored[ id ] || {};
		( p.hides || [] ).forEach( function ( key ) {
			if ( ! seen[ key ] ) { slot( key ).own.push( id ); }
		} );
		( p.child_hides || [] ).forEach( function ( key ) {
			if ( ! seen[ key ] ) { slot( key ).child.push( id ); }
		} );
	} );
	order.forEach( function ( key ) { out.push( extra[ key ] ); } );
	return out;
}

/**
 * Is this target the user currently doing the editing?
 *
 * Drives the inline self-target caution. Self-targeting is PERMITTED — a
 * legitimate self-declutter — so this only decides whether to warn, never
 * whether to allow. Kept here rather than inline in the popover so it is
 * unit-testable without a DOM.
 *
 * @param {number} userId Target user id.
 * @param {number} currentUserId The acting user's id.
 * @return {boolean} true when they are the same person.
 */
function isSelfTarget( userId, currentUserId ) {
	return Number( userId ) === Number( currentUserId );
}

/**
 * Merge the stored state of separators the editor did not render into a
 * freshly built config, so a full-replace save cannot silently erase them.
 *
 * A separator can be missing from the DOM without the user removing it: core
 * trims one that ends up next to another (say a role hide emptied the group
 * between them), and the editor leaves separators unmanaged when it cannot
 * pair them with the model. Each such separator keeps its stored id (if
 * Maestro added it) and goes back after its stored predecessor, or first.
 *
 * @param {Object}   o
 * @param {string[]} o.domOrder    Top-level slugs as rendered, in order.
 * @param {string[]} o.domAdded    Maestro-added separator ids rendered.
 * @param {string[]} o.storedOrder Stored top_order.
 * @param {string[]} o.storedAdded Stored separators (Maestro-added ids).
 * @param {string[]} o.known       Every separator slug the server built the menu with.
 * @param {string[]} o.removed     Separator slugs the user removed.
 * @param {string}   o.prefix      Id prefix of a Maestro-added separator.
 * @return {{ order: string[], added: string[] }} New arrays; inputs untouched.
 */
function carrySeparators( o ) {
	var order   = o.domOrder.slice();
	var added   = o.domAdded.slice();
	var inDom   = {};
	var removed = {};
	var known   = {};
	var i;

	o.domOrder.forEach( function ( s ) { inDom[ s ] = true; } );
	o.removed.forEach( function ( s ) { removed[ s ] = true; } );
	o.known.forEach( function ( s ) { known[ s ] = true; } );

	o.storedAdded.forEach( function ( id ) {
		if ( ! inDom[ id ] && ! removed[ id ] && added.indexOf( id ) === -1 ) {
			added.push( id );
		}
	} );

	function isCarried( s ) {
		if ( inDom[ s ] || removed[ s ] ) { return false; }
		if ( s.indexOf( o.prefix ) === 0 ) { return added.indexOf( s ) !== -1; }
		return !! known[ s ];
	}

	for ( i = 0; i < o.storedOrder.length; i++ ) {
		var slug = o.storedOrder[ i ];
		if ( ! isCarried( slug ) || order.indexOf( slug ) !== -1 ) { continue; }

		var at = 0;
		for ( var j = i - 1; j >= 0; j-- ) {
			var prev = order.indexOf( o.storedOrder[ j ] );
			if ( prev !== -1 ) {
				at = prev + 1;
				break;
			}
		}
		order.splice( at, 0, slug );
	}

	return { order: order, added: added };
}

/* ---------- admin menu width (Phase 28) -------------------------------- */

/**
 * Bound a requested menu width, mirroring PHP's Config::clean_menu_width().
 *
 * @param {*}      value  Raw value (a number, or a string of digits).
 * @param {Object} bounds { min, max, default } from Config's constants.
 * @return {number|null} Bounded integer, or null when invalid or the default
 *                       (the sparse contract never stores the default).
 */
function clampMenuWidth( value, bounds ) {
	var n;
	if ( typeof value === 'number' ) {
		if ( ! isFinite( value ) ) { return null; }
		n = Math.round( value );
	} else if ( typeof value === 'string' && /^[0-9]+$/.test( value ) ) {
		n = parseInt( value, 10 );
	} else {
		return null;
	}
	n = Math.max( bounds.min, Math.min( bounds.max, n ) );
	return n === bounds.default ? null : n;
}

/**
 * The CSS that applies a menu width. Must stay byte-identical to PHP's
 * Assets::menu_width_css(), so the live preview is what a reload will show;
 * the JS and PHP suites assert the same literal.
 *
 * @param {number} width Width in px.
 * @return {string}
 */
function menuWidthCss( width ) {
	// parseInt truncates like PHP's (int) cast, so the two builders agree.
	var n  = parseInt( width, 10 );
	var px = ( n || 0 ) + 'px';

	return '@media screen and (min-width: 961px){' +
		'body:not(.folded) #adminmenuback,body:not(.folded) #adminmenuwrap,body:not(.folded) #adminmenu,' +
		'body:not(.folded) #adminmenu .wp-has-current-submenu .wp-submenu{width:' + px + '}' +
		'body:not(.rtl):not(.folded) #wpcontent,body:not(.rtl):not(.folded) #wpfooter{margin-left:' + px + '}' +
		'body.rtl:not(.folded) #wpcontent,body.rtl:not(.folded) #wpfooter{margin-right:' + px + '}' +
		'body:not(.rtl):not(.folded) #adminmenu .wp-not-current-submenu .wp-submenu{left:' + px + '}' +
		'body.rtl:not(.folded) #adminmenu .wp-not-current-submenu .wp-submenu{right:' + px + '}' +
		'}';
}

/**
 * Turn a pointer position during the edge drag into a bounded width.
 *
 * @param {number}  clientX Pointer x.
 * @param {Object}  rect    The menu's { left, right } edges.
 * @param {boolean} rtl     Whether the admin is right-to-left.
 * @param {Object}  bounds  { min, max, default }.
 * @return {number|null} As clampMenuWidth().
 */
function menuWidthFromPointer( clientX, rect, rtl, bounds ) {
	return clampMenuWidth( rtl ? rect.right - clientX : clientX - rect.left, bounds );
}

/* ---------- dual-export guard ----------------------------------------- */

var api = {
	reorderMove:               reorderMove,
	diffItem:                  diffItem,
	resetItem:                 resetItem,
	modeStatusLabel:           modeStatusLabel,
	firstRunSeen:              firstRunSeen,
	isChildRoleLockedByParent: isChildRoleLockedByParent,
	isUserTargeted:            isUserTargeted,
	addUserTarget:             addUserTarget,
	removeUserTarget:          removeUserTarget,
	userTargetIds:             userTargetIds,
	isSelfTarget:              isSelfTarget,
	hasOwnHide:                hasOwnHide,
	isProfileAssigned:         isProfileAssigned,
	toggleProfile:             toggleProfile,
	nextProfileId:             nextProfileId,
	profileIdFloor:            profileIdFloor,
	dropProfileCarry:          dropProfileCarry,
	profileNameProblem:        profileNameProblem,
	profileItemCount:          profileItemCount,
	buildProfilesPayload:      buildProfilesPayload,
	carryProfileHides:         carryProfileHides,
	carrySeparators:           carrySeparators,
	clampMenuWidth:            clampMenuWidth,
	menuWidthCss:              menuWidthCss,
	menuWidthFromPointer:      menuWidthFromPointer,
};

if ( typeof module !== 'undefined' && module.exports ) {
	module.exports = api;
}

if ( typeof window !== 'undefined' ) {
	window.maestroLogic = api;
}
