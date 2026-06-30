<?php
/**
 * Bootstrap for the PURE unit suite. No WordPress, no database.
 *
 * We define ABSPATH so the guarded class files load, then require only the
 * classes whose tested methods are pure (Ordering, Config::is_valid_icon,
 * Config::sanitize() collection/title caps).
 *
 * WordPress function stubs are provided here so Config::sanitize() is callable
 * without a full WP stack (needed for HARD-02 payload-cap unit tests).
 *
 * @package Maestro
 */

require_once dirname( __DIR__ ) . '/vendor/autoload.php';

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', rtrim( sys_get_temp_dir(), '/\\' ) . '/' );
}

/* ---- Minimal WordPress function stubs ------------------------------------ */

if ( ! function_exists( 'wp_roles' ) ) {
	/**
	 * Stub: returns an object whose get_names() yields 60 keyed roles
	 * (role-1 … role-60) — enough for MAX_HIDDEN_ROLES cap tests.
	 *
	 * @return object
	 */
	function wp_roles() {
		return new class() {
			public function get_names() {
				$names = array();
				for ( $i = 1; $i <= 60; $i++ ) {
					$names[ "role-$i" ] = "Role $i";
				}
				return $names;
			}
		};
	}
}

if ( ! function_exists( 'sanitize_text_field' ) ) {
	/**
	 * Stub: returns trimmed string (unit-safe approximation).
	 *
	 * @param string $str Input string.
	 * @return string
	 */
	function sanitize_text_field( $str ) {
		return trim( (string) $str );
	}
}

if ( ! function_exists( 'sanitize_key' ) ) {
	/**
	 * Stub: lowercase alphanumeric-hyphen-underscore.
	 *
	 * @param string $key Input key.
	 * @return string
	 */
	function sanitize_key( $key ) {
		return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $key ) );
	}
}

if ( ! function_exists( 'wp_strip_all_tags' ) ) {
	/**
	 * Stub: strip HTML tags.
	 *
	 * @param string $string Input string.
	 * @return string
	 */
	function wp_strip_all_tags( $string ) {
		return strip_tags( (string) $string );
	}
}

if ( ! function_exists( 'sanitize_html_class' ) ) {
	/**
	 * Stub: lowercase alphanumeric-hyphen-underscore CSS class.
	 *
	 * @param string $class Input CSS class.
	 * @return string
	 */
	function sanitize_html_class( $class ) {
		return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $class ) );
	}
}

if ( ! function_exists( 'esc_url_raw' ) ) {
	/**
	 * Stub: returns URL if http(s), else ''.
	 *
	 * @param string   $url       Input URL.
	 * @param string[] $protocols Allowed protocols.
	 * @return string
	 */
	function esc_url_raw( $url, $protocols = array() ) {
		if ( preg_match( '#^https?://#', (string) $url ) ) {
			return (string) $url;
		}
		return '';
	}
}

if ( ! function_exists( 'wp_parse_url' ) ) {
	/**
	 * Stub: thin wrapper around parse_url() for WP-free unit context.
	 *
	 * @param string   $url       URL to parse.
	 * @param int      $component PHP_URL_* constant or -1 for all components.
	 * @return mixed Parsed URL array, specific component, null, or false.
	 */
	function wp_parse_url( $url, $component = -1 ) {
		return parse_url( (string) $url, $component );
	}
}

/* -------------------------------------------------------------------------- */

$amm_inc = dirname( __DIR__ ) . '/includes/';
require_once $amm_inc . 'class-ordering.php';
require_once $amm_inc . 'class-slug.php';
require_once $amm_inc . 'class-config.php';
