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
 *
 * None of the four visibility axes has a WP-native pristine state — reset
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
};

if ( typeof module !== 'undefined' && module.exports ) {
	module.exports = api;
}

if ( typeof window !== 'undefined' ) {
	window.maestroLogic = api;
}
