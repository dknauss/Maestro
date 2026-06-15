<?php
/**
 * Bootstrap for the INTEGRATION suite. Boots the WordPress PHPUnit test library
 * and loads this plugin as a mu-plugin so its hooks are live.
 *
 * Expects the WP test suite to be available. With wp-env this is automatic via
 * `wp-scripts test-unit-php`. Standalone, set WP_TESTS_DIR (and optionally
 * WP_TESTS_PHPUNIT_POLYFILLS_PATH) and run with the WP test DB configured.
 *
 * @package Maestro
 */

$_tests_dir = getenv( 'WP_TESTS_DIR' );
if ( ! $_tests_dir ) {
	$_tests_dir = rtrim( sys_get_temp_dir(), '/\\' ) . '/wordpress-tests-lib';
}

$_polyfills = getenv( 'WP_TESTS_PHPUNIT_POLYFILLS_PATH' );
if ( $_polyfills ) {
	define( 'WP_TESTS_PHPUNIT_POLYFILLS_PATH', $_polyfills );
}

if ( ! file_exists( "{$_tests_dir}/includes/functions.php" ) ) {
	fwrite( STDERR, "WordPress test suite not found at {$_tests_dir}. See TESTING.md.\n" );
	exit( 1 );
}

require_once "{$_tests_dir}/includes/functions.php";

/**
 * Load the plugin before WP finishes booting so its hooks register.
 */
tests_add_filter(
	'muplugins_loaded',
	static function () {
		require dirname( __DIR__ ) . '/maestro-menu-editor.php';
	}
);

require "{$_tests_dir}/includes/bootstrap.php";
