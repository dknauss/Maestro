<?php
/**
 * Bootstrap for the PURE unit suite. No WordPress, no database.
 *
 * We define ABSPATH so the guarded class files load, then require only the
 * classes whose tested methods are pure (Ordering, Config::is_valid_icon).
 * Those methods never call WordPress functions, so no stubbing is needed.
 *
 * @package Maestro
 */

require_once dirname( __DIR__ ) . '/vendor/autoload.php';

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', rtrim( sys_get_temp_dir(), '/\\' ) . '/' );
}

$amm_inc = dirname( __DIR__ ) . '/includes/';
require_once $amm_inc . 'class-ordering.php';
require_once $amm_inc . 'class-config.php';
