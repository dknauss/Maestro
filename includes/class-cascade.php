<?php
/**
 * Pure cascade-hide role-list computation (COMPAT-10), deliberately free of
 * WordPress calls so it is unit-testable without bootstrapping WP.
 *
 * Cascade is a PURE VISIBILITY computation layered on the existing
 * `hidden_roles` semantics — it only unions role-slug lists and never touches
 * a capability. The WP-coupled seam that consumes this (matching the union
 * against the current user's own roles) lives in
 * Replay::is_hidden_for_current_user(); this class never calls
 * current_user_can() or any capability API.
 *
 * @package Maestro
 */

namespace Maestro;

defined( 'ABSPATH' ) || exit;

/**
 * Pure cascade-hide role-list computation — no WordPress calls, no capability checks.
 *
 * @package Maestro
 */
class Cascade {

	/**
	 * Compute the effective hidden-roles list for a child menu item, given its
	 * own stored hidden_roles, the parent's cascade_hide flag, and the
	 * parent's own stored hidden_roles.
	 *
	 * Rules (COMPAT-10, locked in 20-CONTEXT.md):
	 *   - flag OFF -> effective = the child's own hidden_roles only. The parent
	 *                 contributes nothing — today's zero-cascade behavior,
	 *                 zero regression.
	 *   - flag ON  -> effective = union(child's own, parent's hidden_roles).
	 *                 A plain union alone implements BOTH locked sub-rules:
	 *                   * "rides the parent hide" — a role absent from the
	 *                     parent's hidden_roles contributes nothing to the
	 *                     union, so turning the flag on with the parent
	 *                     hidden from nobody does nothing.
	 *                   * "role-mirrored" — only the roles the parent is
	 *                     ACTUALLY hidden from are added to the child's set;
	 *                     no other role is ever added.
	 *
	 * PURE VISIBILITY ONLY: this never calls current_user_can() or any
	 * capability API — it only merges two role-slug lists. The per-request
	 * decision of whether the CURRENT user falls in the returned list stays
	 * in Replay::is_hidden_for_current_user(), unchanged.
	 *
	 * @param array $child_hidden_roles  The child's own stored hidden_roles (may be empty).
	 * @param bool  $cascade_hide        The parent's cascade_hide flag.
	 * @param array $parent_hidden_roles The parent's own stored hidden_roles (may be empty).
	 * @return array Effective hidden-roles list for the child (deduplicated, reindexed).
	 */
	public static function effective_hidden_roles( array $child_hidden_roles, $cascade_hide, array $parent_hidden_roles ) {
		if ( ! $cascade_hide ) {
			return array_values( $child_hidden_roles );
		}
		return array_values( array_unique( array_merge( $child_hidden_roles, $parent_hidden_roles ) ) );
	}
}
