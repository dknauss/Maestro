<?php
/**
 * Pure slug normalization, deliberately free of WordPress calls so it can be
 * unit tested without bootstrapping WP. Replay delegates resolve-time key
 * computation here; the WP-coupled slug lookup stays in Replay.
 *
 * Normalization contract (pipeline order — every step is sequentially composed):
 *   1. html_entity_decode (ENT_QUOTES|ENT_HTML5) over the full input, single pass.
 *      Non-string or empty → return '' immediately (totality guarantee).
 *   2. Split fragment on the FIRST '#' only; preserve remainder verbatim.
 *   3. Strip scheme+host:
 *      - If the path contains '/wp-admin/', reduce to the admin-relative tail
 *        (everything after the final '/wp-admin/') — survives a host move.
 *      - For a genuine external URL (no '/wp-admin/'), keep 'host/path' with
 *        the host lowercased.
 *      - Plain non-URL slugs pass through untouched.
 *   4. Parse query string; drop params whose NAME (case-insensitive) is 'ver'
 *      or starts with 'utm_'; keep all others including duplicates and
 *      empty-value params; sort surviving params alphabetically by raw
 *      'name=value' token; recompose path?sorted_query, omitting '?' when no
 *      params survive, then re-append '#fragment' if present.
 *
 * Idempotency: re-running on already-normalized output is a no-op.
 * Totality:    never throws; every input maps to a string.
 *
 * @package Maestro
 */

namespace Maestro;

defined( 'ABSPATH' ) || exit;

/**
 * Pure slug normalization utilities — no WordPress calls.
 *
 * @package Maestro
 */
class Slug {

	/**
	 * Normalize a menu slug for resolve-time matching. Pure, WP-free, total.
	 *
	 * @param mixed  $slug       Rendered slug or stored override key (may be an absolute URL).
	 * @param string $admin_base Admin base URL (e.g. admin_url('')) — passed in to keep this WP-free.
	 *                           When '' the host-strip step uses the '/wp-admin/' boundary only.
	 * @return string Normalized key. Never throws; every input maps to a string.
	 */
	public static function normalize( $slug, $admin_base = '' ) {
		// Step 1: type guard + html_entity_decode.
		if ( ! is_string( $slug ) || '' === $slug ) {
			return '';
		}

		// Single full pass; decode &amp; → & before any & is read as a separator.
		$slug = html_entity_decode( $slug, ENT_QUOTES | ENT_HTML5, 'UTF-8' );

		if ( '' === $slug ) {
			return '';
		}

		// Step 2: split fragment on the FIRST '#' only.
		$fragment = '';
		$hash_pos = strpos( $slug, '#' );
		if ( false !== $hash_pos ) {
			$fragment = substr( $slug, $hash_pos + 1 );
			$slug     = substr( $slug, 0, $hash_pos );
		}

		// Step 3: strip scheme+host.
		// Detect URL-like input (has '://' or starts with '//').
		$is_url = ( false !== strpos( $slug, '://' ) );
		if ( $is_url ) {
			$slug = self::strip_host( $slug, $admin_base );
		}

		// Step 4: filter and sort query params.
		$slug = self::normalize_query( $slug );

		// Re-append fragment.
		if ( '' !== $fragment ) {
			$slug = $slug . '#' . $fragment;
		}

		return $slug;
	}

	/**
	 * Strip the scheme and host from a URL slug.
	 *
	 * Internal wp-admin URLs (any host) reduce to their admin-relative path.
	 * External URLs keep lowercased-host/path with no scheme.
	 *
	 * @param string $slug       URL slug (already fragment-stripped, decoded).
	 * @param string $admin_base Admin base URL from the caller.
	 * @return string
	 */
	private static function strip_host( $slug, $admin_base ) {
		// If admin_base is known and the slug starts with it exactly, strip it.
		if ( '' !== $admin_base && 0 === strpos( $slug, $admin_base ) ) {
			return substr( $slug, strlen( $admin_base ) );
		}

		// Any URL whose PATH contains '/wp-admin/' → strip everything up to and
		// including the last path occurrence so a host move still normalizes.
		// Search the PATH only: a nested admin URL inside a query value (e.g.
		// ?redirect=https://other/wp-admin/profile.php) must not hijack the strip
		// and collapse the key down to the nested page.
		$wp_admin_marker = '/wp-admin/';
		$query_pos       = strpos( $slug, '?' );
		$path_part       = false !== $query_pos ? substr( $slug, 0, $query_pos ) : $slug;
		$query_part      = false !== $query_pos ? substr( $slug, $query_pos ) : '';
		$marker_pos      = strrpos( $path_part, $wp_admin_marker );
		if ( false !== $marker_pos ) {
			return substr( $path_part, $marker_pos + strlen( $wp_admin_marker ) ) . $query_part;
		}

		// External URL: keep host + path (no scheme), lowercase the host.
		$parsed = wp_parse_url( $slug );
		if ( false === $parsed ) {
			return $slug;
		}

		$host = isset( $parsed['host'] ) ? strtolower( $parsed['host'] ) : '';
		$path = isset( $parsed['path'] ) ? $parsed['path'] : '';

		// Rebuild query onto the path — step 4 will re-parse and filter it.
		$query_part = isset( $parsed['query'] ) ? '?' . $parsed['query'] : '';

		return $host . $path . $query_part;
	}

	/**
	 * Drop volatile params (ver, utm_*) from the query string, sort survivors,
	 * and return the path?query string (without fragment).
	 *
	 * Rules:
	 *   - Strip params whose name (case-insensitive) is 'ver' or starts with 'utm_'.
	 *   - Keep ALL others including duplicates and empty-value params.
	 *   - Sort surviving raw 'name=value' tokens alphabetically.
	 *   - Recompose with '?' only when params survive; no trailing '?' otherwise.
	 *
	 * @param string $slug Path+query string (no fragment).
	 * @return string
	 */
	private static function normalize_query( $slug ) {
		$query_start = strpos( $slug, '?' );
		if ( false === $query_start ) {
			return $slug;
		}

		$path      = substr( $slug, 0, $query_start );
		$query_raw = substr( $slug, $query_start + 1 );

		if ( '' === $query_raw ) {
			return $path;
		}

		// Split on '&'; PHP's parse_str loses duplicates so we tokenize manually.
		$tokens   = explode( '&', $query_raw );
		$filtered = array();
		foreach ( $tokens as $token ) {
			if ( '' === $token ) {
				continue;
			}
			// Extract the param name (the part before '=' or the full token).
			$eq_pos = strpos( $token, '=' );
			$name   = false !== $eq_pos ? substr( $token, 0, $eq_pos ) : $token;

			$name_lower = strtolower( $name );
			if ( 'ver' === $name_lower || 0 === strpos( $name_lower, 'utm_' ) ) {
				continue; // Drop volatile param.
			}

			$filtered[] = $token;
		}

		if ( empty( $filtered ) ) {
			return $path;
		}

		// Sort surviving tokens alphabetically by raw token string.
		sort( $filtered, SORT_STRING );

		return $path . '?' . implode( '&', $filtered );
	}
}
