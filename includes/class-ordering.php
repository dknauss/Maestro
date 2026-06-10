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
 * @package AdminMenuMaestro
 */

namespace AdminMenuMaestro;

defined( 'ABSPATH' ) || exit;

class Ordering {

	/**
	 * Reorder a flat list of top-level slugs.
	 *
	 * @param string[] $desired Stored desired order (slugs).
	 * @param string[] $current Live order (slugs) from the menu_order filter.
	 * @return string[]
	 */
	public static function top( array $desired, array $current ) {
		if ( empty( $desired ) ) {
			return $current;
		}

		$ordered = array();
		$seen    = array();

		foreach ( $desired as $slug ) {
			if ( in_array( $slug, $current, true ) && empty( $seen[ $slug ] ) ) {
				$ordered[]     = $slug;
				$seen[ $slug ] = true;
			}
		}
		foreach ( $current as $slug ) {
			if ( empty( $seen[ $slug ] ) ) {
				$ordered[]     = $slug;
				$seen[ $slug ] = true;
			}
		}

		return $ordered;
	}

	/**
	 * Reorder a $submenu[$parent] array of rows by a list of desired slugs.
	 * Rows are WordPress submenu arrays where index 2 is the slug.
	 *
	 * @param array[] $children Original child rows.
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
