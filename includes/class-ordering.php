<?php
/**
 * Pure ordering logic, deliberately free of WordPress calls so it can be unit
 * tested without bootstrapping WP. Replay delegates the array-shuffling here;
 * the WP-coupled mutation of the $menu/$submenu globals stays in Replay.
 *
 * Resilience contract (both methods):
 *   - Items named in the desired order that still exist are emitted first, in
 *     the desired order.
 *   - Items that exist but are NOT named (newcomers, e.g. a freshly activated
 *     plugin) are appended afterwards in their original relative order.
 *   - Desired names that no longer exist (orphans) are silently skipped.
 *   - A duplicated name in the desired order is honoured once.
 *
 * @package Maestro
 */

namespace Maestro;

defined( 'ABSPATH' ) || exit;

/**
 * Pure menu ordering utilities — no WordPress calls, purely array manipulation.
 *
 * @package Maestro
 */
class Ordering {

	/**
	 * Reorder a flat list of top-level slugs.
	 *
	 * A separator the desired order does not name (an order saved before
	 * separators were editable, or a newly activated plugin's own separator) is
	 * not treated as a newcomer. Sinking it to the end would put it where core's
	 * adjacent/trailing-separator trim deletes it, erasing the menu's grouping.
	 * Instead it closes the same group it closed naturally: it goes right after
	 * whichever item of that group now sits lowest.
	 *
	 * @param string[] $desired    Stored desired order (slugs).
	 * @param string[] $current    Live order (slugs) from the menu_order filter.
	 * @param string[] $separators Slugs in $current that are separator rows.
	 * @return string[]
	 */
	public static function top( array $desired, array $current, array $separators = array() ) {
		if ( empty( $desired ) ) {
			return $current;
		}

		$is_sep   = array_flip( $separators );
		$is_named = array_flip( $desired );
		$floating = function ( $slug ) use ( $is_sep, $is_named ) {
			return isset( $is_sep[ $slug ] ) && ! isset( $is_named[ $slug ] );
		};

		$ordered = array();
		$seen    = array();

		foreach ( $desired as $slug ) {
			if ( in_array( $slug, $current, true ) && empty( $seen[ $slug ] ) ) {
				$ordered[]     = $slug;
				$seen[ $slug ] = true;
			}
		}
		foreach ( $current as $slug ) {
			if ( empty( $seen[ $slug ] ) && ! $floating( $slug ) ) {
				$ordered[]     = $slug;
				$seen[ $slug ] = true;
			}
		}

		// Re-seat the unnamed separators, walking the natural order to learn
		// which items each one closed.
		$group    = array();
		$prev_sep = null;
		foreach ( $current as $slug ) {
			if ( ! $floating( $slug ) ) {
				if ( isset( $is_sep[ $slug ] ) ) {
					$group    = array();
					$prev_sep = $slug;
				} else {
					$group[] = $slug;
				}
				continue;
			}
			if ( ! empty( $seen[ $slug ] ) ) {
				continue;
			}

			$pos = -1;
			foreach ( $group as $member ) {
				$at = array_search( $member, $ordered, true );
				if ( false !== $at && $at > $pos ) {
					$pos = $at;
				}
			}
			if ( -1 === $pos && null !== $prev_sep ) {
				$at  = array_search( $prev_sep, $ordered, true );
				$pos = false === $at ? -1 : $at;
			}

			array_splice( $ordered, $pos + 1, 0, array( $slug ) );
			$seen[ $slug ] = true;
			$group         = array();
			$prev_sep      = $slug;
		}

		return $ordered;
	}

	/**
	 * Reorder a $submenu[$parent] array of rows by a list of desired slugs.
	 * Rows are WordPress submenu arrays where index 2 is the slug.
	 *
	 * @param array[]  $children Original child rows.
	 * @param string[] $desired Desired slug order.
	 * @return array[]
	 */
	public static function submenu( array $children, array $desired ) {
		if ( empty( $desired ) ) {
			return $children;
		}

		$by_slug = array();
		foreach ( $children as $row ) {
			if ( ! empty( $row[2] ) && ! isset( $by_slug[ $row[2] ] ) ) {
				$by_slug[ $row[2] ] = $row;
			}
		}

		$ordered = array();
		$seen    = array();

		foreach ( $desired as $slug ) {
			if ( isset( $by_slug[ $slug ] ) && empty( $seen[ $slug ] ) ) {
				$ordered[]     = $by_slug[ $slug ];
				$seen[ $slug ] = true;
			}
		}
		foreach ( $children as $row ) {
			$slug = isset( $row[2] ) ? $row[2] : '';
			if ( '' === $slug || empty( $seen[ $slug ] ) ) {
				$ordered[] = $row;
				if ( '' !== $slug ) {
					$seen[ $slug ] = true;
				}
			}
		}

		return $ordered;
	}
}
