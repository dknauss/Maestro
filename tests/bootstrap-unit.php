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

if ( ! defined( 'MAESTRO_OPTION' ) ) {
	define( 'MAESTRO_OPTION', 'maestro_config' );
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

if ( ! function_exists( 'get_users' ) ) {
	/**
	 * Stub: the site has 60 users (IDs 1 … 60) — enough for MAX_HIDDEN_USERS cap
	 * tests, mirroring the 60-role wp_roles() stub above.
	 *
	 * Honours `include` (which Config::valid_user_ids() uses to bound the query)
	 * by intersecting against that population, and `fields => ID`. Any other
	 * query arg is ignored deliberately, so a future caller needing richer
	 * behaviour has to extend this consciously rather than silently receive a
	 * wrong answer.
	 *
	 * @param array $args Query args ('include' and 'fields' => 'ID' honoured).
	 * @return int[]
	 */
	function get_users( $args = array() ) {
		$population = range( 1, 60 );
		if ( ! empty( $args['include'] ) ) {
			return array_values( array_intersect( $population, array_map( 'intval', (array) $args['include'] ) ) );
		}
		return $population;
	}
}

if ( ! function_exists( 'current_user_can' ) ) {
	/**
	 * Stub: capability answers for the pure unit suite.
	 *
	 * Defaults to TRUE so the existing sanitize() tests keep exercising the
	 * normal authoring path. Set $GLOBALS['maestro_unit_caps'] to a
	 * capability => bool map to model a user who lacks one — ConfigSanitizeTest
	 * uses that to cover the `list_users` gate on the per-user axes.
	 *
	 * @param string $cap Capability being checked.
	 * @return bool
	 */
	function current_user_can( $cap ) {
		if ( isset( $GLOBALS['maestro_unit_caps'][ $cap ] ) ) {
			return (bool) $GLOBALS['maestro_unit_caps'][ $cap ];
		}
		return true;
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

/**
 * In-memory option store so Config::save()/get() are callable without a WP DB.
 * Lets the pure unit suite exercise the MAX_CONFIG_BYTES aggregate-ceiling guard
 * in save() (which uses only serialize() + these two functions).
 */
$GLOBALS['maestro_unit_options'] = array();

if ( ! function_exists( 'get_option' ) ) {
	/**
	 * Stub: read from the in-memory option store.
	 *
	 * @param string $name    Option name.
	 * @param mixed  $default Default when unset.
	 * @return mixed
	 */
	function get_option( $name, $default = false ) {
		return array_key_exists( $name, $GLOBALS['maestro_unit_options'] )
			? $GLOBALS['maestro_unit_options'][ $name ]
			: $default;
	}
}

if ( ! function_exists( 'update_option' ) ) {
	/**
	 * Stub: write to the in-memory option store.
	 *
	 * @param string $name     Option name.
	 * @param mixed  $value    Option value.
	 * @param bool   $autoload Ignored in unit context.
	 * @return bool
	 */
	function update_option( $name, $value, $autoload = null ) {
		$GLOBALS['maestro_unit_options'][ $name ] = $value;
		return true;
	}
}

/* -------------------------------------------------------------------------- */

$amm_inc = dirname( __DIR__ ) . '/includes/';
require_once $amm_inc . 'class-ordering.php';
require_once $amm_inc . 'class-slug.php';
require_once $amm_inc . 'class-config.php';
require_once $amm_inc . 'class-title.php';
require_once $amm_inc . 'class-cascade.php';
