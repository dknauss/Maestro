<?php
/**
 * Pure child-hidden-roles union computation (COMPAT-10), deliberately free of
 * WordPress calls so it is unit-testable without bootstrapping WP.
 *
 * A child's effective hidden-roles set is the union of its OWN stored
 * `hidden_roles` and its parent's `child_hidden_roles` — two independent role
 * sets that both cosmetically hide the CHILD, regardless of whether the
 * parent itself is hidden. This is PURE VISIBILITY: it only unions role-slug
 * lists and never touches a capability. The WP-coupled seam that consumes
 * this (matching the union against the current user's own roles) lives in
 * Replay::is_hidden_for_current_user(); this class never calls
 * current_user_can() or any capability API.
 *
 * @package Maestro
 */

namespace Maestro;

defined( 'ABSPATH' ) || exit;

/**
 * Pure child-hidden-roles union computation — no WordPress calls, no capability checks.
 *
 * @package Maestro
 */
class Cascade {

	/**
	 * Compute the effective hidden-roles list for a child menu item, given its
	 * own stored hidden_roles and its parent's stored child_hidden_roles.
	 *
	 * REVISED (2026-08-01, see 20-CONTEXT.md): the two role sets are fully
	 * independent — child_hidden_roles hides the parent's children WITH THE
	 * PARENT LEFT VISIBLE, unrelated to whether the parent's own hidden_roles
	 * currently hides the parent. A child is hidden for role `r` iff
	 * `r` is in its own hidden_roles OR `r` is in the parent's
	 * child_hidden_roles — a plain, unconditional union.
	 *
	 * PURE VISIBILITY ONLY: this never calls current_user_can() or any
	 * capability API — it only merges two role-slug lists. The per-request
	 * decision of whether the CURRENT user falls in the returned list stays
	 * in Replay::is_hidden_for_current_user(), unchanged.
	 *
	 * @param array $child_hidden_roles       The child's own stored hidden_roles (may be empty).
	 * @param array $parent_child_hidden_roles The parent's stored child_hidden_roles (may be empty).
	 * @return array Effective hidden-roles list for the child (deduplicated, reindexed).
	 */
	public static function effective_hidden_roles( array $child_hidden_roles, array $parent_child_hidden_roles ) {
		return array_values( array_unique( array_merge( $child_hidden_roles, $parent_child_hidden_roles ) ) );
	}
}
